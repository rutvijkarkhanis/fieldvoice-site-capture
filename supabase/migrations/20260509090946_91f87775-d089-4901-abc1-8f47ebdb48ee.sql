ALTER TABLE public.leads ADD COLUMN exact_requirement text;

-- Update edit history trigger to track exact_requirement changes
CREATE OR REPLACE FUNCTION public.log_lead_edit_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  fields text[] := ARRAY['site_name','contact_name','contact_phone','alternate_phone','company_name','architect_name','contractor_name','site_address','landmark','project_type','project_size_sqft','num_floors','estimated_budget','expected_completion','stage','status','priority','notes','assigned_to','exact_requirement'];
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
END $function$;