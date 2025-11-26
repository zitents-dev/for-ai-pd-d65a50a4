import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface LikeButtonProps {
  videoId: string;
  initialLiked: boolean;
  initialLikesCount: number;
}

export const LikeButton = ({ videoId, initialLiked, initialLikesCount }: LikeButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);

  const toggleLike = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id);

        if (error) throw error;

        setLiked(false);
        setLikesCount((prev) => prev - 1);
        toast.success("좋아요 취소");
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ video_id: videoId, user_id: user.id });

        if (error) throw error;

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

  return (
    <Button
      variant={liked ? "default" : "outline"}
      size="sm"
      onClick={toggleLike}
      disabled={loading}
      className="gap-2"
    >
      <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
      {likesCount}
    </Button>
  );
};
