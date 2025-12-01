-- Add category index now that the column exists
CREATE INDEX IF NOT EXISTS idx_videos_category_created_at ON public.videos(category, created_at DESC) WHERE category IS NOT NULL;