-- Add email column to profiles table for public display
ALTER TABLE public.profiles
ADD COLUMN email text;