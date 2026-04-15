-- Remove the overlapping INSERT policy that lacks folder-scoping
DROP POLICY IF EXISTS "Authenticated users can upload maintenance photos" ON storage.objects;