-- Fix security issues: Recreate views with SECURITY INVOKER
-- This ensures views respect the querying user's RLS policies

-- 1. Video details view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.video_details_view 
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

-- 2. User playlists view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.user_playlists_view 
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

-- 3. Comment details view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.comment_details_view 
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

-- 4. Watch history details view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.watch_history_details_view 
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

-- 5. Trending videos view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.trending_videos_view 
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

-- 6. User statistics view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.user_statistics_view 
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