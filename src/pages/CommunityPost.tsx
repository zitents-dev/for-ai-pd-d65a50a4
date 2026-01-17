import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { BackToTopButton } from "@/components/BackToTopButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Eye,
  Clock,
  User,
  Trash2,
  Edit,
  MoreVertical,
  CheckCircle,
  Award,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  views: number;
  created_at: string;
  category_id: string;
  user_id: string;
  best_answer_id: string | null;
  profile: {
    id: string;
    name: string;
    avatar_url: string;
  };
  category: {
    name_ko: string;
    color: string;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profile: {
    id: string;
    name: string;
    avatar_url: string;
  };
}

const CommunityPost = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost();
      loadComments();
      incrementViews();
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      checkIfLiked();
    }
  }, [id, user]);

  const loadPost = async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select(`
        *,
        profile:profiles!community_posts_user_id_fkey(id, name, avatar_url),
        category:community_categories(name_ko, color)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading post:", error);
      navigate("/community");
      return;
    }

    setPost(data);

    // Get likes count
    const { count } = await supabase
      .from("community_post_likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", id);

    setLikesCount(count || 0);
    setLoading(false);
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("community_comments")
      .select(`
        *,
        profile:profiles!community_comments_user_id_fkey(id, name, avatar_url)
      `)
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(data);
    }
  };

  const incrementViews = async () => {
    if (!id) return;
    
    // Get current views and increment
    const { data: currentPost } = await supabase
      .from("community_posts")
      .select("views")
      .eq("id", id)
      .single();

    if (currentPost) {
      await supabase
        .from("community_posts")
        .update({ views: (currentPost.views || 0) + 1 })
        .eq("id", id);
    }
  };

  const checkIfLiked = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("community_post_likes")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsLiked(!!data);
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "좋아요를 누르려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    if (isLiked) {
      await supabase
        .from("community_post_likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.id);
      setIsLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      await supabase.from("community_post_likes").insert({
        post_id: id,
        user_id: user.id,
      });
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "답변을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmittingComment(true);

    const { error } = await supabase.from("community_comments").insert({
      post_id: id,
      user_id: user.id,
      content: newComment.trim(),
    });

    setIsSubmittingComment(false);

    if (error) {
      toast({
        title: "오류",
        description: "답변 작성에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    setNewComment("");
    loadComments();
  };

  const handleDeletePost = async () => {
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "오류",
        description: "게시글 삭제에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "삭제 완료",
      description: "게시글이 삭제되었습니다.",
    });
    navigate("/community");
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast({
        title: "오류",
        description: "답변 삭제에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    // If this was the best answer, clear it
    if (post?.best_answer_id === commentId) {
      await supabase
        .from("community_posts")
        .update({ best_answer_id: null })
        .eq("id", id);
      setPost(prev => prev ? { ...prev, best_answer_id: null } : null);
    }

    loadComments();
  };

  const handleSelectBestAnswer = async (commentId: string) => {
    if (!user || user.id !== post?.user_id) return;

    const { error } = await supabase
      .from("community_posts")
      .update({ best_answer_id: commentId })
      .eq("id", id);

    if (error) {
      toast({
        title: "오류",
        description: "채택에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    setPost(prev => prev ? { ...prev, best_answer_id: commentId } : null);
    toast({
      title: "채택 완료",
      description: "답변이 채택되었습니다.",
    });
  };

  const handleUnselectBestAnswer = async () => {
    if (!user || user.id !== post?.user_id) return;

    const { error } = await supabase
      .from("community_posts")
      .update({ best_answer_id: null })
      .eq("id", id);

    if (error) {
      toast({
        title: "오류",
        description: "채택 취소에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    setPost(prev => prev ? { ...prev, best_answer_id: null } : null);
    toast({
      title: "채택 취소",
      description: "답변 채택이 취소되었습니다.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ScrollProgressBar />
        <Navbar />
        <div className="container py-8 max-w-3xl">
          <Skeleton className="h-8 w-24 mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8 text-center">
          <p>게시글을 찾을 수 없습니다.</p>
          <Button asChild className="mt-4">
            <Link to="/community">커뮤니티로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Sort comments to show best answer first
  const sortedComments = [...comments].sort((a, b) => {
    if (a.id === post.best_answer_id) return -1;
    if (b.id === post.best_answer_id) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <Navbar />

      <div className="container py-8 max-w-3xl">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/community")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          목록으로
        </Button>

        {/* Post Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            {post.category && (
              <Badge
                variant="secondary"
                style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
              >
                {post.category.name_ko}
              </Badge>
            )}
            {post.best_answer_id && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                해결됨
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.profile?.avatar_url || ""} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Link
                  to={`/profile/${post.profile?.id}`}
                  className="font-medium hover:underline"
                >
                  {post.profile?.name || "익명"}
                </Link>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.views}
                  </span>
                </div>
              </div>
            </div>

            {user?.id === post.user_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/community/${id}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePost}>삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Post Content */}
        <div 
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none mb-8 
            prose-headings:font-semibold prose-headings:text-foreground
            prose-p:text-foreground prose-p:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-em:text-foreground
            prose-ul:text-foreground prose-ol:text-foreground
            prose-li:text-foreground prose-li:marker:text-muted-foreground
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:not-italic
            prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="mb-8 rounded-lg max-w-full h-auto"
          />
        )}

        {/* Like Button */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            onClick={handleLike}
          >
            <ThumbsUp className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            좋아요 {likesCount}
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Answers Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            답변 {comments.length}
          </h2>

          {/* Answer Input */}
          <div className="mb-6">
            <Textarea
              placeholder={user ? "답변을 입력하세요..." : "답변을 작성하려면 로그인이 필요합니다."}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              disabled={!user}
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSubmitComment}
                disabled={!user || !newComment.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? "작성 중..." : "답변 작성"}
              </Button>
            </div>
          </div>

          {/* Answers List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                아직 답변이 없습니다. 첫 번째 답변을 작성해보세요!
              </p>
            ) : (
              sortedComments.map((comment) => {
                const isBestAnswer = comment.id === post.best_answer_id;
                
                return (
                  <Card 
                    key={comment.id} 
                    className={isBestAnswer ? "border-green-500 border-2 bg-green-500/5" : ""}
                  >
                    <CardContent className="p-4">
                      {isBestAnswer && (
                        <div className="flex items-center gap-2 text-green-500 mb-3 pb-3 border-b border-green-500/30">
                          <Award className="w-5 h-5" />
                          <span className="font-semibold">채택된 답변</span>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.profile?.avatar_url || ""} />
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/profile/${comment.profile?.id}`}
                                className="font-medium text-sm hover:underline"
                              >
                                {comment.profile?.name || "익명"}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), {
                                  addSuffix: true,
                                  locale: ko,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Best Answer Button - Only for post author */}
                              {user?.id === post.user_id && (
                                isBestAnswer ? (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-green-500 hover:text-green-600"
                                    onClick={() => handleUnselectBestAnswer()}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    채택 취소
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7"
                                    onClick={() => handleSelectBestAnswer(comment.id)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    채택
                                  </Button>
                                )
                              )}
                              {user?.id === comment.user_id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>답변 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        정말로 이 답변을 삭제하시겠습니까?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>
                                        삭제
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      <BackToTopButton />
    </div>
  );
};

export default CommunityPost;