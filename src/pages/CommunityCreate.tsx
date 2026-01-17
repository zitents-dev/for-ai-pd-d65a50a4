import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Upload, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  name_ko: string;
  description: string;
  icon: string;
  color: string;
}

const CommunityCreate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

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
    }
  };

  const removeImage = () => {
    setImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "게시글을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    let imageUrl: string | null = null;

    // Upload image if selected
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
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        category_id: category || null,
        image_url: imageUrl,
      })
      .select("id")
      .single();

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "오류",
        description: "게시글 작성에 실패했습니다.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "성공",
      description: "게시글이 작성되었습니다.",
    });

    // Navigate to the new post
    navigate(`/community/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <Navbar />

      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/community")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">새 질문 작성</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택 (선택사항)" />
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
              <label className="text-sm font-medium">이미지 첨부</label>
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
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">클릭하여 이미지 업로드 (최대 5MB)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => navigate("/community")}>
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "작성 중..." : "질문하기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <BackToTopButton />
    </div>
  );
};

export default CommunityCreate;
