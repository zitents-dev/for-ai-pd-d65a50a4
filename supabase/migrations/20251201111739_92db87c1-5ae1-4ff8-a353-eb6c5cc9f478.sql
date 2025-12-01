-- Create video_category enum type if it doesn't exist
DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ai_solution enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE ai_solution AS ENUM (
    'chatgpt',
    'claude',
    'midjourney',
    'stable_diffusion',
    'runway',
    'elevenlabs',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add category column to videos table if it doesn't exist
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS category video_category;

-- Add ai_solution column to videos table if it doesn't exist
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS ai_solution ai_solution;

-- Add other missing columns
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS show_prompt boolean DEFAULT false;

ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS prompt_command text;