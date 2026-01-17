-- Create community_comment_votes table for upvote/downvote functionality
CREATE TABLE public.community_comment_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_comment_votes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Votes are viewable by everyone"
ON public.community_comment_votes
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own votes"
ON public.community_comment_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
ON public.community_comment_votes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
ON public.community_comment_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_community_comment_votes_comment_id ON public.community_comment_votes(comment_id);
CREATE INDEX idx_community_comment_votes_user_id ON public.community_comment_votes(user_id);