-- The listing view is intentionally the public-safe surface; it exposes only listing fields, not private financial fields.
ALTER VIEW public.public_property_listings SET (security_invoker = false);

-- Narrow public property image listing/access to active listing images and seeded assets only
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Landlords and admins can upload property images" ON storage.objects;

CREATE POLICY "Anyone can view active property images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'property-images'
  AND (
    name LIKE 'seed/%'
    OR EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.is_archived = false
        AND (p.is_paused = false OR p.is_paused IS NULL)
        AND p.image_url IS NOT NULL
        AND p.image_url LIKE '%' || storage.objects.name
    )
  )
);

CREATE POLICY "Landlords and admins can upload own property images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'landlord'::public.app_role)
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);