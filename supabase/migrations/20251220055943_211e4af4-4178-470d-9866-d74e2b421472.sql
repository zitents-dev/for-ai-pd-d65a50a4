-- Add pinned_at column to comments table to track pinned comments
ALTER TABLE public.comments ADD COLUMN pinned_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient querying of pinned comments
CREATE INDEX idx_comments_pinned_at ON public.comments (video_id, pinned_at) WHERE pinned_at IS NOT NULL;