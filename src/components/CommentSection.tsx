import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Reply, X, ChevronDown, ChevronUp } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  videoId: string;
}

// Helper function to count total replies recursively
const countReplies = (comment: Comment): number => {
  if (!comment.replies || comment.replies.length === 0) return 0;
  return comment.replies.length + comment.replies.reduce((acc, reply) => acc + countReplies(reply), 0);
};

// Helper function to count all comments including nested replies
const countAllComments = (comments: Comment[]): number => {
  return comments.reduce((acc, comment) => acc + 1 + countReplies(comment), 0);
};

// Threshold for auto-collapsing threads
const AUTO_COLLAPSE_THRESHOLD = 3;

export function CommentSection({ videoId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  const [totalCommentCount, setTotalCommentCount] = useState(0);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const toggleThread = (commentId: string) => {
    setCollapsedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
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
      
      // Build nested comment tree recursively
      const allComments = (data as unknown as Comment[]) || [];
      const commentMap = new Map<string, Comment>();
      
      // First pass: create map of all comments
      allComments.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
      });
      
      // Second pass: build tree structure
      const rootComments: Comment[] = [];
      allComments.forEach(comment => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies!.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });
      
      // Sort replies by created_at ascending
      const sortReplies = (comments: Comment[]) => {
        comments.forEach(comment => {
          if (comment.replies && comment.replies.length > 0) {
            comment.replies.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            sortReplies(comment.replies);
          }
        });
      };
      sortReplies(rootComments);
      
      // Sort root comments by created_at descending
      rootComments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Calculate total comment count
      setTotalCommentCount(countAllComments(rootComments));
      
      // Auto-collapse threads with many replies
      const autoCollapsed = new Set<string>();
      const findLongThreads = (comments: Comment[]) => {
        comments.forEach(comment => {
          const replyCount = countReplies(comment);
          if (replyCount >= AUTO_COLLAPSE_THRESHOLD) {
            autoCollapsed.add(comment.id);
          }
          if (comment.replies && comment.replies.length > 0) {
            findLongThreads(comment.replies);
          }
        });
      };
      findLongThreads(rootComments);
      setCollapsedThreads(autoCollapsed);
      
      setComments(rootComments);
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
        .from("comments")
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim(),
          parent_id: null,
        });

      if (error) throw error;

      toast.success("댓글이 등록되었습니다");
      setNewComment("");
      loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("댓글 등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyingTo) {
      toast.error("로그인이 필요합니다");
      return;
    }

    if (!replyContent.trim()) {
      toast.error("답글 내용을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_id: replyingTo.id,
        });

      if (error) throw error;

      toast.success("답글이 등록되었습니다");
      setReplyContent("");
      setReplyingTo(null);
      loadComments();
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("답글 등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast.success("삭제되었습니다");
      loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("삭제에 실패했습니다");
    }
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const maxIndent = 4; // Maximum nesting visual depth
    const indentLevel = Math.min(depth, maxIndent);
    const replyCount = countReplies(comment);
    const isCollapsed = collapsedThreads.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;
    
    return (
      <div key={comment.id} className="space-y-2">
        <Card 
          className={`p-4 ${depth > 0 ? "border-l-2 border-primary/20" : ""}`}
          style={{ marginLeft: `${indentLevel * 24}px` }}
        >
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={comment.profiles.avatar_url || ""} />
              <AvatarFallback>
                {comment.profiles.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
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
                <div className="flex items-center gap-1">
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(comment);
                        setReplyContent("");
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Reply className="w-4 h-4 mr-1" />
                      답글
                    </Button>
                  )}
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
              </div>
              <p className="text-foreground whitespace-pre-wrap break-words">
                {comment.content}
              </p>
              
              {/* Collapse/Expand toggle for comments with replies */}
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleThread(comment.id)}
                  className="mt-2 text-primary hover:text-primary/80 p-0 h-auto"
                >
                  {isCollapsed ? (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      답글 {replyCount}개 보기
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      답글 숨기기
                    </>
                  )}
                </Button>
              )}
              
              {/* Reply form for this comment */}
              {replyingTo?.id === comment.id && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      @{comment.profiles.name}에게 답글 작성
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <form onSubmit={handleReplySubmit} className="space-y-2">
                    <Textarea
                      placeholder="답글을 입력하세요..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px]"
                      disabled={submitting}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyingTo(null)}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submitting || !replyContent.trim()}
                      >
                        {submitting ? "등록 중..." : "답글 등록"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {/* Render nested replies recursively (only if not collapsed) */}
        {hasReplies && !isCollapsed && (
          <div className="space-y-2">
            {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">
        댓글 {totalCommentCount}개
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
          comments.map((comment) => renderComment(comment, 0))
        )}
      </div>
    </div>
  );
}