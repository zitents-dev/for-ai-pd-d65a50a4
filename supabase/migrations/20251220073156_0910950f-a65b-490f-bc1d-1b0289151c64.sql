-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('mention', 'comment_pinned', 'new_content');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  from_user_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (using service role or triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create mention notifications
CREATE OR REPLACE FUNCTION public.create_mention_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_name TEXT;
  mentioned_user_id UUID;
  commenter_name TEXT;
  video_title TEXT;
BEGIN
  -- Get commenter name
  SELECT name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  -- Get video title
  SELECT title INTO video_title FROM videos WHERE id = NEW.video_id;
  
  -- Find all @mentions in the content
  FOR mentioned_name IN
    SELECT DISTINCT (regexp_matches(NEW.content, '@([^\s]+)', 'g'))[1]
  LOOP
    -- Find user by name
    SELECT id INTO mentioned_user_id FROM profiles WHERE name = mentioned_name;
    
    -- Create notification if user exists and is not the commenter
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, video_id, comment_id, from_user_id)
      VALUES (
        mentioned_user_id,
        'mention',
        '새 멘션',
        COALESCE(commenter_name, '사용자') || '님이 댓글에서 회원님을 멘션했습니다',
        NEW.video_id,
        NEW.id,
        NEW.user_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for mention notifications
CREATE TRIGGER on_comment_mention
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_mention_notifications();

-- Function to create pinned comment notification
CREATE OR REPLACE FUNCTION public.create_pinned_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  video_title TEXT;
  creator_name TEXT;
  video_creator_id UUID;
BEGIN
  -- Only trigger when pinned_at changes from NULL to a value
  IF OLD.pinned_at IS NULL AND NEW.pinned_at IS NOT NULL THEN
    -- Get video info
    SELECT title, creator_id INTO video_title, video_creator_id FROM videos WHERE id = NEW.video_id;
    
    -- Get creator name
    SELECT name INTO creator_name FROM profiles WHERE id = video_creator_id;
    
    -- Don't notify if the comment author is the video creator
    IF NEW.user_id != video_creator_id THEN
      INSERT INTO notifications (user_id, type, title, message, video_id, comment_id, from_user_id)
      VALUES (
        NEW.user_id,
        'comment_pinned',
        '댓글 고정됨',
        COALESCE(creator_name, '크리에이터') || '님이 회원님의 댓글을 고정했습니다',
        NEW.video_id,
        NEW.id,
        video_creator_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for pinned comment notifications
CREATE TRIGGER on_comment_pinned
  AFTER UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_pinned_notification();

-- Function to create new content notification for subscribers
CREATE OR REPLACE FUNCTION public.create_new_content_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name TEXT;
  subscriber_record RECORD;
BEGIN
  -- Get creator name
  SELECT name INTO creator_name FROM profiles WHERE id = NEW.creator_id;
  
  -- Notify all subscribers
  FOR subscriber_record IN
    SELECT subscriber_id FROM subscriptions WHERE creator_id = NEW.creator_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, video_id, from_user_id)
    VALUES (
      subscriber_record.subscriber_id,
      'new_content',
      '새 영상',
      COALESCE(creator_name, '크리에이터') || '님이 새 영상을 업로드했습니다: ' || NEW.title,
      NEW.id,
      NEW.creator_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for new content notifications
CREATE TRIGGER on_video_upload
  AFTER INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_content_notifications();