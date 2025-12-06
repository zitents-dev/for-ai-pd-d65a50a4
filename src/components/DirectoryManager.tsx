import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Folder, Plus, Trash2, X } from "lucide-react";
import { VideoCard } from "./VideoCard";

interface Directory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  views: number;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export const DirectoryManager = () => {
  const { user } = useAuth();
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [directoryVideos, setDirectoryVideos] = useState<Video[]>([]);
  const [newDirName, setNewDirName] = useState("");
  const [newDirDescription, setNewDirDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDirectories();
  }, [user]);

  useEffect(() => {
    if (selectedDirectory) {
      loadDirectoryVideos(selectedDirectory);
    }
  }, [selectedDirectory]);

  const loadDirectories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("directories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDirectories(data || []);
    } catch (error) {
      console.error("Error loading directories:", error);
    }
  };

  const loadDirectoryVideos = async (directoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("directory_videos")
        .select(`
          video_id,
          videos (
            id,
            title,
            thumbnail_url,
            duration,
            views,
            created_at,
            profiles (
              name,
              avatar_url
            )
          )
        `)
        .eq("directory_id", directoryId);

      if (error) throw error;
      
      const videos = data?.map((item: any) => item.videos).filter(Boolean) || [];
      setDirectoryVideos(videos);
    } catch (error) {
      console.error("Error loading directory videos:", error);
    }
  };

  const createDirectory = async () => {
    if (!user || !newDirName.trim()) {
      toast.error("디렉토리 이름을 입력해주세요");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("directories").insert({
        user_id: user.id,
        name: newDirName.trim(),
        description: newDirDescription.trim() || null,
      });

      if (error) throw error;

      toast.success("디렉토리가 생성되었습니다");
      setNewDirName("");
      setNewDirDescription("");
      setOpen(false);
      loadDirectories();
    } catch (error: any) {
      console.error("Error creating directory:", error);
      if (error.code === "23505") {
        toast.error("이미 같은 이름의 디렉토리가 있습니다");
      } else {
        toast.error("디렉토리 생성에 실패했습니다");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteDirectory = async (directoryId: string) => {
    if (!confirm("정말 이 디렉토리를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("directories")
        .delete()
        .eq("id", directoryId);

      if (error) throw error;

      toast.success("디렉토리가 삭제되었습니다");
      if (selectedDirectory === directoryId) {
        setSelectedDirectory(null);
        setDirectoryVideos([]);
      }
      loadDirectories();
    } catch (error) {
      console.error("Error deleting directory:", error);
      toast.error("디렉토리 삭제에 실패했습니다");
    }
  };

  const removeVideoFromDirectory = async (videoId: string) => {
    if (!selectedDirectory) return;

    try {
      const { error } = await supabase
        .from("directory_videos")
        .delete()
        .eq("video_id", videoId)
        .eq("directory_id", selectedDirectory);

      if (error) throw error;

      toast.success("디렉토리에서 제거되었습니다");
      loadDirectoryVideos(selectedDirectory);
    } catch (error) {
      console.error("Error removing video from directory:", error);
      toast.error("제거에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>내 디렉토리</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                새 디렉토리
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 디렉토리 만들기</DialogTitle>
                <DialogDescription>
                  작품을 정리할 디렉토리를 만들어보세요
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">디렉토리 이름 *</Label>
                  <Input
                    id="name"
                    value={newDirName}
                    onChange={(e) => setNewDirName(e.target.value)}
                    placeholder="예: 교육용 영상"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명 (선택)</Label>
                  <Textarea
                    id="description"
                    value={newDirDescription}
                    onChange={(e) => setNewDirDescription(e.target.value)}
                    placeholder="디렉토리에 대한 설명"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  취소
                </Button>
                <Button onClick={createDirectory} disabled={loading || !newDirName.trim()}>
                  {loading ? "생성 중..." : "만들기"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {directories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              아직 디렉토리가 없습니다. 새 디렉토리를 만들어보세요!
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {directories.map((dir) => (
                <div
                  key={dir.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedDirectory === dir.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedDirectory(dir.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Folder className="w-6 h-6 text-primary" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDirectory(dir.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{dir.name}</h3>
                  {dir.description && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {dir.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDirectory && (
        <Card>
          <CardHeader>
            <CardTitle>
              {directories.find((d) => d.id === selectedDirectory)?.name || "디렉토리"} 작품
            </CardTitle>
          </CardHeader>
          <CardContent>
            {directoryVideos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                이 디렉토리에 아직 작품이 없습니다
              </p>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {directoryVideos.map((video) => (
                  <div key={video.id} className="relative group">
                    <VideoCard video={video} />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVideoFromDirectory(video.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};