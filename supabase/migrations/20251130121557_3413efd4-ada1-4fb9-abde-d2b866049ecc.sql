-- Add name_updated_at and show_email columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN name_updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN show_email boolean DEFAULT false;

-- Update existing rows to have name_updated_at set
UPDATE public.profiles
SET name_updated_at = created_at
WHERE name_updated_at IS NULL;