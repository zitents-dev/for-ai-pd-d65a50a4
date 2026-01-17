-- Create function to notify when answer is selected as best
CREATE OR REPLACE FUNCTION public.create_best_answer_notification()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id UUID;
  post_author_name TEXT;
  post_title TEXT;
  notification_enabled BOOLEAN;
BEGIN
  -- Only trigger when best_answer_id changes from NULL or to a different value
  IF NEW.best_answer_id IS NOT NULL AND (OLD.best_answer_id IS NULL OR OLD.best_answer_id != NEW.best_answer_id) THEN
    -- Get the comment author
    SELECT user_id INTO comment_author_id
    FROM community_comments
    WHERE id = NEW.best_answer_id;
    
    -- Don't notify if the post author selected their own comment
    IF comment_author_id IS NOT NULL AND comment_author_id != NEW.user_id THEN
      -- Get post author name and title
      SELECT name INTO post_author_name
      FROM profiles
      WHERE id = NEW.user_id;
      
      post_title := NEW.title;
      
      -- Check if user has notifications enabled (we'll use comment_pinned_enabled for best answer too)
      SELECT COALESCE(ns.comment_pinned_enabled, true) INTO notification_enabled
      FROM profiles p
      LEFT JOIN notification_settings ns ON ns.user_id = p.id
      WHERE p.id = comment_author_id;
      
      IF notification_enabled IS NULL OR notification_enabled = true THEN
        INSERT INTO notifications (user_id, type, title, message, from_user_id)
        VALUES (
          comment_author_id,
          'comment_pinned',
          '답변 채택됨',
          COALESCE(post_author_name, '작성자') || '님이 회원님의 답변을 채택했습니다: ' || LEFT(post_title, 50),
          NEW.user_id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on community_posts
CREATE TRIGGER on_best_answer_selected
  AFTER UPDATE OF best_answer_id ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_best_answer_notification();