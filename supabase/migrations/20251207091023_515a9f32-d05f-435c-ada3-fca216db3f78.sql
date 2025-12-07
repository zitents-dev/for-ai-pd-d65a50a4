-- Create storage policies for thumbnails bucket to allow banner uploads

-- Allow authenticated users to upload their own banner/avatar images
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (string_to_array(name, '-'))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (string_to_array(name, '-'))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (string_to_array(name, '-'))[1]
);

-- Allow public read access to thumbnails
CREATE POLICY "Public can view thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'thumbnails');