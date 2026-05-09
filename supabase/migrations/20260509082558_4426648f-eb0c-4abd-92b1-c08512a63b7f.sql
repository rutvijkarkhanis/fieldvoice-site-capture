
DROP POLICY IF EXISTS "photos public read" ON storage.objects;
CREATE POLICY "photos auth list" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lead-photos');
