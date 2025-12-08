-- Create subscriptions table for user-to-user subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, creator_id)
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions are viewable by everyone (to show counts)
CREATE POLICY "Subscriptions are viewable by everyone" 
ON public.subscriptions 
FOR SELECT 
USING (true);

-- Users can manage their own subscriptions
CREATE POLICY "Users can subscribe" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Users can unsubscribe" 
ON public.subscriptions 
FOR DELETE 
USING (auth.uid() = subscriber_id);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_creator_id ON public.subscriptions(creator_id);
CREATE INDEX idx_subscriptions_subscriber_id ON public.subscriptions(subscriber_id);