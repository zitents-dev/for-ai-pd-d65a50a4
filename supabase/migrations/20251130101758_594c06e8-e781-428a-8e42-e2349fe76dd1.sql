-- Add duration column back to videos table (was removed accidentally)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration integer;

-- Create view for video likes and dislikes counts
CREATE OR REPLACE VIEW video_stats AS
SELECT 
  v.id,
  COUNT(CASE WHEN l.type = 'like' THEN 1 END) as likes_count,
  COUNT(CASE WHEN l.type = 'dislike' THEN 1 END) as dislikes_count
FROM videos v
LEFT JOIN likes l ON v.id = l.video_id
GROUP BY v.id;