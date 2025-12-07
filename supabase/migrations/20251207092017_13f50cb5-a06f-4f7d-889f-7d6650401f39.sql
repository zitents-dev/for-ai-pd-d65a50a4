-- Drop the incorrect policies
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view thumbnails" ON storage.objects;

-- Create correct policies that handle UUID with dashes in filename
-- File format: {userId}-banner-{timestamp}.png or {userId}-avatar-{timestamp}.png

CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  name LIKE auth.uid()::text || '-%'
);

CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  name LIKE auth.uid()::text || '-%'
);

CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  name LIKE auth.uid()::text || '-%'
);

CREATE POLICY "Public can view thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'thumbnails');