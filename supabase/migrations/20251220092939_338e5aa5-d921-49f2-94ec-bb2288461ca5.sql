-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create video_evaluations table for storing user ratings
CREATE TABLE public.video_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consistency_score INTEGER CHECK (consistency_score >= 0 AND consistency_score <= 5),
  probability_score INTEGER CHECK (probability_score >= 0 AND probability_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.video_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Evaluations are viewable by everyone" 
ON public.video_evaluations 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own evaluations" 
ON public.video_evaluations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluations" 
ON public.video_evaluations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluations" 
ON public.video_evaluations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_evaluations_updated_at
BEFORE UPDATE ON public.video_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_video_evaluations_video_id ON public.video_evaluations(video_id);
CREATE INDEX idx_video_evaluations_user_id ON public.video_evaluations(user_id);