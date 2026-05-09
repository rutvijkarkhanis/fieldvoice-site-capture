import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { priorityClass, statusClass, STATUSES } from "@/lib/constants";
import { Search, Phone, MapPin, Trash2, Download, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { useIsAdmin } from "@/lib/use-role";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadFilters, emptyFilters, type LeadFilterState, type SortKey } from "@/components/leads/LeadFilters";
import { exportLeadsCSV, leadScore } from "@/lib/lead-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Cunstruct CRM" }] }),
  component: () => <AppShell title="All Leads" wide><LeadsList /></AppShell>,
});

const PRIORITY_RANK: Record<string, number> = { Hot: 0, Warm: 1, Cold: 2 };

function LeadsList() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<LeadFilterState>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["leads-full"],
    queryFn: async () => {
      const [{ data: leads }, { data: lps }, { data: fus }, { data: profiles }] = await Promise.all([
        supabase.from("leads").select("*").order("updated_at", { ascending: false }),
        supabase.from("lead_products").select("lead_id, product"),
        supabase.from("followups").select("lead_id, due_date, status").eq("status", "Pending").order("due_date"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      const productsByLead: Record<string, string[]> = {};
      (lps ?? []).forEach((p: any) => {
        (productsByLead[p.lead_id] ||= []).push(p.product);
      });
      const nextFu: Record<string, { due_date: string }> = {};
      (fus ?? []).forEach((f: any) => { if (!nextFu[f.lead_id]) nextFu[f.lead_id] = { due_date: f.due_date }; });
      const profileMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name || p.id.slice(0, 8); });
      return { leads: leads ?? [], productsByLead, nextFu, profiles: profiles ?? [], profileMap };
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.toLowerCase().trim();
    return data.leads.filter((l: any) => {
      if (s) {
        const hay = [l.site_name, l.contact_name, l.contact_phone, l.site_address, l.architect_name, l.contractor_name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (filters.stage && l.stage !== filters.stage) return false;
      if (filters.status && l.status !== filters.status) return false;
      if (filters.priority && l.priority !== filters.priority) return false;
      if (filters.assignedTo && l.assigned_to !== filters.assignedTo) return false;
      if (filters.product && !(data.productsByLead[l.id] ?? []).includes(filters.product)) return false;
      if (filters.createdFrom && new Date(l.created_at) < new Date(filters.createdFrom)) return false;
      if (filters.createdTo && new Date(l.created_at) > new Date(filters.createdTo + "T23:59:59")) return false;
      return true;
    });
  }, [data, q, filters]);

  const sorted = useMemo(() => {
    if (!data) return [];
    const arr = [...filtered];
    arr.sort((a: any, b: any) => {
      switch (sort) {
        case "created": return +new Date(b.created_at) - +new Date(a.created_at);
        case "followup": {
          const ad = data.nextFu[a.id]?.due_date; const bd = data.nextFu[b.id]?.due_date;
          if (!ad && !bd) return 0; if (!ad) return 1; if (!bd) return -1;
          return +new Date(ad) - +new Date(bd);
        }
        case "priority": return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
        case "score": return leadScore(b) - leadScore(a);
        case "updated":
        default: return +new Date(b.updated_at ?? b.created_at) - +new Date(a.updated_at ?? a.created_at);
      }
    });
    return arr;
  }, [filtered, sort, data]);

  const toggle = (id: string) => {
    setSelected((cur) => {
      const n = new Set(cur);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((cur) => cur.size === sorted.length ? new Set() : new Set(sorted.map((l: any) => l.id)));
  };

  const reps = (data?.profiles ?? []) as { id: string; full_name: string | null }[];

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").update({ status: status as any }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Updated ${ids.length} lead(s)`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["leads-full"] });
  };
  const bulkReassign = async (userId: string) => {
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").update({ assigned_to: userId }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Reassigned ${ids.length} lead(s)`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["leads-full"] });
  };
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${ids.length} lead(s)`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["leads-full"] });
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
          <Input placeholder="Search site, contact, phone, architect…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-10" />
        </div>
        <LeadFilters filters={filters} onFiltersChange={setFilters} sort={sort} onSortChange={setSort} isAdmin={isAdmin} reps={reps} />
      </div>

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
                <AlertDialogDescription>This cannot be undone. Photos and follow-ups will remain orphaned.</AlertDialogDescription>
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

      {isLoading && <p className="text-center text-muted-foreground py-10 text-sm">Loading…</p>}
      {!isLoading && sorted.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No leads match.</p>}

      {/* Mobile cards */}
      <ul className="md:hidden space-y-2">
        {sorted.map((l: any) => (
          <li key={l.id}>
            <LeadCard
              lead={l}
              nextFollowup={data?.nextFu[l.id] ?? null}
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
                    {data?.nextFu[l.id] ? format(new Date(data.nextFu[l.id].due_date), "MMM d") : "—"}
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