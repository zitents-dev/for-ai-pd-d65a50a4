-- Add additional profile fields for private information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add visibility settings for private fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_birthday BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_gender BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_country BOOLEAN DEFAULT false;