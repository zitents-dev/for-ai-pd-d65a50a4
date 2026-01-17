import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { BackToTopButton } from "@/components/BackToTopButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";

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
  category_id: string;
  user_id: string;
}

const CommunityEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id) {
      loadPost();
      loadCategories();
    }
  }, [id]);

  const loadPost = async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("id, title, content, image_url, category_id, user_id")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast({
        title: "오류",
        description: "게시글을 찾을 수 없습니다.",
        variant: "destructive",
      });
      navigate("/community");
      return;
    }

    // Check if user owns this post
    if (user && data.user_id !== user.id) {
      toast({
        title: "권한 없음",
        description: "본인의 게시글만 수정할 수 있습니다.",
        variant: "destructive",
      });
      navigate(`/community/${id}`);
      return;
    }

    setPost(data);
    setTitle(data.title);
    setContent(data.content);
    setCategory(data.category_id || "");
    setImagePreview(data.image_url);
    setLoading(false);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveExistingImage(false);
    }
  };

  const removeImage = () => {
    if (image) {
      URL.revokeObjectURL(imagePreview || "");
    }
    setImage(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
  };

  const handleSubmit = async () => {
    if (!user || !post) return;

    if (!title.trim() || !content.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    let imageUrl: string | null = post.image_url;

    // Upload new image if selected
    if (image) {
      const fileExt = image.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(fileName, image);

      if (uploadError) {
        toast({
          title: "이미지 업로드 실패",
          description: "이미지 업로드에 실패했습니다.",
          variant: "destructive",
        });
        setIsSubmitting(false);
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
        title: title.trim(),
        content: content.trim(),
        category_id: category || null,
        image_url: imageUrl,
      })
      .eq("id", id);

    setIsSubmitting(false);

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

    navigate(`/community/${id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <Navbar />

      <div className="container py-8 w-full max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/community/${id}`)} 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>

        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-6">게시글 수정</h1>
            
            <div className="space-y-6">
              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">카테고리</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat.name !== "all").map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name_ko}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">제목 *</label>
                <Input
                  placeholder="제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <label className="text-sm font-medium">내용 *</label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="내용을 입력하세요..."
                />
              </div>
              
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">대표 이미지 (선택)</label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm">이미지 첨부 (선택사항)</span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-2">최대 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </label>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/community/${id}`)}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      수정 중...
                    </>
                  ) : (
                    "수정하기"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BackToTopButton />
    </div>
  );
};

export default CommunityEdit;
