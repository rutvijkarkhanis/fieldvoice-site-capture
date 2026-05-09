
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (contact_phone);
CREATE INDEX IF NOT EXISTS idx_leads_site_name ON public.leads (site_name);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads (stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads (owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON public.leads (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_lead_id ON public.followups (lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_due_date ON public.followups (due_date);
CREATE INDEX IF NOT EXISTS idx_followups_user_status ON public.followups (user_id, status);
CREATE INDEX IF NOT EXISTS idx_photos_lead_id ON public.photos (lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_products_lead_id ON public.lead_products (lead_id);
