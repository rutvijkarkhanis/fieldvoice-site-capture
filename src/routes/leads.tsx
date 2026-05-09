import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { priorityClass, statusClass } from "@/lib/constants";
import { MapPin, Phone, Search } from "lucide-react";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Cunstruct CRM" }] }),
  component: () => <AppShell title="All Leads"><LeadsList /></AppShell>,
});

function LeadsList() {
  const [q, setQ] = useState("");
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return leads;
    return leads.filter((l: any) =>
      [l.site_name, l.contact_name, l.contact_phone, l.site_address, l.architect_name, l.contractor_name]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(s)));
  }, [leads, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search site, contact, phone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11" />
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No leads yet.</p>}
      <ul className="space-y-2">
        {filtered.map((l: any) => (
          <li key={l.id}>
            <Link to="/leads/$id" params={{ id: l.id }}>
              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{l.site_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.contact_name} {l.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{l.contact_phone}</span>}</div>
                      {l.site_address && <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{l.site_address}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={priorityClass(l.priority)}>{l.priority}</Badge>
                      <Badge variant="outline" className={statusClass(l.status)}>{l.status}</Badge>
                    </div>
                  </div>
                  {l.stage && <div className="mt-2 text-[10px] uppercase tracking-widest font-bold text-primary">{l.stage}</div>}
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}