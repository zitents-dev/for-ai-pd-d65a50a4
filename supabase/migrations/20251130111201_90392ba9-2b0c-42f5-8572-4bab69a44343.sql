-- Add performance indexes for commonly queried fields

-- Videos table indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_created_at_desc ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_views_desc ON public.videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category_created_at ON public.videos(category, created_at DESC) WHERE category IS NOT NULL;

-- Watch history indexes
CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched ON public.watch_history(user_id, watched_at DESC);

-- Likes table indexes for faster aggregation
CREATE INDEX IF NOT EXISTS idx_likes_video_type ON public.likes(video_id, type);

-- Playlists indexes
CREATE INDEX IF NOT EXISTS idx_playlists_public_created ON public.playlists(is_public, created_at DESC) WHERE is_public = true;

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_video_created ON public.comments(video_id, created_at DESC);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON public.favorites(user_id, created_at DESC);