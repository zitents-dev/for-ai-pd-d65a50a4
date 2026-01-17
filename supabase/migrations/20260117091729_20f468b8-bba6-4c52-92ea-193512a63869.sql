
-- Add image_url column to community_posts
ALTER TABLE public.community_posts 
ADD COLUMN image_url TEXT;

-- Create storage bucket for community images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true);

-- Allow authenticated users to upload to community-images bucket
CREATE POLICY "Authenticated users can upload community images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-images');

-- Allow public to view community images
CREATE POLICY "Public can view community images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own community images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);
