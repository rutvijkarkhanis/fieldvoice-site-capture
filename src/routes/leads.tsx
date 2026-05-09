import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { priorityClass, statusClass, STATUSES } from "@/lib/constants";
import { Search, Phone, MapPin, Trash2, Download, RefreshCw, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { useIsAdmin } from "@/lib/use-role";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadFilters, emptyFilters, type LeadFilterState, type SortKey } from "@/components/leads/LeadFilters";
import { exportLeadsCSV, leadScore } from "@/lib/lead-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useDebounced } from "@/lib/use-debounced";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Cunstruct CRM" }] }),
  component: () => <AppShell title="All Leads" wide><LeadsList /></AppShell>,
});

const PAGE_SIZE = 30;
const PRIORITY_RANK: Record<string, number> = { Hot: 0, Warm: 1, Cold: 2 };

// Slim column list — never SELECT *
const LIST_COLS =
  "id,site_name,contact_name,contact_phone,site_address,stage,status,priority,latitude,longitude,assigned_to,owner_id,estimated_budget,exact_requirement,created_at,updated_at";

function LeadsList() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [qRaw, setQRaw] = useState("");
  const q = useDebounced(qRaw, 300);
  const [filters, setFilters] = useState<LeadFilterState>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reps + product list (cached)
  const { data: meta } = useQuery({
    queryKey: ["leads-meta"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: profiles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
      ]);
      return { profiles: profiles ?? [] };
    },
  });

  const serverSort = sort === "score" || sort === "followup" ? "updated" : sort;

  const queryKey = ["leads-paged", { q, filters, sort: serverSort }];
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase.from("leads").select(LIST_COLS, { count: "exact" });

      // Search
      const s = q.trim();
      if (s) {
        const safe = s.replace(/[,()]/g, " ").trim();
        if (safe) {
          query = query.or(
            `site_name.ilike.%${safe}%,contact_name.ilike.%${safe}%,contact_phone.ilike.%${safe}%,site_address.ilike.%${safe}%,architect_name.ilike.%${safe}%,contractor_name.ilike.%${safe}%,exact_requirement.ilike.%${safe}%`
          );
        }
      }
      if (filters.stage) query = query.eq("stage", filters.stage as any);
      if (filters.status) query = query.eq("status", filters.status as any);
      if (filters.priority) query = query.eq("priority", filters.priority as any);
      if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
      if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
      if (filters.createdTo) query = query.lte("created_at", filters.createdTo + "T23:59:59");

      // Server sort
      if (serverSort === "created") query = query.order("created_at", { ascending: false });
      else if (serverSort === "priority") query = query.order("priority", { ascending: true });
      else query = query.order("updated_at", { ascending: false });

      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      // Product filter — apply client-side on returned page
      let rows = data ?? [];
      if (filters.product) {
        const ids = rows.map((r: any) => r.id);
        if (ids.length) {
          const { data: lps } = await supabase
            .from("lead_products")
            .select("lead_id")
            .in("lead_id", ids)
            .eq("product", filters.product);
          const allowed = new Set((lps ?? []).map((p: any) => p.lead_id));
          rows = rows.filter((r: any) => allowed.has(r.id));
        }
      }

      return { rows, count: count ?? 0, page: pageParam as number };
    },
    getNextPageParam: (last) => {
      const loaded = (last.page + 1) * PAGE_SIZE;
      return loaded < last.count ? last.page + 1 : undefined;
    },
    staleTime: 30_000,
  });

  const leads = useMemo(() => (data?.pages ?? []).flatMap((p) => p.rows), [data]);
  const total = data?.pages[0]?.count ?? 0;

  // Followups for visible leads
  const visibleIds = leads.map((l: any) => l.id);
  const { data: nextFu = {} } = useQuery({
    queryKey: ["next-followups", visibleIds],
    enabled: visibleIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("followups")
        .select("lead_id, due_date, status")
        .in("lead_id", visibleIds)
        .eq("status", "Pending")
        .order("due_date");
      const map: Record<string, { due_date: string }> = {};
      (data ?? []).forEach((f: any) => { if (!map[f.lead_id]) map[f.lead_id] = { due_date: f.due_date }; });
      return map;
    },
  });

  // Client-side resort for "score" / "followup"
  const sorted = useMemo(() => {
    if (sort === "score") return [...leads].sort((a, b) => leadScore(b) - leadScore(a));
    if (sort === "followup") return [...leads].sort((a: any, b: any) => {
      const ad = nextFu[a.id]?.due_date; const bd = nextFu[b.id]?.due_date;
      if (!ad && !bd) return 0; if (!ad) return 1; if (!bd) return -1;
      return +new Date(ad) - +new Date(bd);
    });
    if (sort === "priority") return [...leads].sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
    return leads;
  }, [leads, sort, nextFu]);

  const toggle = (id: string) => setSelected((cur) => {
    const n = new Set(cur);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected((cur) => cur.size === sorted.length ? new Set() : new Set(sorted.map((l: any) => l.id)));

  const reps = (meta?.profiles ?? []) as { id: string; full_name: string | null }[];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["leads-paged"] });
    setSelected(new Set());
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").update({ status: status as any }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Updated ${ids.length} lead(s)`); refresh();
  };
  const bulkReassign = async (userId: string) => {
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").update({ assigned_to: userId }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Reassigned ${ids.length} lead(s)`); refresh();
  };
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${ids.length} lead(s)`); refresh();
  };
  const bulkExport = () => {
    const ids = new Set(selected);
    const rows = sorted.filter((l: any) => ids.has(l.id));
    if (rows.length === 0) return toast.error("Select leads first");
    exportLeadsCSV(rows);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search site, contact, phone, architect…" value={qRaw} onChange={(e) => setQRaw(e.target.value)} className="pl-9 h-10" />
        </div>
        <LeadFilters filters={filters} onFiltersChange={setFilters} sort={sort} onSortChange={setSort} isAdmin={isAdmin} reps={reps} />
      </div>

      {!isLoading && (
        <p className="text-xs text-muted-foreground">Showing {sorted.length} of {total}</p>
      )}

      {isAdmin && selected.size > 0 && (
        <div className="sticky top-[60px] z-20 flex flex-wrap items-center gap-2 rounded-md border-2 border-primary bg-card p-2">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <Select onValueChange={bulkUpdateStatus}>
            <SelectTrigger className="h-8 w-[150px]"><SelectValue placeholder="Update status" /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={bulkReassign}>
            <SelectTrigger className="h-8 w-[150px]"><RefreshCw className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Reassign" /></SelectTrigger>
            <SelectContent>{reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name || r.id.slice(0, 8)}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={bulkExport}><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selected.size} lead(s)?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}
      {!isLoading && sorted.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">No leads match.</p>
      )}

      {/* Mobile cards */}
      <ul className="md:hidden space-y-2">
        {sorted.map((l: any) => (
          <li key={l.id}>
            <LeadCard
              lead={l}
              nextFollowup={nextFu[l.id] ?? null}
              selectable={isAdmin}
              selected={selected.has(l.id)}
              onToggle={() => toggle(l.id)}
            />
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      {sorted.length > 0 && (
        <div className="hidden md:block rounded-md border-2 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground text-xs uppercase tracking-wider">
              <tr>
                {isAdmin && (
                  <th className="p-2 w-8">
                    <Checkbox checked={selected.size > 0 && selected.size === sorted.length} onCheckedChange={toggleAll} />
                  </th>
                )}
                <Th label="Site" sortKey="updated" current={sort} onClick={setSort} />
                <th className="p-2 text-left">Contact</th>
                <th className="p-2 text-left">Area</th>
                <th className="p-2 text-left">Stage</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Priority</th>
                <Th label="Follow-up" sortKey="followup" current={sort} onClick={setSort} />
                <Th label="Updated" sortKey="updated" current={sort} onClick={setSort} />
                <Th label="Score" sortKey="score" current={sort} onClick={setSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((l: any) => (
                <tr key={l.id} className="border-t hover:bg-muted/50">
                  {isAdmin && (
                    <td className="p-2">
                      <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
                    </td>
                  )}
                  <td className="p-2">
                    <Link to="/leads/$id" params={{ id: l.id }} className="font-bold hover:text-primary">
                      {l.site_name}
                    </Link>
                  </td>
                  <td className="p-2">
                    <div>{l.contact_name || "—"}</div>
                    {l.contact_phone && (
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />{l.contact_phone}
                      </div>
                    )}
                  </td>
                  <td className="p-2 max-w-[200px]">
                    {l.site_address && (
                      <div className="text-xs text-muted-foreground truncate inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />{l.site_address}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-xs uppercase font-bold text-primary">{l.stage || "—"}</td>
                  <td className="p-2"><Badge variant="outline" className={statusClass(l.status)}>{l.status}</Badge></td>
                  <td className="p-2"><Badge className={priorityClass(l.priority)}>{l.priority}</Badge></td>
                  <td className="p-2 text-xs">
                    {nextFu[l.id] ? format(new Date(nextFu[l.id].due_date), "MMM d") : "—"}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.updated_at ?? l.created_at), { addSuffix: true })}
                  </td>
                  <td className="p-2 text-xs font-bold">{leadScore(l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function Th({ label, sortKey, current, onClick }: { label: string; sortKey: SortKey; current: SortKey; onClick: (s: SortKey) => void }) {
  const active = current === sortKey;
  return (
    <th className="p-2 text-left">
      <button onClick={() => onClick(sortKey)} className="inline-flex items-center gap-1 hover:text-primary">
        {label}
        {active && <ChevronDown className="h-3 w-3" />}
        {!active && <ChevronUp className="h-3 w-3 opacity-30" />}
      </button>
    </th>
  );
}