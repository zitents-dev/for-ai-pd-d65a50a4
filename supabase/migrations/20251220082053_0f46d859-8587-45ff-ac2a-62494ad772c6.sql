-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  mention_enabled BOOLEAN NOT NULL DEFAULT true,
  comment_pinned_enabled BOOLEAN NOT NULL DEFAULT true,
  new_content_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notification settings"
ON public.notification_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
ON public.notification_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_updated_at();

-- Update mention notification function to respect settings
CREATE OR REPLACE FUNCTION public.create_mention_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mentioned_name TEXT;
  mentioned_user_id UUID;
  commenter_name TEXT;
  video_title TEXT;
  mention_enabled_check BOOLEAN;
BEGIN
  SELECT name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  SELECT title INTO video_title FROM videos WHERE id = NEW.video_id;
  
  FOR mentioned_name IN
    SELECT DISTINCT (regexp_matches(NEW.content, '@([^\s]+)', 'g'))[1]
  LOOP
    SELECT id INTO mentioned_user_id FROM profiles WHERE name = mentioned_name;
    
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      -- Check if user has mention notifications enabled (default true)
      SELECT COALESCE(ns.mention_enabled, true) INTO mention_enabled_check
      FROM profiles p
      LEFT JOIN notification_settings ns ON ns.user_id = p.id
      WHERE p.id = mentioned_user_id;
      
      IF mention_enabled_check IS NULL OR mention_enabled_check = true THEN
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
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update pinned notification function to respect settings
CREATE OR REPLACE FUNCTION public.create_pinned_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  video_title TEXT;
  creator_name TEXT;
  video_creator_id UUID;
  pinned_enabled_check BOOLEAN;
BEGIN
  IF OLD.pinned_at IS NULL AND NEW.pinned_at IS NOT NULL THEN
    SELECT title, creator_id INTO video_title, video_creator_id FROM videos WHERE id = NEW.video_id;
    SELECT name INTO creator_name FROM profiles WHERE id = video_creator_id;
    
    IF NEW.user_id != video_creator_id THEN
      -- Check if user has pinned notifications enabled
      SELECT COALESCE(ns.comment_pinned_enabled, true) INTO pinned_enabled_check
      FROM profiles p
      LEFT JOIN notification_settings ns ON ns.user_id = p.id
      WHERE p.id = NEW.user_id;
      
      IF pinned_enabled_check IS NULL OR pinned_enabled_check = true THEN
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update new content notification function to respect settings
CREATE OR REPLACE FUNCTION public.create_new_content_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_name TEXT;
  subscriber_record RECORD;
  new_content_enabled_check BOOLEAN;
BEGIN
  SELECT name INTO creator_name FROM profiles WHERE id = NEW.creator_id;
  
  FOR subscriber_record IN
    SELECT subscriber_id FROM subscriptions WHERE creator_id = NEW.creator_id
  LOOP
    -- Check if subscriber has new content notifications enabled
    SELECT COALESCE(ns.new_content_enabled, true) INTO new_content_enabled_check
    FROM profiles p
    LEFT JOIN notification_settings ns ON ns.user_id = p.id
    WHERE p.id = subscriber_record.subscriber_id;
    
    IF new_content_enabled_check IS NULL OR new_content_enabled_check = true THEN
      INSERT INTO notifications (user_id, type, title, message, video_id, from_user_id)
      VALUES (
        subscriber_record.subscriber_id,
        'new_content',
        '새 영상',
        COALESCE(creator_name, '크리에이터') || '님이 새 영상을 업로드했습니다: ' || NEW.title,
        NEW.id,
        NEW.creator_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;