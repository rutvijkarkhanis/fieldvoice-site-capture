
-- Add assigned_to to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Default assigned_to to owner_id on insert
CREATE OR REPLACE FUNCTION public.leads_default_assigned_to()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NULL THEN NEW.assigned_to := NEW.owner_id; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_leads_default_assigned_to ON public.leads;
CREATE TRIGGER trg_leads_default_assigned_to
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_default_assigned_to();

UPDATE public.leads SET assigned_to = owner_id WHERE assigned_to IS NULL;

-- updated_at trigger if not present
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Tighten RLS for leads: assigned or owner or admin
DROP POLICY IF EXISTS "leads viewable by authenticated" ON public.leads;
DROP POLICY IF EXISTS "users update own or admin" ON public.leads;
DROP POLICY IF EXISTS "users delete own or admin" ON public.leads;

CREATE POLICY "leads viewable by owner assignee or admin"
ON public.leads FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "leads update by owner assignee or admin"
ON public.leads FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "leads delete by owner or admin"
ON public.leads FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Edit history table
CREATE TABLE IF NOT EXISTS public.lead_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leh_lead_id ON public.lead_edit_history(lead_id, created_at DESC);

ALTER TABLE public.lead_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leh viewable by authenticated"
ON public.lead_edit_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "leh insert by authenticated"
ON public.lead_edit_history FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger to auto-record edit history
CREATE OR REPLACE FUNCTION public.log_lead_edit_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fields text[] := ARRAY['site_name','contact_name','contact_phone','alternate_phone','company_name','architect_name','contractor_name','site_address','landmark','project_type','project_size_sqft','num_floors','estimated_budget','expected_completion','stage','status','priority','notes','assigned_to'];
  f text;
  old_v text;
  new_v text;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f) INTO old_v, new_v USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.lead_edit_history (lead_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, f, old_v, new_v, auth.uid());
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_lead_edit_history ON public.leads;
CREATE TRIGGER trg_log_lead_edit_history
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_edit_history();
