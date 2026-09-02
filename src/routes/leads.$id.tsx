import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { priorityClass, statusClass, STATUSES, BOQ_STATUSES } from "@/lib/constants";
import { Phone, MessageCircle, MapPin, ExternalLink, Pencil, CalendarPlus, StickyNote, Camera, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditHistoryList } from "@/components/leads/EditHistoryList";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-utils";

export const Route = createFileRoute("/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — Cunstruct CRM" }] }),
  component: () => <AppShell title="Lead Detail"><Detail /></AppShell>,
});

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [copied, setCopied] = useState(false);

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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lead", id] });
    qc.invalidateQueries({ queryKey: ["edit-history", id] });
    qc.invalidateQueries({ queryKey: ["leads-full"] });
  };

  if (!data?.lead) return <p className="text-muted-foreground">Loading…</p>;
  const l = data.lead;
  const phone = l.contact_phone?.replace(/\D/g, "");
  const mapsUrl = l.latitude && l.longitude ? `https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}` : null;

  const buildWhatsAppMsg = () => {
    const products = data.products.map((p) => `• ${p.product}`).join("\n");
    const greeting = l.contact_name ? `Hi ${l.contact_name},` : "Hi,";
    const lines = [
      greeting,
      "",
      `I visited your site *${l.site_name}*${l.site_address ? ` at ${l.site_address}` : ""} recently.`,
      "",
      "As discussed, I can prepare a *FREE Bill of Quantities (BOQ)* for your project — no cost, no commitment.",
      "",
      "We supply quality construction materials *Pan India* with competitive pricing and timely delivery.",
      ...(products ? ["\n*Materials you're interested in:*", products] : []),
      ...(l.exact_requirement ? [`\n*Your requirement:*\n${l.exact_requirement}`] : []),
      "",
      "Shall I proceed with the BOQ? Please let me know a convenient time to connect.",
      "",
      "— Rutvij",
    ];
    return lines.join("\n");
  };

  const sendWhatsApp = () => {
    const msg = buildWhatsAppMsg();
    const wa = phone ? `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}?text=${encodeURIComponent(msg)}` : null;
    if (wa) { window.open(wa, "_blank"); return; }
    navigator.clipboard.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Message copied — paste into WhatsApp"); });
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(buildWhatsAppMsg()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Copied to clipboard"); });
  };

  return (
    <div className="space-y-4">
      <Card className="border-2">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="display text-2xl">{l.site_name}</h1>
            <div className="flex flex-col gap-1 items-end">
              <Badge className={priorityClass(l.priority)}>{l.priority}</Badge>
              {(l as any).lead_type && <Badge variant="outline">{(l as any).lead_type}</Badge>}
              {(l as any).boq_status && (l as any).boq_status !== "Not Offered" && (
                <Badge variant={(l as any).boq_status === "Accepted" ? "default" : "secondary"}>BOQ: {(l as any).boq_status}</Badge>
              )}
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

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={sendWhatsApp} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="h-4 w-4 mr-1" />Send BOQ Template
            </Button>
            <Button onClick={copyTemplate} variant="outline">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy Template"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button asChild variant="default">
              <Link to="/leads/$id/edit" params={{ id }}><Pencil className="h-4 w-4 mr-1" />Edit Lead</Link>
            </Button>
            <QuickActions leadId={id} userId={user?.id} onChange={refresh} />
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs uppercase font-bold text-muted-foreground mb-1">Status</div>
              <Select value={l.status} onValueChange={(v) => updateStatus.mutate(v)}>
                <SelectTrigger className={statusClass(l.status)}><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-muted-foreground mb-1">BOQ Status</div>
              <Select value={(l as any).boq_status ?? "Not Offered"} onValueChange={async (v) => {
                await supabase.from("leads").update({ boq_status: v } as any).eq("id", id);
                qc.invalidateQueries({ queryKey: ["lead", id] });
                toast.success("BOQ status updated");
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BOQ_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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

      {l.exact_requirement && (
        <section>
          <h2 className="display text-sm mb-2">Exact Material Requirement</h2>
          <Card className="border-2 border-primary">
            <CardContent className="p-4 text-base whitespace-pre-wrap font-medium leading-relaxed">
              {l.exact_requirement}
            </CardContent>
          </Card>
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

      <section>
        <h2 className="display text-sm mb-2">Edit History</h2>
        <EditHistoryList leadId={id} />
      </section>

      <Link to="/leads" className="block text-center text-sm text-muted-foreground">← Back to leads</Link>
    </div>
  );
}

function QuickActions({ leadId, userId, onChange }: { leadId: string; userId?: string; onChange: () => void }) {
  const [open, setOpen] = useState<null | "followup" | "note" | "photo">(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reminder, setReminder] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const close = () => { setOpen(null); setDate(""); setTime(""); setReminder(""); setNote(""); setFiles([]); };

  const submitFollowup = async () => {
    if (!userId || !date) return;
    setBusy(true);
    const { error } = await supabase.from("followups").insert({
      lead_id: leadId, user_id: userId, due_date: date, due_time: time || null, reminder_notes: reminder || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Follow-up scheduled"); onChange(); close();
  };
  const submitNote = async () => {
    if (!userId || !note.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("activities").insert({
      lead_id: leadId, user_id: userId, activity_type: "Visit note", notes: note,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Note added"); onChange(); close();
  };
  const submitPhotos = async () => {
    if (!userId || files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      const compressed = await compressImage(file).catch(() => file);
      const ext = compressed.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${leadId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("lead-photos").upload(path, compressed, { contentType: compressed.type });
      if (upErr) { toast.error(upErr.message); continue; }
      const { data: pub } = supabase.storage.from("lead-photos").getPublicUrl(path);
      await supabase.from("photos").insert({ lead_id: leadId, user_id: userId, image_url: pub.publicUrl, image_type: "site" });
    }
    setBusy(false);
    toast.success("Photos uploaded"); onChange(); close();
  };

  return (
    <Dialog open={!!open} onOpenChange={(o) => !o && close()}>
      <div className="grid grid-cols-3 gap-1">
        <DialogTrigger asChild><Button size="sm" variant="secondary" onClick={() => setOpen("followup")}><CalendarPlus className="h-3.5 w-3.5" /></Button></DialogTrigger>
        <DialogTrigger asChild><Button size="sm" variant="secondary" onClick={() => setOpen("note")}><StickyNote className="h-3.5 w-3.5" /></Button></DialogTrigger>
        <DialogTrigger asChild><Button size="sm" variant="secondary" onClick={() => setOpen("photo")}><Camera className="h-3.5 w-3.5" /></Button></DialogTrigger>
      </div>
      <DialogContent>
        {open === "followup" && (
          <>
            <DialogHeader><DialogTitle>Schedule follow-up</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <Textarea placeholder="Reminder notes" value={reminder} onChange={(e) => setReminder(e.target.value)} />
            </div>
            <DialogFooter><Button onClick={submitFollowup} disabled={busy || !date}>Save</Button></DialogFooter>
          </>
        )}
        {open === "note" && (
          <>
            <DialogHeader><DialogTitle>Add visit note</DialogTitle></DialogHeader>
            <Textarea placeholder="What happened on this visit?" rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
            <DialogFooter><Button onClick={submitNote} disabled={busy || !note.trim()}>Save</Button></DialogFooter>
          </>
        )}
        {open === "photo" && (
          <>
            <DialogHeader><DialogTitle>Upload photos</DialogTitle></DialogHeader>
            <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && <p className="text-sm text-muted-foreground">{files.length} file(s) selected</p>}
            <DialogFooter><Button onClick={submitPhotos} disabled={busy || files.length === 0}>Upload</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}