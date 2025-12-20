import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload as UploadIcon, Image as ImageIcon, X } from "lucide-react";
import { ImageCropDialog } from "@/components/ImageCropDialog";

export default function Upload() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [promptCommand, setPromptCommand] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [aiSolution, setAiSolution] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleVideoSelect = (file: File) => {
    // Clean up previous preview URL
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    
    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    
    // Extract video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setVideoDuration(Math.round(video.duration));
    };
    video.src = objectUrl;
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
  };

  const handleThumbnailSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedThumbnail = (croppedBlob: Blob) => {
    setThumbnailBlob(croppedBlob);
    setThumbnailPreview(URL.createObjectURL(croppedBlob));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !user) return;

    setUploading(true);

    try {
      // Upload video
      const videoPath = `${user.id}/${Date.now()}-${videoFile.name}`;
      const { error: videoError } = await supabase.storage.from("videos").upload(videoPath, videoFile);

      if (videoError) throw videoError;

      const {
        data: { publicUrl: videoUrl },
      } = supabase.storage.from("videos").getPublicUrl(videoPath);

      // Upload thumbnail if provided
      let thumbnailUrl = "";
      if (thumbnailBlob) {
        const thumbPath = `${user.id}/${Date.now()}-thumbnail.jpg`;
        const { error: thumbError } = await supabase.storage
          .from("thumbnails")
          .upload(thumbPath, thumbnailBlob, { contentType: "image/jpeg" });

        if (thumbError) throw thumbError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("thumbnails").getPublicUrl(thumbPath);

        thumbnailUrl = publicUrl;
      }

      // Use the extracted video duration
      const duration = videoDuration || 0;

      // Create video record
      const { error: dbError } = await supabase.from("videos").insert({
        creator_id: user.id,
        title,
        description,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        prompt_command: promptCommand || null,
        show_prompt: showPrompt,
        ai_solution: (aiSolution as any) || null,
        category: (category as any) || null,
      } as any);

      if (dbError) throw dbError;

      toast.success("Video uploaded successfully!");
      navigate("/my-page");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container px-4 py-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">업로드 파일</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="video">동영상 파일 *(필수)</Label>
                {!videoPreviewUrl ? (
                  <>
                    <Input
                      id="video"
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoSelect(file);
                      }}
                      required
                    />
                    <p className="text-sm text-muted-foreground">최대 3분, 포맷: MP4</p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full max-h-[300px] object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleRemoveVideo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{videoFile?.name}</span>
                      {videoDuration !== null && (
                        <span className="bg-muted px-2 py-1 rounded">
                          {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">썸네일 (선택)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleThumbnailSelect(file);
                      e.target.value = "";
                    }}
                    className="flex-1"
                  />
                  {thumbnailPreview && (
                    <div className="relative h-16 w-28 rounded-md overflow-hidden border border-border">
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">제목 *(필수)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your video a title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">태그</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="comedy, music, tutorial (comma separated)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *(필수)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="fiction">Fiction</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_solution">AI 솔루션 *(필수)</Label>
                <Select value={aiSolution} onValueChange={setAiSolution}>
                  <SelectTrigger id="ai_solution">
                    <SelectValue placeholder="사용한 AI 솔루션 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NanoBanana">NanoBanana</SelectItem>
                    <SelectItem value="Veo">Veo</SelectItem>
                    <SelectItem value="Sora">Sora</SelectItem>
                    <SelectItem value="Runway">Runway</SelectItem>
                    <SelectItem value="Pika">Pika</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">프롬프트 명령어 (선택)</Label>
                <Textarea
                  id="prompt"
                  value={promptCommand}
                  onChange={(e) => setPromptCommand(e.target.value)}
                  placeholder="AI 영상 생성에 사용한 프롬프트를 입력하세요"
                  rows={3}
                />
                <div className="flex items-center space-x-2">
                  <Switch id="show-prompt" checked={showPrompt} onCheckedChange={setShowPrompt} />
                  <Label htmlFor="show-prompt" className="font-normal">
                    다른 사용자에게 프롬프트 공개
                  </Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={uploading || !videoFile || !category || !aiSolution}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    작품 업로드
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={cropImageSrc}
        aspectRatio={16 / 9}
        onCropComplete={handleCroppedThumbnail}
        title="썸네일 이미지 편집"
      />
    </div>
  );
}
