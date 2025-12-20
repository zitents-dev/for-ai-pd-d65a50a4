-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;

-- Create a new update policy that allows:
-- 1. Comment owners to update their own comments
-- 2. Video creators to update pinned_at for comments on their videos
CREATE POLICY "Users can update own comments or creators can pin" 
ON public.comments 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = comments.video_id 
    AND videos.creator_id = auth.uid()
  )
)
WITH CHECK (
  -- Comment owners can update any field
  auth.uid() = user_id 
  OR 
  -- Video creators can only update comments on their videos (for pinning)
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = comments.video_id 
    AND videos.creator_id = auth.uid()
  )
);