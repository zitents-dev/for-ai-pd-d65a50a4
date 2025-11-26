import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  videoId: string;
}

export function CommentSection({ videoId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments" as any)
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `)
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments((data as any) || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("comments" as any)
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      toast.success("Comment added");
      setNewComment("");
      loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments" as any)
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast.success("Comment deleted");
      loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">
        댓글 {comments.length}개
      </h2>

      {/* Comment Form */}
      {user ? (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !newComment.trim()}>
                {submitting ? "등록 중..." : "댓글 등록"}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-muted-foreground">
            댓글을 작성하려면 로그인해주세요
          </p>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">첫 번째 댓글을 작성해보세요!</p>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={comment.profiles.avatar_url || ""} />
                  <AvatarFallback>
                    {comment.profiles.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {comment.profiles.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
