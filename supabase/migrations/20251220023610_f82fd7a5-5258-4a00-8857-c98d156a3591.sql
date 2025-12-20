-- Add updated_at column to comments table
ALTER TABLE public.comments 
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Create trigger to automatically update the timestamp when comment is edited
CREATE OR REPLACE FUNCTION public.update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_updated_at();