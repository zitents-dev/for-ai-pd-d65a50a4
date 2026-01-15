import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Upload as UploadIcon,
  X,
  Clock,
  HardDrive,
  AlertTriangle,
  Camera,
  RefreshCw,
  WifiOff,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { CategorySelect } from "@/components/CategorySelect";
import { AiSolutionSelect } from "@/components/AiSolutionSelect";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { Progress } from "@/components/ui/progress";
import { useResumableUpload } from "@/hooks/useResumableUpload";

// Maximum file size: 500MB, Maximum duration: 3 minutes
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_DURATION_SECONDS = 180;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
// Use resumable upload for files larger than 50MB
const RESUMABLE_THRESHOLD = 50 * 1024 * 1024;

const isNetworkError = (error: any): boolean => {
  if (!navigator.onLine) return true;
  if (error?.message?.toLowerCase().includes('network')) return true;
  if (error?.message?.toLowerCase().includes('failed to fetch')) return true;
  if (error?.message?.toLowerCase().includes('timeout')) return true;
  if (error?.message?.toLowerCase().includes('abort')) return true;
  return false;
};

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  }
  return bytes + " bytes";
};


export default function Upload() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [promptCommand, setPromptCommand] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [aiSolution, setAiSolution] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  // Retry state
  const [retryCount, setRetryCount] = useState(0);
  const [uploadError, setUploadError] = useState<{ message: string; isNetworkError: boolean } | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Resumable upload hook
  const {
    uploading: resumableUploading,
    progress: resumableProgress,
    bytesUploaded,
    bytesTotal,
    isPaused,
    canResume,
    resumableState,
    startUpload: startResumableUpload,
    resumeUpload,
    pauseUpload,
    cancelUpload: cancelResumableUpload,
    clearResumableUpload,
  } = useResumableUpload();

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");

  // Determine if we should use resumable upload
  const useResumable = videoFile && videoFile.size >= RESUMABLE_THRESHOLD;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleVideoSelect = (file: File) => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `파일 크기가 너무 큽니다. 최대 ${formatFileSize(MAX_FILE_SIZE)}까지 업로드 가능합니다. (현재: ${formatFileSize(file.size)})`,
      );
      return;
    }

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
      const duration = Math.round(video.duration);
      setVideoDuration(duration);

      // Show warning toast if duration exceeds limit
      if (duration > MAX_DURATION_SECONDS) {
        toast.warning(
          `동영상 길이가 ${Math.floor(MAX_DURATION_SECONDS / 60)}분을 초과합니다. (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}) 업로드 전 편집이 필요합니다.`,
          { duration: 5000 },
        );
      }
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("video/")) {
        handleVideoSelect(file);
      } else {
        toast.error("동영상 파일만 업로드할 수 있습니다.");
      }
    }
  };

  const handleThumbnailSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current) {
      toast.error("동영상을 먼저 선택해주세요.");
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("프레임을 캡처할 수 없습니다.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL and open crop dialog
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCropImageSrc(dataUrl);
    setCropDialogOpen(true);

    toast.success("현재 프레임이 캡처되었습니다.");
  };

  const handleCroppedThumbnail = (croppedBlob: Blob) => {
    setThumbnailBlob(croppedBlob);
    setThumbnailPreview(URL.createObjectURL(croppedBlob));
  };

  const uploadVideoWithRetry = useCallback(async (
    file: File,
    videoPath: string,
    accessToken: string,
    attempt: number = 1
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        xhrRef.current = null;
        reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
      });

      xhr.addEventListener("abort", () => {
        xhrRef.current = null;
        reject(new Error("업로드가 취소되었습니다."));
      });

      xhr.addEventListener("timeout", () => {
        xhrRef.current = null;
        reject(new Error("업로드 시간이 초과되었습니다."));
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      xhr.open("POST", `${supabaseUrl}/storage/v1/object/videos/${videoPath}`);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.timeout = 300000; // 5 minute timeout
      xhr.send(file);
    });
  }, []);

  const finishUpload = useCallback(async (videoPath: string) => {
    if (!user) return;

    try {
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
      setRetryCount(0);
      setUploadError(null);
      navigate("/my-page");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }, [user, thumbnailBlob, videoDuration, title, description, tags, promptCommand, showPrompt, aiSolution, category, navigate]);

  const performUpload = useCallback(async (isRetry: boolean = false) => {
    if (!videoFile || !user) return;

    // Validate duration before upload
    if (videoDuration && videoDuration > MAX_DURATION_SECONDS) {
      toast.error(`동영상 길이가 너무 깁니다. 최대 ${Math.floor(MAX_DURATION_SECONDS / 60)}분까지 업로드 가능합니다.`);
      return;
    }

    const shouldUseResumable = videoFile.size >= RESUMABLE_THRESHOLD;

    if (shouldUseResumable) {
      // Use resumable upload for large files
      try {
        toast.info("대용량 파일입니다. 재개 가능한 업로드를 사용합니다.");
        const videoPath = await startResumableUpload(videoFile, user.id);
        await finishUpload(videoPath);
      } catch (error: any) {
        const networkErr = isNetworkError(error);
        setUploadError({
          message: error.message || "업로드에 실패했습니다.",
          isNetworkError: networkErr,
        });
        
        if (networkErr) {
          toast.error("네트워크 연결을 확인하고 다시 시도해주세요. 업로드는 중단된 지점부터 재개할 수 있습니다.");
        } else {
          toast.error(error.message);
        }
      }
      return;
    }

    // Use standard upload for smaller files
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const currentAttempt = isRetry ? retryCount + 1 : 1;
    if (isRetry) {
      setRetryCount(currentAttempt);
      toast.info(`재시도 중... (${currentAttempt}/${MAX_RETRY_ATTEMPTS})`);
    } else {
      setRetryCount(0);
    }

    try {
      // Get user's access token for authenticated upload
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
      }

      // Upload video with progress tracking
      const videoPath = `${user.id}/${Date.now()}-${videoFile.name}`;

      try {
        await uploadVideoWithRetry(videoFile, videoPath, accessToken, currentAttempt);
      } catch (uploadError: any) {
        // Check if it's a network error and we can auto-retry
        if (isNetworkError(uploadError) && currentAttempt < MAX_RETRY_ATTEMPTS) {
          setUploading(false);
          toast.warning(`네트워크 오류 발생. ${RETRY_DELAY_MS / 1000}초 후 자동으로 재시도합니다...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          return performUpload(true);
        }
        throw uploadError;
      }

      await finishUpload(videoPath);
    } catch (error: any) {
      const networkErr = isNetworkError(error);
      setUploadError({
        message: error.message || "업로드에 실패했습니다.",
        isNetworkError: networkErr,
      });
      
      if (networkErr) {
        toast.error("네트워크 연결을 확인하고 다시 시도해주세요.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setUploading(false);
    }
  }, [videoFile, user, videoDuration, retryCount, finishUpload, startResumableUpload, uploadVideoWithRetry]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    await performUpload(false);
  };

  const handleRetry = () => {
    performUpload(true);
  };

  const handleResumeUpload = async () => {
    if (!videoFile || !resumableState) {
      toast.error("재개할 파일을 선택해주세요.");
      return;
    }
    
    try {
      const videoPath = await resumeUpload(videoFile);
      await finishUpload(videoPath);
    } catch (error: any) {
      const networkErr = isNetworkError(error);
      setUploadError({
        message: error.message || "업로드 재개에 실패했습니다.",
        isNetworkError: networkErr,
      });
      toast.error(error.message);
    }
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (resumableUploading) {
      cancelResumableUpload();
    }
    setUploading(false);
    setUploadProgress(0);
    toast.info("업로드가 취소되었습니다.");
  };

  const handlePauseUpload = () => {
    pauseUpload();
    toast.info("업로드가 일시 정지되었습니다. 언제든지 재개할 수 있습니다.");
  };

  // Computed states
  const isUploading = uploading || resumableUploading;
  const currentProgress = resumableUploading ? resumableProgress : uploadProgress;

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
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div
                        className={`p-3 rounded-full transition-colors ${isDragging ? "bg-primary/10" : "bg-muted"}`}
                      >
                        <UploadIcon className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {isDragging ? "여기에 파일을 놓으세요" : "동영상을 드래그하거나 클릭하여 업로드"}
                        </p>
                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3.5 w-3.5" />
                            최대 {formatFileSize(MAX_FILE_SIZE)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            최대 {Math.floor(MAX_DURATION_SECONDS / 60)}분
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">포맷: MP4, MOV, AVI</p>
                      </div>
                      <Input
                        id="video"
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoSelect(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                      <video
                        ref={videoRef}
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
                      <span className="truncate max-w-[200px]">{videoFile?.name}</span>
                      {videoDuration !== null && (
                        <span
                          className={`px-2 py-1 rounded flex items-center gap-1 ${
                            videoDuration > MAX_DURATION_SECONDS ? "bg-destructive/10 text-destructive" : "bg-muted"
                          }`}
                        >
                          {videoDuration > MAX_DURATION_SECONDS && <AlertTriangle className="h-3.5 w-3.5" />}
                          {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    {videoDuration !== null && videoDuration > MAX_DURATION_SECONDS && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>
                          동영상 길이가 최대 허용 시간({Math.floor(MAX_DURATION_SECONDS / 60)}분)을 초과합니다.
                          업로드하려면 동영상을 편집해 주세요.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">썸네일 (선택)</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
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
                    {videoPreviewUrl && (
                      <Button type="button" variant="outline" onClick={handleCaptureFrame} className="flex-shrink-0">
                        <Camera className="mr-2 h-4 w-4" />
                        프레임 캡처
                      </Button>
                    )}
                  </div>
                  {videoPreviewUrl && !thumbnailPreview && (
                    <p className="text-xs text-muted-foreground">
                      동영상을 원하는 장면에서 일시정지한 후 "프레임 캡처" 버튼을 클릭하세요.
                    </p>
                  )}
                  {thumbnailPreview && (
                    <div className="flex items-center gap-3">
                      <div className="relative h-20 w-36 rounded-md overflow-hidden border border-border">
                        <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => {
                            setThumbnailBlob(null);
                            setThumbnailPreview(null);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm text-muted-foreground">썸네일이 설정되었습니다.</span>
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

              <CategorySelect
                value={category}
                onValueChange={setCategory}
                required
              />

              <AiSolutionSelect
                value={aiSolution}
                onValueChange={setAiSolution}
                required
                placeholder="사용한 AI 솔루션 선택"
              />

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

              {/* Resumable Upload Notice */}
              {canResume && resumableState && !isUploading && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <RotateCcw className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-600">
                      이전 업로드를 재개할 수 있습니다
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {resumableState.fileName} - {formatFileSize(resumableState.bytesUploaded)} / {formatFileSize(resumableState.fileSize)} 완료
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResumeUpload}
                      disabled={!videoFile}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      재개
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearResumableUpload}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload Error with Retry */}
              {uploadError && !isUploading && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <WifiOff className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-destructive">
                      {uploadError.isNetworkError ? "네트워크 오류" : "업로드 실패"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {uploadError.message}
                    </p>
                    {canResume && (
                      <p className="text-xs text-amber-600 mt-1">
                        업로드를 재개할 수 있습니다. 같은 파일을 선택하고 재개 버튼을 클릭하세요.
                      </p>
                    )}
                  </div>
                  {!canResume && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      className="flex-shrink-0"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      재시도
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    isUploading ||
                    !videoFile ||
                    !category ||
                    !aiSolution ||
                    (videoDuration !== null && videoDuration > MAX_DURATION_SECONDS)
                  }
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2 w-full">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>업로드 중... {currentProgress}%</span>
                    </div>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-4 w-4" />
                      작품 업로드
                    </>
                  )}
                </Button>

                {isUploading && (
                  <>
                    {useResumable && !isPaused && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePauseUpload}
                        className="flex-shrink-0"
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        일시정지
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelUpload}
                      className="flex-shrink-0"
                    >
                      <X className="mr-2 h-4 w-4" />
                      취소
                    </Button>
                  </>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={currentProgress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {retryCount > 0 && (
                        <span className="text-amber-600 mr-2">재시도 {retryCount}/{MAX_RETRY_ATTEMPTS}</span>
                      )}
                      {currentProgress < 100 ? "동영상 업로드 중..." : "처리 중..."}
                    </span>
                    {resumableUploading && bytesTotal > 0 && (
                      <span>
                        {formatFileSize(bytesUploaded)} / {formatFileSize(bytesTotal)}
                      </span>
                    )}
                  </div>
                  {useResumable && (
                    <p className="text-xs text-center text-muted-foreground">
                      💡 대용량 파일입니다. 연결이 끊겨도 재개할 수 있습니다.
                    </p>
                  )}
                </div>
              )}
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
