-- Add best_answer_id column to community_posts table to track solved status
ALTER TABLE public.community_posts 
ADD COLUMN best_answer_id uuid REFERENCES public.community_comments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_community_posts_best_answer ON public.community_posts(best_answer_id) WHERE best_answer_id IS NOT NULL;