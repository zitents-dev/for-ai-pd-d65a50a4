import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload as UploadIcon } from 'lucide-react';

export default function Upload() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [promptCommand, setPromptCommand] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [aiSolution, setAiSolution] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !user) return;

    setUploading(true);

    try {
      // Upload video
      const videoPath = `${user.id}/${Date.now()}-${videoFile.name}`;
      const { error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoPath, videoFile);

      if (videoError) throw videoError;

      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(videoPath);

      // Upload thumbnail if provided
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const thumbPath = `${user.id}/${Date.now()}-${thumbnailFile.name}`;
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbPath, thumbnailFile);

        if (thumbError) throw thumbError;

        const { data: { publicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbPath);
        
        thumbnailUrl = publicUrl;
      }

      // Get video duration (simplified - in production you'd use proper video metadata)
      const duration = 60; // placeholder

      // Create video record
      const { error: dbError } = await supabase
        .from('videos')
        .insert([{
          creator_id: user.id,
          title,
          description,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          duration,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          prompt_command: promptCommand || null,
          show_prompt: showPrompt,
          ai_solution: aiSolution as any || null,
          category: category as any || null,
        }]);

      if (dbError) throw dbError;

      toast.success('Video uploaded successfully!');
      navigate('/my-page');
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
                <Label htmlFor="video">Video File *</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  최대 3분, 포맷: MP4
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">썸네일 (Optional)</Label>
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
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
                <Label htmlFor="category">카테고리 *</Label>
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
                <Label htmlFor="ai_solution">AI 솔루션 *</Label>
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
                  <Switch
                    id="show-prompt"
                    checked={showPrompt}
                    onCheckedChange={setShowPrompt}
                  />
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
    </div>
  );
}
