-- Add color column to directories table for color coding
ALTER TABLE public.directories 
ADD COLUMN color text DEFAULT NULL;