-- Add viewing condition fields to videos table
ALTER TABLE public.videos 
ADD COLUMN age_restriction text[] DEFAULT '{}',
ADD COLUMN has_sexual_content boolean DEFAULT false,
ADD COLUMN has_violence_drugs boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.videos.age_restriction IS 'Array of age restrictions: child, under_19, adult';
COMMENT ON COLUMN public.videos.has_sexual_content IS 'Whether video contains sexual content';
COMMENT ON COLUMN public.videos.has_violence_drugs IS 'Whether video contains violence or drug-related content';