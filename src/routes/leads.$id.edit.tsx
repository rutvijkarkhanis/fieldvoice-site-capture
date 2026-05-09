import { createFileRoute, useNavigate, useBlocker, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { STAGES, STATUSES, PRIORITIES, PROJECT_TYPES, PRODUCTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { DuplicateWarning } from "@/components/leads/DuplicateWarning";
import { Save, Loader2, Trash2, Camera } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image-utils";

export const Route = createFileRoute("/leads/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Lead — Cunstruct CRM" }] }),
  component: () => <AppShell title="Edit Lead"><EditLead /></AppShell>,
});

type Form = {
  site_name: string; contact_name: string; contact_phone: string; alternate_phone: string;
  company_name: string; architect_name: string; contractor_name: string;
  site_address: string; landmark: string;
  project_type: string; project_size_sqft: string; num_floors: string; estimated_budget: string; expected_completion: string;
  stage: string; status: string; priority: string;
  notes: string;
  followup_date: string;
};

const empty: Form = {
  site_name: "", contact_name: "", contact_phone: "", alternate_phone: "",
  company_name: "", architect_name: "", contractor_name: "",
  site_address: "", landmark: "",
  project_type: "", project_size_sqft: "", num_floors: "", estimated_budget: "", expected_completion: "",
  stage: "", status: "New", priority: "Warm", notes: "", followup_date: "",
};

function fromLead(l: any): Form {
  return {
    site_name: l.site_name ?? "",
    contact_name: l.contact_name ?? "",
    contact_phone: l.contact_phone ?? "",
    alternate_phone: l.alternate_phone ?? "",
    company_name: l.company_name ?? "",
    architect_name: l.architect_name ?? "",
    contractor_name: l.contractor_name ?? "",
    site_address: l.site_address ?? "",
    landmark: l.landmark ?? "",
    project_type: l.project_type ?? "",
    project_size_sqft: l.project_size_sqft != null ? String(l.project_size_sqft) : "",
    num_floors: l.num_floors != null ? String(l.num_floors) : "",
    estimated_budget: l.estimated_budget != null ? String(l.estimated_budget) : "",
    expected_completion: l.expected_completion ?? "",
    stage: l.stage ?? "",
    status: l.status ?? "New",
    priority: l.priority ?? "Warm",
    notes: l.notes ?? "",
    followup_date: "",
  };
}

function EditLead() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const draftKey = `draft:lead:${id}`;

  const [f, setF] = useState<Form | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ id: string; image_url: string }[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialRef = useRef<{ form: Form; products: string[] } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lead-edit", id],
    queryFn: async () => {
      const [{ data: lead }, { data: lps }, { data: ph }] = await Promise.all([
        supabase.from("leads").select("*").eq("id", id).single(),
        supabase.from("lead_products").select("*").eq("lead_id", id),
        supabase.from("photos").select("id, image_url").eq("lead_id", id).order("created_at", { ascending: false }),
      ]);
      return { lead, products: (lps ?? []).map((p: any) => p.product), photos: ph ?? [] };
    },
  });

  // Initialize from lead, then overlay any saved draft
  useEffect(() => {
    if (!data?.lead || initialRef.current) return;
    const baseForm = fromLead(data.lead);
    initialRef.current = { form: baseForm, products: data.products };
    setProducts(data.products);
    setPhotos(data.photos);
    let restored = false;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.savedAt && (Date.now() - draft.savedAt < 7 * 86_400_000)) {
          if (confirm("Resume unsaved draft from earlier?")) {
            setF(draft.form);
            setProducts(draft.products ?? data.products);
            setDirty(true);
            restored = true;
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      }
    } catch {}
    if (!restored) setF(baseForm);
  }, [data, draftKey]);

  // Autosave draft (debounced)
  useEffect(() => {
    if (!f || !dirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ form: f, products, savedAt: Date.now() }));
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [f, products, dirty, draftKey]);

  // Block navigation when dirty
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      return !confirm("You have unsaved changes. Leave anyway?");
    },
  });

  // Block tab close
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => p ? ({ ...p, [k]: v }) : p);
    setDirty(true);
  };
  const toggleProduct = (p: string) => {
    setProducts((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
    setDirty(true);
  };

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setNewPhotos((p) => [...p, ...files]);
    setDirty(true);
  };
  const deletePhoto = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;
    const { error } = await supabase.from("photos").delete().eq("id", photoId);
    if (error) return toast.error(error.message);
    setPhotos((p) => p.filter((x) => x.id !== photoId));
  };

  const save = async () => {
    if (!f || !user) return;
    if (!f.site_name.trim()) { toast.error("Site name required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        site_name: f.site_name,
        contact_name: f.contact_name || null,
        contact_phone: f.contact_phone || null,
        alternate_phone: f.alternate_phone || null,
        company_name: f.company_name || null,
        architect_name: f.architect_name || null,
        contractor_name: f.contractor_name || null,
        site_address: f.site_address || null,
        landmark: f.landmark || null,
        project_type: f.project_type || null,
        project_size_sqft: f.project_size_sqft ? Number(f.project_size_sqft) : null,
        num_floors: f.num_floors ? Number(f.num_floors) : null,
        estimated_budget: f.estimated_budget ? Number(f.estimated_budget) : null,
        expected_completion: f.expected_completion || null,
        stage: f.stage || null,
        status: f.status,
        priority: f.priority,
        notes: f.notes || null,
      };
      const { error } = await supabase.from("leads").update(payload).eq("id", id);
      if (error) throw error;

      // Reconcile products
      const orig = initialRef.current?.products ?? [];
      const toAdd = products.filter((p) => !orig.includes(p));
      const toRem = orig.filter((p) => !products.includes(p));
      if (toAdd.length) await supabase.from("lead_products").insert(toAdd.map((product) => ({ lead_id: id, product })));
      if (toRem.length) await supabase.from("lead_products").delete().eq("lead_id", id).in("product", toRem);

      // Photos
      for (const file of newPhotos) {
        const compressed = await compressImage(file).catch(() => file);
        const ext = compressed.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("lead-photos").upload(path, compressed, { contentType: compressed.type });
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: pub } = supabase.storage.from("lead-photos").getPublicUrl(path);
        await supabase.from("photos").insert({ lead_id: id, user_id: user.id, image_url: pub.publicUrl, image_type: "site" });
      }

      // Optional new follow-up
      if (f.followup_date) {
        await supabase.from("followups").insert({
          lead_id: id, user_id: user.id, due_date: f.followup_date, reminder_notes: "Scheduled from edit",
        });
      }

      localStorage.removeItem(draftKey);
      setDirty(false);
      toast.success("Lead saved");
      nav({ to: "/leads/$id", params: { id } });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const dupPhone = useMemo(() => f?.contact_phone?.trim() ?? "", [f?.contact_phone]);
  const dupSite = useMemo(() => f?.site_name?.trim() ?? "", [f?.site_name]);
  const dupAddr = useMemo(() => f?.site_address?.trim() ?? "", [f?.site_address]);

  if (isLoading || !f) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4 pb-24">
      {dirty && (
        <div className="rounded-md border-2 border-primary bg-primary/10 px-3 py-2 text-sm font-bold">
          Unsaved changes — autosaving draft locally
        </div>
      )}

      <DuplicateWarning excludeId={id} phone={dupPhone} siteName={dupSite} address={dupAddr} />

      <Section title="Site & Contact">
        <Field label="Site name *"><Input value={f.site_name} onChange={(e) => set("site_name", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Contact"><Input value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
          <Field label="Phone"><Input type="tel" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Alt phone"><Input type="tel" value={f.alternate_phone} onChange={(e) => set("alternate_phone", e.target.value)} /></Field>
          <Field label="Company"><Input value={f.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Architect"><Input value={f.architect_name} onChange={(e) => set("architect_name", e.target.value)} /></Field>
          <Field label="Contractor"><Input value={f.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Location">
        <Field label="Address"><Textarea rows={2} value={f.site_address} onChange={(e) => set("site_address", e.target.value)} /></Field>
        <Field label="Landmark"><Input value={f.landmark} onChange={(e) => set("landmark", e.target.value)} /></Field>
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
        <div className="grid grid-cols-2 gap-2">
          <Field label="Budget (₹)"><Input type="number" value={f.estimated_budget} onChange={(e) => set("estimated_budget", e.target.value)} /></Field>
          <Field label="Expected end"><Input type="date" value={f.expected_completion} onChange={(e) => set("expected_completion", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Pipeline">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={f.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="New follow-up date (optional)"><Input type="date" value={f.followup_date} onChange={(e) => set("followup_date", e.target.value)} /></Field>
      </Section>

      <Section title="Product Interests">
        <div className="flex flex-wrap gap-1.5">
          {PRODUCTS.map((p) => (
            <button type="button" key={p} onClick={() => toggleProduct(p)}
              className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-colors",
                products.includes(p) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card")}>
              {p}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Notes">
        <Textarea rows={4} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Section>

      <Section title="Photos">
        <label>
          <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} className="hidden" id="edit-photo-input" />
          <Button asChild variant="secondary" className="w-full">
            <label htmlFor="edit-photo-input"><Camera className="h-4 w-4 mr-2" />Add photos ({newPhotos.length})</label>
          </Button>
        </label>
        {(photos.length > 0 || newPhotos.length > 0) && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded overflow-hidden border-2">
                <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                <button onClick={() => deletePhoto(p.id)}
                  className="absolute top-1 right-1 rounded bg-destructive text-destructive-foreground p-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {newPhotos.map((p, i) => (
              <div key={i} className="aspect-square rounded overflow-hidden border-2 border-primary">
                <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex justify-center">
        <Link to="/leads/$id" params={{ id }} className="text-sm text-muted-foreground">Cancel</Link>
      </div>

      <div className="fixed bottom-20 inset-x-0 z-30 px-4 safe-bottom">
        <div className="max-w-xl mx-auto">
          <Button onClick={save} disabled={saving || !dirty} size="lg" className="w-full h-14 text-base font-bold uppercase tracking-wider shadow-lg">
            {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
            Save Changes
          </Button>
        </div>
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