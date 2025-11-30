-- Add content filter preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN hide_child_content boolean DEFAULT false,
ADD COLUMN hide_under19_content boolean DEFAULT false,
ADD COLUMN hide_adult_content boolean DEFAULT false,
ADD COLUMN hide_sexual_content boolean DEFAULT false,
ADD COLUMN hide_violence_drugs_content boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.hide_child_content IS 'User preference to hide content inappropriate for children';
COMMENT ON COLUMN public.profiles.hide_under19_content IS 'User preference to hide content inappropriate for under 19';
COMMENT ON COLUMN public.profiles.hide_adult_content IS 'User preference to hide adult content';
COMMENT ON COLUMN public.profiles.hide_sexual_content IS 'User preference to hide sexual content';
COMMENT ON COLUMN public.profiles.hide_violence_drugs_content IS 'User preference to hide violence/drug content';