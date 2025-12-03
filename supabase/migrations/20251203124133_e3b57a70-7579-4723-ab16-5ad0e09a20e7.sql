-- Add soft delete columns to profiles for quit member feature
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for checking deleted users
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(is_deleted, deleted_at);

-- Update RLS policy to prevent deleted users from accessing their profile
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (is_deleted = false OR id = auth.uid());