-- Create table for tracking comment edit history
CREATE TABLE public.community_comment_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES public.profiles(id),
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_comment_edits ENABLE ROW LEVEL SECURITY;

-- Everyone can view edit history
CREATE POLICY "Edit history is viewable by everyone"
  ON public.community_comment_edits
  FOR SELECT
  USING (true);

-- Users can insert edit history for their own comments
CREATE POLICY "Users can insert edit history for own comments"
  ON public.community_comment_edits
  FOR INSERT
  WITH CHECK (
    auth.uid() = edited_by AND
    EXISTS (
      SELECT 1 FROM public.community_comments
      WHERE id = comment_id AND user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_comment_edits_comment_id ON public.community_comment_edits(comment_id);
CREATE INDEX idx_comment_edits_edited_at ON public.community_comment_edits(edited_at DESC);