-- Add tags column to community_posts table
ALTER TABLE public.community_posts ADD COLUMN tags text[] DEFAULT NULL;