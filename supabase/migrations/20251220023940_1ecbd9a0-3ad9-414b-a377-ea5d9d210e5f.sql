-- Create comment_likes table for storing reactions to comments
CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'like' CHECK (type IN ('like', 'dislike')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Everyone can view comment likes (for counting)
CREATE POLICY "Comment likes are viewable by everyone"
ON public.comment_likes
FOR SELECT
USING (true);

-- Users can manage their own likes
CREATE POLICY "Users can insert own comment likes"
ON public.comment_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comment likes"
ON public.comment_likes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment likes"
ON public.comment_likes
FOR DELETE
USING (auth.uid() = user_id);