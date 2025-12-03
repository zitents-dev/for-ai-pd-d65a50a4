-- Add dislike support to likes table
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'like' CHECK (type IN ('like', 'dislike'));

-- Create categories enum
CREATE TYPE public.video_category AS ENUM ('education', 'commercial', 'fiction', 'podcast', 'entertainment', 'tutorial', 'other');

-- Create AI solutions enum
CREATE TYPE public.ai_solution AS ENUM ('NanoBanana', 'Veo', 'Sora', 'Runway', 'Pika', 'Other');

-- Add new fields to videos table
ALTER TABLE public.videos 
  ADD COLUMN IF NOT EXISTS prompt_command text,
  ADD COLUMN IF NOT EXISTS show_prompt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_solution ai_solution,
  ADD COLUMN IF NOT EXISTS category video_category;

-- Create directories table
CREATE TABLE IF NOT EXISTS public.directories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.directories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own directories"
  ON public.directories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own directories"
  ON public.directories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own directories"
  ON public.directories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own directories"
  ON public.directories FOR DELETE
  USING (auth.uid() = user_id);

-- Create directory_videos junction table
CREATE TABLE IF NOT EXISTS public.directory_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_id uuid REFERENCES public.directories(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(directory_id, video_id)
);

ALTER TABLE public.directory_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own directory videos"
  ON public.directory_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.directories
      WHERE directories.id = directory_videos.directory_id
      AND directories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to own directories"
  ON public.directory_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.directories
      WHERE directories.id = directory_videos.directory_id
      AND directories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove from own directories"
  ON public.directory_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.directories
      WHERE directories.id = directory_videos.directory_id
      AND directories.user_id = auth.uid()
    )
  );

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Create badge types enum
CREATE TYPE public.badge_type AS ENUM ('best', 'official');

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type badge_type NOT NULL,
  awarded_at timestamp with time zone DEFAULT now(),
  awarded_by uuid REFERENCES public.profiles(id),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
  ON public.user_badges FOR SELECT
  USING (true);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.videos(category);
CREATE INDEX IF NOT EXISTS idx_directory_videos_directory ON public.directory_videos(directory_id);
CREATE INDEX IF NOT EXISTS idx_reports_video ON public.reports(video_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);