import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface DislikeButtonProps {
  videoId: string;
  initialDisliked: boolean;
  initialDislikesCount: number;
}

export const DislikeButton = ({ videoId, initialDisliked, initialDislikesCount }: DislikeButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [disliked, setDisliked] = useState(initialDisliked);
  const [dislikesCount, setDislikesCount] = useState(initialDislikesCount);
  const [loading, setLoading] = useState(false);

  const toggleDislike = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      if (disliked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id)
          .eq("type", "dislike");

        if (error) throw error;

        setDisliked(false);
        setDislikesCount((prev) => prev - 1);
        toast.success("싫어요 취소");
      } else {
        // First, remove any existing like
        await supabase
          .from("likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id);

        // Then add dislike
        const { error } = await supabase
          .from("likes")
          .insert({ video_id: videoId, user_id: user.id, type: "dislike" });

        if (error) throw error;

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
    <Button
      variant={disliked ? "destructive" : "outline"}
      size="sm"
      onClick={toggleDislike}
      disabled={loading}
      className="gap-2"
    >
      <ThumbsDown className={`w-4 h-4 ${disliked ? "fill-current" : ""}`} />
      {dislikesCount}
    </Button>
  );
};