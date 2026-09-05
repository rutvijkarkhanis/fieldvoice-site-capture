import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, MicOff, MapPin, Camera, Loader2, Save, Hammer, HardHat, Megaphone, ArrowLeft } from "lucide-react";
import { STAGES, STATUSES, PRIORITIES, PROJECT_TYPES, PRODUCTS, BOQ_STATUSES } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image-utils";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "Add Lead — Cunstruct CRM" }] }),
  component: () => <AppShell title="Add Lead"><AddLead /></AppShell>,
});

type Source = "Field Visit" | "Architect Visit" | "Meta Ads";

type Form = {
  site_name: string; contact_name: string; contact_phone: string; alternate_phone: string;
  company_name: string; architect_name: string; contractor_name: string;
  boq_status: string;
  site_address: string; landmark: string;
  latitude: string; longitude: string;
  project_type: string; project_size_sqft: string; num_floors: string; estimated_budget: string; expected_completion: string;
  stage: string; status: string; priority: string;
  notes: string; exact_requirement: string; followup_date: string;
  city: string; projects_handled: string;
};

const empty: Form = {
  site_name: "", contact_name: "", contact_phone: "", alternate_phone: "",
  company_name: "", architect_name: "", contractor_name: "",
  boq_status: "Not Offered",
  site_address: "", landmark: "", latitude: "", longitude: "",
  project_type: "", project_size_sqft: "", num_floors: "", estimated_budget: "", expected_completion: "",
  stage: "", status: "New", priority: "Warm", notes: "", exact_requirement: "", followup_date: "",
  city: "", projects_handled: "",
};

function AddLead() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [source, setSource] = useState<Source | null>(null);
  const [f, setF] = useState<Form>(empty);
  const [products, setProducts] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const recRef = useRef<any>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  const startRec = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser"); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-IN";
    let final = "";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " "; else interim += t;
      }
      setTranscript((final + interim).trim());
    };
    r.onerror = (e: any) => { toast.error(`Voice: ${e.error}`); setRecording(false); };
    r.onend = () => setRecording(false);
    r.start(); recRef.current = r; setRecording(true);
  };
  const stopRec = () => { try { recRef.current?.stop(); } catch {} setRecording(false); };

  const extract = async () => {
    if (!transcript.trim()) { toast.error("Speak something first"); return; }
    setExtracting(true);
    const { data, error } = await supabase.functions.invoke("extract-lead", { body: { transcript } });
    setExtracting(false);
    if (error || data?.error) { toast.error(data?.error ?? error?.message ?? "Extract failed"); return; }
    const x = data.extracted ?? {};
    setF((p) => ({
      ...p,
      site_name: x.site_name ?? p.site_name,
      contact_name: x.contact_name ?? p.contact_name,
      contact_phone: x.contact_phone ?? p.contact_phone,
      company_name: x.company_name ?? p.company_name,
      architect_name: x.architect_name ?? p.architect_name,
      site_address: x.site_address ?? p.site_address,
      city: x.city ?? p.city,
      stage: x.stage ?? p.stage,
      priority: x.priority ?? p.priority,
      followup_date: x.followup_date ?? p.followup_date,
      exact_requirement: x.exact_requirement ?? p.exact_requirement,
      notes: [p.notes, x.notes].filter(Boolean).join("\n"),
    }));
    if (Array.isArray(x.products)) setProducts((p) => Array.from(new Set([...p, ...x.products])));
    toast.success("Form auto-filled");
  };

  const captureGPS = () => {
    if (!navigator.geolocation) { toast.error("Geolocation unavailable"); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      set("latitude", String(pos.coords.latitude));
      set("longitude", String(pos.coords.longitude));
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const j = await r.json();
        if (j.display_name && !f.site_address) set("site_address", j.display_name);
      } catch {}
      setGpsBusy(false);
      toast.success("Location captured");
    }, (e) => { setGpsBusy(false); toast.error(e.message); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const toggleProduct = (p: string) => setProducts((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => setPhotos((p) => [...p, ...Array.from(e.target.files ?? [])]);

  const save = async () => {
    if (!f.contact_name.trim() && !f.site_name.trim()) { toast.error("Name or site name required"); return; }
    if (!user) return;
    setSaving(true);
    try {
      if (f.contact_phone) {
        const { data: dup } = await supabase.from("leads").select("id,site_name").eq("contact_phone", f.contact_phone).limit(1);
        if (dup && dup.length) {
          if (!confirm(`A lead with this phone already exists (${dup[0].site_name}). Save anyway?`)) { setSaving(false); return; }
        }
      }

      const siteName = f.site_name.trim() || f.contact_name.trim() || f.architect_name.trim() || "Untitled";

      const payload: any = {
        owner_id: user.id,
        site_name: siteName,
        contact_name: f.contact_name || null,
        contact_phone: f.contact_phone || null,
        alternate_phone: f.alternate_phone || null,
        company_name: f.company_name || null,
        architect_name: f.architect_name || null,
        contractor_name: f.contractor_name || null,
        lead_type: source as any,
        boq_status: (f.boq_status || null) as any,
        site_address: f.site_address || f.city || null,
        landmark: f.landmark || null,
        latitude: f.latitude ? Number(f.latitude) : null,
        longitude: f.longitude ? Number(f.longitude) : null,
        project_type: f.project_type || null,
        project_size_sqft: f.project_size_sqft ? Number(f.project_size_sqft) : null,
        num_floors: f.num_floors ? Number(f.num_floors) : null,
        estimated_budget: f.estimated_budget ? Number(f.estimated_budget) : null,
        expected_completion: f.expected_completion || null,
        stage: f.stage || null,
        status: f.status,
        priority: f.priority,
        notes: [f.notes, f.projects_handled ? `Projects handled: ${f.projects_handled}` : ""].filter(Boolean).join("\n") || null,
        exact_requirement: f.exact_requirement || null,
      };

      const { data: lead, error } = await supabase.from("leads").insert(payload).select().single();
      if (error) throw error;

      if (products.length) {
        await supabase.from("lead_products").insert(products.map((product) => ({ lead_id: lead.id, product })));
      }

      for (const file of photos) {
        const compressed = await compressImage(file).catch(() => file);
        const ext = compressed.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${lead.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("lead-photos").upload(path, compressed, { contentType: compressed.type });
        if (upErr) { console.error(upErr); continue; }
        const { data: pub } = supabase.storage.from("lead-photos").getPublicUrl(path);
        await supabase.from("photos").insert({ lead_id: lead.id, user_id: user.id, image_url: pub.publicUrl, image_type: "site" });
      }

      await supabase.from("activities").insert({
        lead_id: lead.id, user_id: user.id, activity_type: source ?? "Lead",
        notes: f.notes || null, transcript: transcript || null,
      });

      if (f.followup_date) {
        await supabase.from("followups").insert({
          lead_id: lead.id, user_id: user.id, due_date: f.followup_date, reminder_notes: "Follow-up scheduled",
        });
      }

      toast.success("Lead saved");
      nav({ to: "/leads/$id", params: { id: lead.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!source) return <SourcePicker onPick={setSource} />;

  return (
    <div className="space-y-4 pb-20">
      <button onClick={() => setSource(null)} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Change source
      </button>

      <div className="flex items-center gap-2 px-1">
        <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Source:</span>
        <span className="text-xs font-bold text-primary">{source}</span>
      </div>

      {/* Voice — Field Visit & Architect Visit */}
      {source !== "Meta Ads" && (
        <Card className="border-2 border-primary">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="display text-base">Voice Capture</h2>
              <Button onClick={recording ? stopRec : startRec} size="lg" variant={recording ? "destructive" : "default"} className="rounded-full h-14 w-14 p-0">
                {recording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            </div>
            <Textarea placeholder="Speak or type details…" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} />
            <Button onClick={extract} disabled={extracting || !transcript.trim()} variant="secondary" className="w-full">
              {extracting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Extracting…</> : "Auto-fill from voice"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FIELD VISIT FORM */}
      {source === "Field Visit" && (
        <>
          <Section title="Site Info">
            <Field label="Site name *"><Input value={f.site_name} onChange={(e) => set("site_name", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Contact"><Input value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
              <Field label="Phone"><Input type="tel" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Architect"><Input value={f.architect_name} onChange={(e) => set("architect_name", e.target.value)} /></Field>
              <Field label="Contractor"><Input value={f.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Location">
            <Button onClick={captureGPS} disabled={gpsBusy} variant="secondary" className="w-full">
              {gpsBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
              Capture Current Location
            </Button>
            <Field label="Address"><Textarea value={f.site_address} onChange={(e) => set("site_address", e.target.value)} rows={2} /></Field>
            <Field label="Landmark"><Input value={f.landmark} onChange={(e) => set("landmark", e.target.value)} /></Field>
            {f.latitude && f.longitude && <p className="text-xs text-muted-foreground">📍 {Number(f.latitude).toFixed(5)}, {Number(f.longitude).toFixed(5)}</p>}
          </Section>

          <Section title="Project">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Type">
                <Select value={f.project_type} onValueChange={(v) => set("project_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PROJECT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Stage">
                <Select value={f.stage} onValueChange={(v) => set("stage", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Size (sqft)"><Input type="number" value={f.project_size_sqft} onChange={(e) => set("project_size_sqft", e.target.value)} /></Field>
              <Field label="Floors"><Input type="number" value={f.num_floors} onChange={(e) => set("num_floors", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Pipeline">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Priority">
                <Select value={f.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Follow-up date"><Input type="date" value={f.followup_date} onChange={(e) => set("followup_date", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Product Interests">
            <div className="flex flex-wrap gap-1.5">
              {PRODUCTS.map((p) => (
                <button type="button" key={p} onClick={() => toggleProduct(p)} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-colors", products.includes(p) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card")}>
                  {p}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Exact Requirement">
            <Textarea value={f.exact_requirement} onChange={(e) => set("exact_requirement", e.target.value)} rows={4} placeholder="e.g. 500 kg Birla White wall putty, 20 bags JK White Cement…" />
          </Section>

          <Section title="Photos">
            <label className="block">
              <input type="file" accept="image/*" capture="environment" multiple onChange={onPhoto} className="hidden" id="photo-input" />
              <Button asChild variant="secondary" className="w-full">
                <label htmlFor="photo-input"><Camera className="h-4 w-4 mr-2" />Add photos ({photos.length})</label>
              </Button>
            </label>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {photos.map((p, i) => <div key={i} className="aspect-square rounded overflow-hidden border-2"><img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" /></div>)}
              </div>
            )}
          </Section>

          <Section title="Notes">
            <Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Anything else worth remembering…" />
          </Section>
        </>
      )}

      {/* ARCHITECT VISIT FORM */}
      {source === "Architect Visit" && (
        <>
          <Section title="Architect Details">
            <Field label="Architect name *"><Input value={f.architect_name} onChange={(e) => set("architect_name", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Firm / Company"><Input value={f.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
              <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Phone"><Input type="tel" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
              <Field label="Alt phone"><Input type="tel" value={f.alternate_phone} onChange={(e) => set("alternate_phone", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Their Projects">
            <Field label="Types of projects they handle">
              <Textarea value={f.projects_handled} onChange={(e) => set("projects_handled", e.target.value)} rows={2} placeholder="e.g. Residential villas, commercial complexes, hotels…" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Typical budget (₹)"><Input type="number" value={f.estimated_budget} onChange={(e) => set("estimated_budget", e.target.value)} /></Field>
              <Field label="Active projects now"><Input type="number" value={f.num_floors} onChange={(e) => set("num_floors", e.target.value)} placeholder="Count" /></Field>
            </div>
          </Section>

          <Section title="BOQ & Products">
            <Field label="BOQ Status">
              <Select value={f.boq_status} onValueChange={(v) => set("boq_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BOQ_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Products discussed">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PRODUCTS.map((p) => (
                  <button type="button" key={p} onClick={() => toggleProduct(p)} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-colors", products.includes(p) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card")}>
                    {p}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Exact requirement / quantities">
              <Textarea value={f.exact_requirement} onChange={(e) => set("exact_requirement", e.target.value)} rows={3} placeholder="Brands, specs, quantities they need…" />
            </Field>
          </Section>

          <Section title="Follow-up">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Priority">
                <Select value={f.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Follow-up date"><Input type="date" value={f.followup_date} onChange={(e) => set("followup_date", e.target.value)} /></Field>
            </div>
            <Field label="Notes">
              <Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="What was discussed, next steps…" />
            </Field>
          </Section>
        </>
      )}

      {/* META ADS FORM */}
      {source === "Meta Ads" && (
        <>
          <Section title="Lead Details">
            <Field label="Name *"><Input value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Phone *"><Input type="tel" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
              <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Project">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Project type">
                <Select value={f.project_type} onValueChange={(v) => set("project_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PROJECT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Budget (₹)"><Input type="number" value={f.estimated_budget} onChange={(e) => set("estimated_budget", e.target.value)} /></Field>
            </div>
            <Field label="What are they looking for?">
              <Textarea value={f.exact_requirement} onChange={(e) => set("exact_requirement", e.target.value)} rows={3} placeholder="What did they fill in the ad form / what do they need?" />
            </Field>
          </Section>

          <Section title="Products Interested In">
            <div className="flex flex-wrap gap-1.5">
              {PRODUCTS.map((p) => (
                <button type="button" key={p} onClick={() => toggleProduct(p)} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-colors", products.includes(p) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card")}>
                  {p}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Pipeline">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Priority">
                <Select value={f.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Follow-up date"><Input type="date" value={f.followup_date} onChange={(e) => set("followup_date", e.target.value)} /></Field>
            </div>
            <Field label="Notes">
              <Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Any additional context…" />
            </Field>
          </Section>
        </>
      )}

      <div className="fixed bottom-20 inset-x-0 z-30 px-4">
        <div className="max-w-xl mx-auto">
          <Button onClick={save} disabled={saving} size="lg" className="w-full h-14 text-base font-bold uppercase tracking-wider shadow-lg">
            {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
            Save Lead
          </Button>
        </div>
      </div>
    </div>
  );
}

function SourcePicker({ onPick }: { onPick: (s: Source) => void }) {
  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground text-center">How did you meet this lead?</p>
      <div className="space-y-3">
        <button onClick={() => onPick("Field Visit")} className="w-full text-left">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <HardHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-bold text-base">Field Visit</div>
                <div className="text-sm text-muted-foreground">You visited a construction site in person</div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onPick("Architect Visit")} className="w-full text-left">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Hammer className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-bold text-base">Architect Visit</div>
                <div className="text-sm text-muted-foreground">You met an architect or contractor at their office</div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onPick("Meta Ads")} className="w-full text-left">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-bold text-base">Meta Ads Lead</div>
                <div className="text-sm text-muted-foreground">Inbound lead from Facebook / Instagram ad</div>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card><CardContent className="p-4 space-y-3">
      <h2 className="display text-base">{title}</h2>
      {children}
    </CardContent></Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{label}</Label>{children}</div>;
}
