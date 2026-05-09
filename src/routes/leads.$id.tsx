import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { priorityClass, statusClass, STATUSES } from "@/lib/constants";
import { Phone, MessageCircle, MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — Cunstruct CRM" }] }),
  component: () => <AppShell title="Lead Detail"><Detail /></AppShell>,
});

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const [{ data: lead }, { data: products }, { data: photos }, { data: activities }, { data: followups }] = await Promise.all([
        supabase.from("leads").select("*").eq("id", id).single(),
        supabase.from("lead_products").select("*").eq("lead_id", id),
        supabase.from("photos").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
        supabase.from("followups").select("*").eq("lead_id", id).order("due_date"),
      ]);
      return { lead, products: products ?? [], photos: photos ?? [], activities: activities ?? [], followups: followups ?? [] };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("leads").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("activities").insert({ lead_id: id, user_id: u.user?.id, activity_type: "Status change", notes: `Status set to ${status}` });
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data?.lead) return <p className="text-muted-foreground">Loading…</p>;
  const l = data.lead;
  const phone = l.contact_phone?.replace(/\D/g, "");
  const mapsUrl = l.latitude && l.longitude ? `https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}` : null;

  return (
    <div className="space-y-4">
      <Card className="border-2">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="display text-2xl">{l.site_name}</h1>
            <div className="flex flex-col gap-1">
              <Badge className={priorityClass(l.priority)}>{l.priority}</Badge>
            </div>
          </div>
          {l.stage && <div className="text-xs uppercase tracking-widest font-bold text-primary">{l.stage}</div>}
          <div className="text-sm space-y-1">
            {l.contact_name && <div><span className="text-muted-foreground">Contact:</span> <strong>{l.contact_name}</strong></div>}
            {l.company_name && <div><span className="text-muted-foreground">Company:</span> {l.company_name}</div>}
            {l.architect_name && <div><span className="text-muted-foreground">Architect:</span> {l.architect_name}</div>}
            {l.contractor_name && <div><span className="text-muted-foreground">Contractor:</span> {l.contractor_name}</div>}
            {l.site_address && <div className="flex gap-1"><MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />{l.site_address}{l.landmark ? ` · ${l.landmark}` : ""}</div>}
            {l.project_type && <div><span className="text-muted-foreground">Project:</span> {l.project_type}{l.project_size_sqft ? ` · ${l.project_size_sqft} sqft` : ""}{l.num_floors ? ` · ${l.num_floors} floors` : ""}</div>}
            {l.estimated_budget && <div><span className="text-muted-foreground">Budget:</span> ₹{Number(l.estimated_budget).toLocaleString("en-IN")}</div>}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button asChild variant="default" disabled={!phone}><a href={phone ? `tel:${phone}` : "#"}><Phone className="h-4 w-4 mr-1" />Call</a></Button>
            <Button asChild variant="secondary" disabled={!phone}><a href={phone ? `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}` : "#"} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</a></Button>
            <Button asChild variant="outline" disabled={!mapsUrl}><a href={mapsUrl ?? "#"} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Maps</a></Button>
          </div>

          <div className="pt-2">
            <div className="text-xs uppercase font-bold text-muted-foreground mb-1">Status</div>
            <Select value={l.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className={statusClass(l.status)}><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {data.products.length > 0 && (
        <section>
          <h2 className="display text-sm mb-2">Product Interests</h2>
          <div className="flex flex-wrap gap-1.5">{data.products.map((p) => <Badge key={p.id} variant="secondary">{p.product}</Badge>)}</div>
        </section>
      )}

      {l.notes && (
        <section>
          <h2 className="display text-sm mb-2">Notes</h2>
          <Card><CardContent className="p-3 text-sm whitespace-pre-wrap">{l.notes}</CardContent></Card>
        </section>
      )}

      {data.photos.length > 0 && (
        <section>
          <h2 className="display text-sm mb-2">Photos ({data.photos.length})</h2>
          <div className="grid grid-cols-3 gap-2">
            {data.photos.map((p) => (
              <a key={p.id} href={p.image_url} target="_blank" rel="noreferrer" className="aspect-square rounded overflow-hidden border-2 border-border">
                <img src={p.image_url} alt={p.image_type} className="w-full h-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}

      {data.followups.length > 0 && (
        <section>
          <h2 className="display text-sm mb-2">Follow-Ups</h2>
          <Card><CardContent className="p-3 space-y-2">
            {data.followups.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm border-l-4 border-primary pl-3">
                <div>
                  <div className="font-bold">{format(new Date(f.due_date), "EEE, MMM d")}{f.due_time ? ` · ${f.due_time}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{f.reminder_notes ?? "—"}</div>
                </div>
                <Badge variant={f.status === "Completed" ? "secondary" : "default"}>{f.status}</Badge>
              </div>
            ))}
          </CardContent></Card>
        </section>
      )}

      <section>
        <h2 className="display text-sm mb-2">Activity Timeline</h2>
        <Card><CardContent className="p-3 space-y-3">
          {data.activities.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {data.activities.map((a) => (
            <div key={a.id} className="text-sm border-l-4 border-secondary pl-3">
              <div className="font-bold">{a.activity_type}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, h:mm a")}</div>
              {a.notes && <div className="mt-1">{a.notes}</div>}
              {a.transcript && <div className="mt-1 italic text-muted-foreground">"{a.transcript}"</div>}
            </div>
          ))}
        </CardContent></Card>
      </section>

      <Link to="/leads" className="block text-center text-sm text-muted-foreground">← Back to leads</Link>
    </div>
  );
}