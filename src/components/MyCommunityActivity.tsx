import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Loader2,
  MessageSquare,
  CheckCircle,
  Eye,
  ThumbsUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  views: number;
  best_answer_id: string | null;
  tags: string[] | null;
  category: {
    name_ko: string;
    color: string;
  } | null;
  likes_count: number;
  comments_count: number;
}

interface CommunityComment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  post_title: string;
  is_best_answer: boolean;
}

const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

export const MyCommunityActivity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [postsPage, setPostsPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const postsPerPage = 5;
  const commentsPerPage = 5;

  useEffect(() => {
    if (user) {
      loadMyPosts();
      loadMyComments();
    }
  }, [user]);

  const loadMyPosts = async () => {
    if (!user) return;
    setPostsLoading(true);

    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          id,
          title,
          content,
          created_at,
          views,
          best_answer_id,
          tags,
          category:community_categories(name_ko, color)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get likes and comments count for each post
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase
              .from("community_post_likes")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
            supabase
              .from("community_comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
          ]);

          return {
            ...post,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          };
        })
      );

      setPosts(postsWithCounts);
    } catch (error) {
      console.error("Error loading my posts:", error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadMyComments = async () => {
    if (!user) return;
    setCommentsLoading(true);

    try {
      const { data, error } = await supabase
        .from("community_comments")
        .select(`
          id,
          content,
          created_at,
          post_id,
          community_posts!community_comments_post_id_fkey(
            title,
            best_answer_id
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedComments: CommunityComment[] = (data || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        post_id: c.post_id,
        post_title: c.community_posts?.title || "삭제된 게시글",
        is_best_answer: c.community_posts?.best_answer_id === c.id,
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error("Error loading my comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("게시글이 삭제되었습니다");
      loadMyPosts();
    } catch (error: any) {
      toast.error("게시글 삭제에 실패했습니다");
      console.error("Error deleting post:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("community_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("댓글이 삭제되었습니다");
      loadMyComments();
    } catch (error: any) {
      toast.error("댓글 삭제에 실패했습니다");
      console.error("Error deleting comment:", error);
    }
  };

  const paginatedPosts = posts.slice(
    (postsPage - 1) * postsPerPage,
    postsPage * postsPerPage
  );
  const totalPostsPages = Math.ceil(posts.length / postsPerPage);

  const paginatedComments = comments.slice(
    (commentsPage - 1) * commentsPerPage,
    commentsPage * commentsPerPage
  );
  const totalCommentsPages = Math.ceil(comments.length / commentsPerPage);

  return (
    <div className="space-y-8">
      {/* My Posts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="text-xl font-semibold">내가 작성한 질문</h3>
            <span className="text-muted-foreground">({posts.length})</span>
          </div>
          <Button onClick={() => navigate("/community/create")} size="sm">
            새 질문 작성
          </Button>
        </div>

        {postsLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">작성한 질문이 없습니다</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/community/create")}
              >
                첫 질문 작성하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedPosts.map((post) => {
                const isSolved = !!post.best_answer_id;

                return (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/community/${post.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Status Box */}
                        <div
                          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border-2 flex-shrink-0 ${
                            isSolved
                              ? "border-green-500 bg-green-500/10"
                              : post.comments_count > 0
                              ? "border-primary bg-primary/10"
                              : "border-muted-foreground/30 bg-muted/50"
                          }`}
                        >
                          {isSolved ? (
                            <div className="flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="text-sm font-bold text-green-500">
                                {post.comments_count}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`text-lg font-bold ${
                                post.comments_count > 0
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {post.comments_count}
                            </span>
                          )}
                          <span
                            className={`text-xs ${
                              isSolved
                                ? "text-green-500"
                                : post.comments_count > 0
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isSolved ? "해결" : "답변"}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {post.category && (
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: `${post.category.color}20`,
                                  color: post.category.color,
                                }}
                                className="text-xs"
                              >
                                {post.category.name_ko}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium truncate">{post.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {stripHtml(post.content)}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {post.views}
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {post.likes_count}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/community/edit/${post.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePost(post.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Posts Pagination */}
            {totalPostsPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPostsPage((p) => Math.max(1, p - 1))}
                  disabled={postsPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {postsPage} / {totalPostsPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPostsPage((p) => Math.min(totalPostsPages, p + 1))}
                  disabled={postsPage === totalPostsPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* My Comments Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-xl font-semibold">내가 작성한 답변</h3>
          <span className="text-muted-foreground">({comments.length})</span>
        </div>

        {commentsLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </CardContent>
          </Card>
        ) : comments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">작성한 답변이 없습니다</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/community")}
              >
                커뮤니티 둘러보기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedComments.map((comment) => (
                <Card
                  key={comment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/community/${comment.post_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {comment.is_best_answer && (
                            <Badge className="bg-green-500 text-white text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              채택됨
                            </Badge>
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {comment.post_title}
                          </p>
                        </div>
                        <p className="text-sm line-clamp-2">{stripHtml(comment.content)}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>답변 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                이 답변을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteComment(comment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comments Pagination */}
            {totalCommentsPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCommentsPage((p) => Math.max(1, p - 1))}
                  disabled={commentsPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {commentsPage} / {totalCommentsPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCommentsPage((p) => Math.min(totalCommentsPages, p + 1))}
                  disabled={commentsPage === totalCommentsPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
