
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_rep');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'sales_rep',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Enums
CREATE TYPE public.project_type AS ENUM ('Residential','Commercial','Retail','Hospitality','Institutional');
CREATE TYPE public.construction_stage AS ENUM ('Excavation','Foundation','RCC Structure','Brickwork','Plaster','Waterproofing','Electrical Rough-In','Plumbing Rough-In','Flooring','Ceiling','Painting','Interior Fit-Out','Façade Installation','Final Finishing','Handover');
CREATE TYPE public.lead_status AS ENUM ('New','Qualified','Quotation Sent','Negotiation','Follow-Up','Converted','Lost','Dormant');
CREATE TYPE public.lead_priority AS ENUM ('Hot','Warm','Cold');

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  alternate_phone TEXT,
  company_name TEXT,
  architect_name TEXT,
  contractor_name TEXT,
  site_address TEXT,
  landmark TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  project_type project_type,
  project_size_sqft NUMERIC,
  num_floors INTEGER,
  estimated_budget NUMERIC,
  expected_completion DATE,
  stage construction_stage,
  status lead_status NOT NULL DEFAULT 'New',
  priority lead_priority NOT NULL DEFAULT 'Warm',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads viewable by authenticated" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "users update own or admin" ON public.leads FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users delete own or admin" ON public.leads FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Lead products
CREATE TABLE public.lead_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp viewable" ON public.lead_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "lp insert" ON public.lead_products FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "lp delete" ON public.lead_products FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  notes TEXT,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act viewable" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "act insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Followups
CREATE TABLE public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  due_time TIME,
  reminder_notes TEXT,
  outcome TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fu viewable" ON public.followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "fu insert" ON public.followups FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fu update" ON public.followups FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fu delete" ON public.followups FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Photos
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'site',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph viewable" ON public.photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph insert" ON public.photos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ph delete" ON public.photos FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_leads_uat BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_followups_uat BEFORE UPDATE ON public.followups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_uat BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sales_rep');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-photos', 'lead-photos', true) ON CONFLICT DO NOTHING;
CREATE POLICY "photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'lead-photos');
CREATE POLICY "photos auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lead-photos');
CREATE POLICY "photos owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lead-photos' AND owner = auth.uid());
