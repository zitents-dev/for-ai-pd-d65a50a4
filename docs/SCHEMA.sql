-- =============================================================================
-- AI PD HUB - Complete Database Schema Reference
-- =============================================================================
-- This file represents the complete current state of the database schema.
-- It is for reference only - actual schema is managed through migrations.
-- Generated: 2025-12-01
-- =============================================================================

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- Video category classifications
CREATE TYPE video_category AS ENUM (
  'education',
  'entertainment',
  'gaming',
  'music',
  'sports',
  'technology',
  'lifestyle',
  'other'
);

-- AI solution/tool used to create the video
CREATE TYPE ai_solution AS ENUM (
  'chatgpt',
  'claude',
  'midjourney',
  'stable_diffusion',
  'runway',
  'elevenlabs',
  'other'
);

-- User badge types for achievements
CREATE TYPE badge_type AS ENUM (
  'verified',
  'early_adopter',
  'contributor',
  'moderator',
  'admin'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  email TEXT,
  banner_url TEXT,
  show_email BOOLEAN DEFAULT false,
  name_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Content filtering preferences
  hide_child_content BOOLEAN DEFAULT false,
  hide_under19_content BOOLEAN DEFAULT false,
  hide_adult_content BOOLEAN DEFAULT false,
  hide_sexual_content BOOLEAN DEFAULT false,
  hide_violence_drugs_content BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video content
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- in seconds
  views INTEGER DEFAULT 0,
  
  -- Categorization & AI metadata
  category video_category,
  tags TEXT[],
  ai_solution ai_solution,
  show_prompt BOOLEAN DEFAULT false,
  prompt_command TEXT,
  
  -- Content restrictions
  age_restriction TEXT[] DEFAULT '{}',
  has_sexual_content BOOLEAN DEFAULT false,
  has_violence_drugs BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video likes and dislikes
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like', -- 'like' or 'dislike'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- User favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Video comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User playlists
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos in playlists (junction table)
CREATE TABLE public.playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, video_id)
);

-- Watch history
CREATE TABLE public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- User directories (custom organization)
CREATE TABLE public.directories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos in directories (junction table)
CREATE TABLE public.directory_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_id UUID NOT NULL REFERENCES public.directories(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(directory_id, video_id)
);

-- Video reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges/achievements
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type badge_type NOT NULL,
  awarded_by UUID REFERENCES auth.users(id),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- OPTIMIZED VIEWS
-- =============================================================================

-- Video details with creator and engagement metrics
CREATE VIEW public.video_details_view 
WITH (security_invoker = true) AS
SELECT 
  v.id,
  v.title,
  v.description,
  v.video_url,
  v.thumbnail_url,
  v.duration,
  v.views,
  v.tags,
  v.category,
  v.ai_solution,
  v.show_prompt,
  v.prompt_command,
  v.age_restriction,
  v.has_sexual_content,
  v.has_violence_drugs,
  v.created_at,
  v.creator_id,
  p.name as creator_name,
  p.avatar_url as creator_avatar,
  p.bio as creator_bio,
  COALESCE(likes_count.likes, 0) as likes_count,
  COALESCE(likes_count.dislikes, 0) as dislikes_count,
  COALESCE(comments_count.count, 0) as comments_count,
  COALESCE(favorites_count.count, 0) as favorites_count
FROM public.videos v
LEFT JOIN public.profiles p ON v.creator_id = p.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) FILTER (WHERE type = 'like') as likes,
    COUNT(*) FILTER (WHERE type = 'dislike') as dislikes
  FROM public.likes 
  WHERE video_id = v.id
) likes_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM public.comments 
  WHERE video_id = v.id
) comments_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM public.favorites 
  WHERE video_id = v.id
) favorites_count ON true;

-- User playlists with video counts
CREATE VIEW public.user_playlists_view 
WITH (security_invoker = true) AS
SELECT 
  pl.id,
  pl.user_id,
  pl.title,
  pl.description,
  pl.is_public,
  pl.thumbnail_url,
  pl.created_at,
  pl.updated_at,
  p.name as creator_name,
  p.avatar_url as creator_avatar,
  COALESCE(video_count.count, 0) as video_count,
  video_count.total_duration
FROM public.playlists pl
LEFT JOIN public.profiles p ON pl.user_id = p.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) as count,
    SUM(v.duration) as total_duration
  FROM public.playlist_videos pv
  LEFT JOIN public.videos v ON pv.video_id = v.id
  WHERE pv.playlist_id = pl.id
) video_count ON true;

-- Comment details with user profiles
CREATE VIEW public.comment_details_view 
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.video_id,
  c.user_id,
  c.content,
  c.created_at,
  p.name as user_name,
  p.avatar_url as user_avatar
FROM public.comments c
LEFT JOIN public.profiles p ON c.user_id = p.id;

-- Watch history with full video details
CREATE VIEW public.watch_history_details_view 
WITH (security_invoker = true) AS
SELECT 
  wh.id,
  wh.user_id,
  wh.video_id,
  wh.watched_at,
  v.title as video_title,
  v.description as video_description,
  v.thumbnail_url,
  v.duration,
  v.views,
  v.category,
  v.creator_id,
  p.name as creator_name,
  p.avatar_url as creator_avatar
FROM public.watch_history wh
LEFT JOIN public.videos v ON wh.video_id = v.id
LEFT JOIN public.profiles p ON v.creator_id = p.id;

-- Trending videos with engagement scores
CREATE VIEW public.trending_videos_view 
WITH (security_invoker = true) AS
SELECT 
  v.id,
  v.title,
  v.description,
  v.video_url,
  v.thumbnail_url,
  v.duration,
  v.views,
  v.category,
  v.created_at,
  v.creator_id,
  p.name as creator_name,
  p.avatar_url as creator_avatar,
  COALESCE(engagement.likes, 0) as likes_count,
  COALESCE(engagement.dislikes, 0) as dislikes_count,
  COALESCE(engagement.comments, 0) as comments_count,
  COALESCE(engagement.favorites, 0) as favorites_count,
  -- Engagement score calculation
  v.views + 
    (COALESCE(engagement.likes, 0) * 10) + 
    (COALESCE(engagement.comments, 0) * 5) + 
    (COALESCE(engagement.favorites, 0) * 3) - 
    (COALESCE(engagement.dislikes, 0) * 5) as engagement_score
FROM public.videos v
LEFT JOIN public.profiles p ON v.creator_id = p.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) FILTER (WHERE l.type = 'like') as likes,
    COUNT(*) FILTER (WHERE l.type = 'dislike') as dislikes,
    (SELECT COUNT(*) FROM public.comments WHERE video_id = v.id) as comments,
    (SELECT COUNT(*) FROM public.favorites WHERE video_id = v.id) as favorites
  FROM public.likes l
  WHERE l.video_id = v.id
) engagement ON true;

-- User statistics
CREATE VIEW public.user_statistics_view 
WITH (security_invoker = true) AS
SELECT 
  p.id as user_id,
  p.name,
  p.avatar_url,
  p.bio,
  p.created_at,
  COALESCE(video_stats.video_count, 0) as videos_uploaded,
  COALESCE(video_stats.total_views, 0) as total_views,
  COALESCE(playlist_stats.playlist_count, 0) as playlists_created,
  COALESCE(comment_stats.comment_count, 0) as comments_made,
  COALESCE(like_stats.likes_given, 0) as likes_given
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) as video_count,
    SUM(views) as total_views
  FROM public.videos 
  WHERE creator_id = p.id
) video_stats ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as playlist_count
  FROM public.playlists 
  WHERE user_id = p.id
) playlist_stats ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as comment_count
  FROM public.comments 
  WHERE user_id = p.id
) comment_stats ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as likes_given
  FROM public.likes 
  WHERE user_id = p.id AND type = 'like'
) like_stats ON true;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Profile indexes
CREATE INDEX idx_profiles_name ON public.profiles USING gin(to_tsvector('english', name));

-- Video indexes
CREATE INDEX idx_videos_title ON public.videos USING gin(to_tsvector('english', title));
CREATE INDEX idx_videos_tags ON public.videos USING gin(tags);
CREATE INDEX idx_videos_created_at_desc ON public.videos(created_at DESC);
CREATE INDEX idx_videos_views_desc ON public.videos(views DESC);
CREATE INDEX idx_videos_category_created_at ON public.videos(category, created_at DESC) WHERE category IS NOT NULL;

-- Engagement indexes
CREATE INDEX idx_likes_video_type ON public.likes(video_id, type);
CREATE INDEX idx_comments_video_created ON public.comments(video_id, created_at DESC);
CREATE INDEX idx_favorites_user_created ON public.favorites(user_id, created_at DESC);

-- Playlist indexes
CREATE INDEX idx_playlists_public_created ON public.playlists(is_public, created_at DESC) WHERE is_public = true;

-- Watch history indexes
CREATE INDEX idx_watch_history_user_watched ON public.watch_history(user_id, watched_at DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Creator'));
  RETURN new;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update playlist updated_at
CREATE OR REPLACE FUNCTION public.update_playlist_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update watch history timestamp on re-watch
CREATE OR REPLACE FUNCTION public.update_watch_history_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.watched_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_playlist_updated_at();

CREATE TRIGGER update_watch_history_on_conflict
  BEFORE UPDATE ON public.watch_history
  FOR EACH ROW EXECUTE FUNCTION public.update_watch_history_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Videos policies
CREATE POLICY "Videos are viewable by everyone" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Users can insert own videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own videos" ON public.videos FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own videos" ON public.videos FOR DELETE USING (auth.uid() = creator_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Favorites are viewable by owner" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Playlists policies
CREATE POLICY "Public playlists are viewable by everyone" ON public.playlists FOR SELECT USING ((is_public = true) OR (auth.uid() = user_id));
CREATE POLICY "Users can create own playlists" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON public.playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist videos policies
CREATE POLICY "Playlist videos are viewable by playlist viewers" ON public.playlist_videos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM playlists 
    WHERE playlists.id = playlist_videos.playlist_id 
    AND ((playlists.is_public = true) OR (playlists.user_id = auth.uid()))
  )
);
CREATE POLICY "Users can add to own playlists" ON public.playlist_videos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.user_id = auth.uid())
);
CREATE POLICY "Users can remove from own playlists" ON public.playlist_videos FOR DELETE USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.user_id = auth.uid())
);
CREATE POLICY "Users can update own playlist videos" ON public.playlist_videos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.user_id = auth.uid())
);

-- Watch history policies
CREATE POLICY "Users can view own watch history" ON public.watch_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watch history" ON public.watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watch history" ON public.watch_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watch history" ON public.watch_history FOR DELETE USING (auth.uid() = user_id);

-- Directories policies
CREATE POLICY "Users can view own directories" ON public.directories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own directories" ON public.directories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own directories" ON public.directories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own directories" ON public.directories FOR DELETE USING (auth.uid() = user_id);

-- Directory videos policies
CREATE POLICY "Users can view own directory videos" ON public.directory_videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM directories WHERE directories.id = directory_videos.directory_id AND directories.user_id = auth.uid())
);
CREATE POLICY "Users can add to own directories" ON public.directory_videos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM directories WHERE directories.id = directory_videos.directory_id AND directories.user_id = auth.uid())
);
CREATE POLICY "Users can remove from own directories" ON public.directory_videos FOR DELETE USING (
  EXISTS (SELECT 1 FROM directories WHERE directories.id = directory_videos.directory_id AND directories.user_id = auth.uid())
);

-- Reports policies
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- User badges policies
CREATE POLICY "Badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- videos bucket (public)
-- thumbnails bucket (public)
-- avatars bucket (public)

-- Note: Storage policies are managed separately through Supabase Storage