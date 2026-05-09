
DROP POLICY IF EXISTS "leh insert by authenticated" ON public.lead_edit_history;
CREATE POLICY "leh insert self" ON public.lead_edit_history
FOR INSERT TO authenticated WITH CHECK (changed_by = auth.uid());
