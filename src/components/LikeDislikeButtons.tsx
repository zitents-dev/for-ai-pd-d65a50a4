import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface LikeDislikeButtonsProps {
  videoId: string;
  initialLiked: boolean;
  initialDisliked: boolean;
  initialLikesCount: number;
  initialDislikesCount: number;
}

export const LikeDislikeButtons = ({
  videoId,
  initialLiked,
  initialDisliked,
  initialLikesCount,
  initialDislikesCount,
}: LikeDislikeButtonsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(initialLiked);
  const [disliked, setDisliked] = useState(initialDisliked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [dislikesCount, setDislikesCount] = useState(initialDislikesCount);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      if (liked) {
        // Remove like
        await supabase
          .from("likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id)
          .eq("type", "like");

        setLiked(false);
        setLikesCount((prev) => prev - 1);
        toast.success("좋아요 취소");
      } else {
        // Remove existing dislike if any
        if (disliked) {
          await supabase
            .from("likes")
            .delete()
            .eq("video_id", videoId)
            .eq("user_id", user.id)
            .eq("type", "dislike");

          setDisliked(false);
          setDislikesCount((prev) => prev - 1);
        }

        // Add like
        await supabase
          .from("likes")
          .insert({ video_id: videoId, user_id: user.id, type: "like" });

        setLiked(true);
        setLikesCount((prev) => prev + 1);
        toast.success("좋아요!");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      if (disliked) {
        // Remove dislike
        await supabase
          .from("likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id)
          .eq("type", "dislike");

        setDisliked(false);
        setDislikesCount((prev) => prev - 1);
        toast.success("싫어요 취소");
      } else {
        // Remove existing like if any
        if (liked) {
          await supabase
            .from("likes")
            .delete()
            .eq("video_id", videoId)
            .eq("user_id", user.id)
            .eq("type", "like");

          setLiked(false);
          setLikesCount((prev) => prev - 1);
        }

        // Add dislike
        await supabase
          .from("likes")
          .insert({ video_id: videoId, user_id: user.id, type: "dislike" });

        setDisliked(true);
        setDislikesCount((prev) => prev + 1);
        toast.success("싫어요!");
      }
    } catch (error) {
      console.error("Error toggling dislike:", error);
      toast.error("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={liked ? "default" : "outline"}
        size="sm"
        onClick={handleLike}
        disabled={loading}
        className="gap-2"
      >
        <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
        {likesCount}
      </Button>
      <Button
        variant={disliked ? "destructive" : "outline"}
        size="sm"
        onClick={handleDislike}
        disabled={loading}
        className="gap-2"
      >
        <ThumbsDown className={`w-4 h-4 ${disliked ? "fill-current" : ""}`} />
        {dislikesCount}
      </Button>
    </div>
  );
};
