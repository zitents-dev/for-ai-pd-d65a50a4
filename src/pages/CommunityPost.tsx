import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { BackToTopButton } from "@/components/BackToTopButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Eye,
  Clock,
  User,
  Trash2,
  Edit,
  MoreVertical,
  Upload,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
  name_ko: string;
  color: string;
}

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

  // Edit post state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
        description: "댓글을 작성하려면 로그인이 필요합니다.",
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
        description: "댓글 작성에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    setNewComment("");
    loadComments();
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("community_categories")
      .select("*")
      .order("created_at");

    if (!error && data) {
      setCategories(data);
    }
  };

  const openEditDialog = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category_id || "");
    setEditImage(null);
    setEditImagePreview(post.image_url);
    setRemoveExistingImage(false);
    loadCategories();
    setIsEditDialogOpen(true);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "이미지는 5MB 이하만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }
      setEditImage(file);
      setEditImagePreview(URL.createObjectURL(file));
      setRemoveExistingImage(false);
    }
  };

  const removeEditImage = () => {
    if (editImage) {
      URL.revokeObjectURL(editImagePreview || "");
    }
    setEditImage(null);
    setEditImagePreview(null);
    setRemoveExistingImage(true);
  };

  const handleUpdatePost = async () => {
    if (!user || !post) return;

    if (!editTitle.trim() || !editContent.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    let imageUrl: string | null = post.image_url;

    // Upload new image if selected
    if (editImage) {
      const fileExt = editImage.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(fileName, editImage);

      if (uploadError) {
        toast({
          title: "이미지 업로드 실패",
          description: "이미지 업로드에 실패했습니다.",
          variant: "destructive",
        });
        setIsUpdating(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("community-images")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    } else if (removeExistingImage) {
      imageUrl = null;
    }

    const { error } = await supabase
      .from("community_posts")
      .update({
        title: editTitle.trim(),
        content: editContent.trim(),
        category_id: editCategory || null,
        image_url: imageUrl,
      })
      .eq("id", id);

    setIsUpdating(false);

    if (error) {
      toast({
        title: "오류",
        description: "게시글 수정에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "성공",
      description: "게시글이 수정되었습니다.",
    });

    setIsEditDialogOpen(false);
    loadPost();
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
        description: "댓글 삭제에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    loadComments();
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
          {post.category && (
            <Badge
              variant="secondary"
              className="mb-3"
              style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
            >
              {post.category.name_ko}
            </Badge>
          )}
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
                  <DropdownMenuItem onClick={openEditDialog}>
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
        <div className="prose dark:prose-invert max-w-none mb-8">
          <p className="whitespace-pre-wrap">{post.content}</p>
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post image"
              className="mt-4 rounded-lg max-w-full h-auto"
            />
          )}
        </div>

        {/* Like Button */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            onClick={handleLike}
          >
            <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            좋아요 {likesCount}
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Comments Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            댓글 {comments.length}
          </h2>

          {/* Comment Input */}
          <div className="mb-6">
            <Textarea
              placeholder={user ? "댓글을 입력하세요..." : "댓글을 작성하려면 로그인이 필요합니다."}
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
                {isSubmittingComment ? "작성 중..." : "댓글 작성"}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
              </p>
            ) : (
              comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
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
                          {user?.id === comment.user_id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    정말로 이 댓글을 삭제하시겠습니까?
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
                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <BackToTopButton />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>게시글 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(cat => cat.name !== "all").map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="제목을 입력하세요"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Textarea
              placeholder="내용을 입력하세요"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
            />
            
            {/* Image Upload */}
            <div>
              {editImagePreview ? (
                <div className="relative">
                  <img
                    src={editImagePreview}
                    alt="Preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeEditImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">이미지 첨부 (선택사항)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditImageSelect}
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleUpdatePost} disabled={isUpdating}>
                {isUpdating ? "수정 중..." : "수정하기"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityPost;
