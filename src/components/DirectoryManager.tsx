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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Folder, Plus, Trash2, X, ChevronLeft, ChevronRight, FolderInput } from "lucide-react";
import { VideoCard } from "./VideoCard";
import { Badge } from "@/components/ui/badge";

interface Directory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  video_count?: number;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url?: string;
  duration: number;
  views: number;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

interface DirectoryManagerProps {
  itemsPerPage?: number;
}

export const DirectoryManager = ({ itemsPerPage = 4 }: DirectoryManagerProps) => {
  const { user } = useAuth();
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [directoryVideos, setDirectoryVideos] = useState<Video[]>([]);
  const [newDirName, setNewDirName] = useState("");
  const [newDirDescription, setNewDirDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOverDirectory, setDragOverDirectory] = useState<string | null>(null);

  // Pagination states
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryVideosPage, setDirectoryVideosPage] = useState(1);

  // Delete agreement states
  const [deleteAgreed, setDeleteAgreed] = useState<Record<string, boolean>>({});
  const [videoRemoveAgreed, setVideoRemoveAgreed] = useState<Record<string, boolean>>({});

  // Bulk selection states
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [bulkRemoveDialogOpen, setBulkRemoveDialogOpen] = useState(false);
  const [bulkRemoveAgreed, setBulkRemoveAgreed] = useState(false);

  // Move to directory states
  const [bulkMoveDialogOpen, setBulkMoveDialogOpen] = useState(false);
  const [targetDirectoryId, setTargetDirectoryId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  useEffect(() => {
    loadDirectories();
  }, [user]);

  useEffect(() => {
    if (selectedDirectory) {
      loadDirectoryVideos(selectedDirectory);
      setSelectedVideos(new Set()); // Clear selection when directory changes
    }
  }, [selectedDirectory]);

  const loadDirectories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("directories")
        .select("*, directory_videos(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const directoriesWithCount = (data || []).map((dir: any) => ({
        ...dir,
        video_count: dir.directory_videos?.[0]?.count || 0,
      }));

      setDirectories(directoriesWithCount);
    } catch (error) {
      console.error("Error loading directories:", error);
    }
  };

  const loadDirectoryVideos = async (directoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("directory_videos")
        .select(
          `
          video_id,
          videos (
            id,
            title,
            thumbnail_url,
            video_url,
            duration,
            views,
            created_at,
            profiles (
              name,
              avatar_url
            )
          )
        `,
        )
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
    try {
      const { error } = await supabase.from("directories").delete().eq("id", directoryId);

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
      loadDirectories(); // Refresh to update video count
      loadDirectoryVideos(selectedDirectory);
    } catch (error) {
      console.error("Error removing video from directory:", error);
      toast.error("제거에 실패했습니다");
    }
  };

  const bulkRemoveVideosFromDirectory = async () => {
    if (!selectedDirectory || selectedVideos.size === 0) return;

    try {
      const videoIds = Array.from(selectedVideos);
      const { error } = await supabase
        .from("directory_videos")
        .delete()
        .in("video_id", videoIds)
        .eq("directory_id", selectedDirectory);

      if (error) throw error;

      toast.success(`${videoIds.length}개의 작품이 디렉토리에서 제거되었습니다`);
      setSelectedVideos(new Set());
      setBulkRemoveDialogOpen(false);
      setBulkRemoveAgreed(false);
      loadDirectories();
      loadDirectoryVideos(selectedDirectory);
    } catch (error) {
      console.error("Error bulk removing videos:", error);
      toast.error("제거에 실패했습니다");
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const handleSelectAllVideos = () => {
    const currentPageVideos = directoryVideos.slice(
      (directoryVideosPage - 1) * itemsPerPage,
      directoryVideosPage * itemsPerPage
    );
    const allSelected = currentPageVideos.every((v) => selectedVideos.has(v.id));

    if (allSelected) {
      const newSelected = new Set(selectedVideos);
      currentPageVideos.forEach((v) => newSelected.delete(v.id));
      setSelectedVideos(newSelected);
    } else {
      const newSelected = new Set(selectedVideos);
      currentPageVideos.forEach((v) => newSelected.add(v.id));
      setSelectedVideos(newSelected);
    }
  };

  const handleSelectAllDirectoryVideos = () => {
    const allSelected = directoryVideos.length > 0 && directoryVideos.every((v) => selectedVideos.has(v.id));

    if (allSelected) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(directoryVideos.map((v) => v.id)));
    }
  };

  const bulkMoveVideosToDirectory = async () => {
    if (!selectedDirectory || !targetDirectoryId || selectedVideos.size === 0) return;

    setIsMoving(true);

    try {
      const videoIds = Array.from(selectedVideos);
      
      // First, remove from current directory
      const { error: removeError } = await supabase
        .from("directory_videos")
        .delete()
        .in("video_id", videoIds)
        .eq("directory_id", selectedDirectory);

      if (removeError) throw removeError;

      // Then, add to target directory (skip duplicates)
      const insertData = videoIds.map((videoId) => ({
        video_id: videoId,
        directory_id: targetDirectoryId,
      }));

      // Use upsert to avoid duplicate key errors
      const { error: insertError } = await supabase
        .from("directory_videos")
        .upsert(insertData, { onConflict: "directory_id,video_id", ignoreDuplicates: true });

      if (insertError) throw insertError;

      const targetDirName = directories.find((d) => d.id === targetDirectoryId)?.name;
      toast.success(`${videoIds.length}개의 작품을 "${targetDirName}"(으)로 이동했습니다`);
      
      setSelectedVideos(new Set());
      setBulkMoveDialogOpen(false);
      setTargetDirectoryId(null);
      loadDirectories();
      loadDirectoryVideos(selectedDirectory);
    } catch (error) {
      console.error("Error moving videos:", error);
      toast.error("이동에 실패했습니다");
    } finally {
      setIsMoving(false);
    }
  };

  const handleDrop = async (directoryId: string, videoId: string, videoTitle: string) => {
    try {
      // Check if already in directory
      const { data: existing } = await supabase
        .from("directory_videos")
        .select("id")
        .eq("video_id", videoId)
        .eq("directory_id", directoryId)
        .maybeSingle();

      if (existing) {
        toast.info("이미 이 디렉토리에 있습니다");
        return;
      }

      const { error } = await supabase.from("directory_videos").insert({
        video_id: videoId,
        directory_id: directoryId,
      });

      if (error) throw error;

      const dirName = directories.find((d) => d.id === directoryId)?.name;
      toast.success(`"${videoTitle}"을(를) "${dirName}"에 추가했습니다`);

      // Refresh directories to update video count
      loadDirectories();

      if (selectedDirectory === directoryId) {
        loadDirectoryVideos(directoryId);
      }
    } catch (error) {
      console.error("Error adding video to directory:", error);
      toast.error("디렉토리에 추가하는데 실패했습니다");
    }
  };

  const handleDragOver = (e: React.DragEvent, directoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDirectory(directoryId);
  };

  const handleDragLeave = () => {
    setDragOverDirectory(null);
  };

  const handleDropOnDirectory = (e: React.DragEvent, directoryId: string) => {
    e.preventDefault();
    setDragOverDirectory(null);

    const videoId = e.dataTransfer.getData("videoId");
    const videoTitle = e.dataTransfer.getData("videoTitle");

    if (videoId) {
      handleDrop(directoryId, videoId, videoTitle);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>내 분류</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />새 디렉토리
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 디렉토리 만들기</DialogTitle>
                <DialogDescription>작품을 정리할 디렉토리를 만들어보세요</DialogDescription>
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
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {directories.slice((directoryPage - 1) * itemsPerPage, directoryPage * itemsPerPage).map((dir) => (
                  <div
                    key={dir.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dragOverDirectory === dir.id
                        ? "border-primary bg-primary/20 scale-105"
                        : selectedDirectory === dir.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedDirectory(dir.id)}
                    onDragOver={(e) => handleDragOver(e, dir.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropOnDirectory(e, dir.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Folder
                          className={`w-6 h-6 ${dragOverDirectory === dir.id ? "text-primary animate-pulse" : "text-primary"}`}
                        />
                        {dir.video_count !== undefined && dir.video_count > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 min-w-[20px] justify-center">
                            {dir.video_count}
                          </Badge>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>디렉토리 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{dir.name}" 디렉토리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex items-center space-x-2 py-4">
                            <Checkbox
                              id={`dir-delete-agree-${dir.id}`}
                              checked={deleteAgreed[dir.id] || false}
                              onCheckedChange={(checked) =>
                                setDeleteAgreed((prev) => ({ ...prev, [dir.id]: checked === true }))
                              }
                            />
                            <label
                              htmlFor={`dir-delete-agree-${dir.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              삭제에 동의합니다
                            </label>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => setDeleteAgreed((prev) => ({ ...prev, [dir.id]: false }))}
                            >
                              취소
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                deleteDirectory(dir.id);
                                setDeleteAgreed((prev) => ({ ...prev, [dir.id]: false }));
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={!deleteAgreed[dir.id]}
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <h3 className="font-semibold text-sm truncate">{dir.name}</h3>
                    {dir.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{dir.description}</p>
                    )}
                    {dragOverDirectory === dir.id && (
                      <p className="text-xs text-primary mt-2 font-medium">여기에 놓으세요</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Directory Pagination */}
              {directories.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDirectoryPage((prev) => Math.max(1, prev - 1))}
                    disabled={directoryPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(directories.length / itemsPerPage) }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={directoryPage === page ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDirectoryPage(page)}
                        >
                          {page}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setDirectoryPage((prev) => Math.min(Math.ceil(directories.length / itemsPerPage), prev + 1))
                    }
                    disabled={directoryPage === Math.ceil(directories.length / itemsPerPage)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedDirectory && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{directories.find((d) => d.id === selectedDirectory)?.name || "디렉토리"} 작품</CardTitle>
            {selectedVideos.size > 0 && (
              <div className="flex items-center gap-2">
                {/* Move to another directory button */}
                <Dialog open={bulkMoveDialogOpen} onOpenChange={setBulkMoveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <FolderInput className="mr-2 h-4 w-4" />
                      {selectedVideos.size}개 이동
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>다른 디렉토리로 이동</DialogTitle>
                      <DialogDescription>
                        선택한 {selectedVideos.size}개의 작품을 이동할 디렉토리를 선택하세요
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {directories
                          .filter((dir) => dir.id !== selectedDirectory)
                          .map((dir) => (
                            <div
                              key={dir.id}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                targetDirectoryId === dir.id
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => setTargetDirectoryId(dir.id)}
                            >
                              <div className="flex items-center gap-2">
                                <Folder className="w-5 h-5 text-primary" />
                                <span className="font-medium text-sm truncate">{dir.name}</span>
                              </div>
                              {dir.video_count !== undefined && dir.video_count > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">{dir.video_count}개 작품</p>
                              )}
                            </div>
                          ))}
                      </div>
                      {directories.filter((dir) => dir.id !== selectedDirectory).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          이동할 수 있는 다른 디렉토리가 없습니다
                        </p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBulkMoveDialogOpen(false);
                          setTargetDirectoryId(null);
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        onClick={bulkMoveVideosToDirectory}
                        disabled={!targetDirectoryId || isMoving}
                      >
                        {isMoving ? "이동 중..." : "이동하기"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog open={bulkRemoveDialogOpen} onOpenChange={setBulkRemoveDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {selectedVideos.size}개 제거
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>선택한 작품 제거</AlertDialogTitle>
                    <AlertDialogDescription>
                      선택한 {selectedVideos.size}개의 작품을 디렉토리에서 제거하시겠습니까?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex items-center space-x-2 py-4">
                    <Checkbox
                      id="bulk-remove-agree"
                      checked={bulkRemoveAgreed}
                      onCheckedChange={(checked) => setBulkRemoveAgreed(checked === true)}
                    />
                    <label
                      htmlFor="bulk-remove-agree"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      위 내용을 이해하고, 제거 합니다.
                    </label>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setBulkRemoveAgreed(false)}>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={bulkRemoveVideosFromDirectory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={!bulkRemoveAgreed}
                    >
                      제거하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {directoryVideos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">이 디렉토리에 아직 작품이 없습니다</p>
            ) : (
              <>
                {/* Selection Controls */}
                <div className="flex items-center gap-6 pb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-dir-videos"
                      checked={directoryVideos
                        .slice((directoryVideosPage - 1) * itemsPerPage, directoryVideosPage * itemsPerPage)
                        .every((v) => selectedVideos.has(v.id))}
                      onCheckedChange={handleSelectAllVideos}
                    />
                    <label htmlFor="select-all-dir-videos" className="text-sm font-medium leading-none cursor-pointer">
                      현재 페이지 전체 선택
                    </label>
                  </div>
                  {directoryVideos.length > itemsPerPage && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-dir-videos-all"
                        checked={directoryVideos.length > 0 && directoryVideos.every((v) => selectedVideos.has(v.id))}
                        onCheckedChange={handleSelectAllDirectoryVideos}
                      />
                      <label htmlFor="select-all-dir-videos-all" className="text-sm font-medium leading-none cursor-pointer">
                        모든 페이지 전체 선택 ({directoryVideos.length}개)
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {directoryVideos
                    .slice((directoryVideosPage - 1) * itemsPerPage, directoryVideosPage * itemsPerPage)
                    .map((video) => (
                      <div key={video.id} className="relative group">
                        {/* Selection Checkbox */}
                        <div 
                          className="absolute top-2 left-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedVideos.has(video.id)}
                            onCheckedChange={() => toggleVideoSelection(video.id)}
                            className="h-5 w-5 bg-background/80 backdrop-blur-sm border-2"
                          />
                        </div>
                        <VideoCard video={video} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>디렉토리에서 제거</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{video.title}"을(를) 디렉토리에서 제거하시겠습니까?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex items-center space-x-2 py-4">
                              <Checkbox
                                id={`video-remove-agree-${video.id}`}
                                checked={videoRemoveAgreed[video.id] || false}
                                onCheckedChange={(checked) =>
                                  setVideoRemoveAgreed((prev) => ({ ...prev, [video.id]: checked === true }))
                                }
                              />
                              <label
                                htmlFor={`video-remove-agree-${video.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                위 내용을 이해하고, 제거 합니다.
                              </label>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setVideoRemoveAgreed((prev) => ({ ...prev, [video.id]: false }))}
                              >
                                취소
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  removeVideoFromDirectory(video.id);
                                  setVideoRemoveAgreed((prev) => ({ ...prev, [video.id]: false }));
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={!videoRemoveAgreed[video.id]}
                              >
                                제거
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                </div>

                {/* Directory Videos Pagination */}
                {directoryVideos.length > itemsPerPage && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDirectoryVideosPage((prev) => Math.max(1, prev - 1))}
                      disabled={directoryVideosPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(directoryVideos.length / itemsPerPage) }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={directoryVideosPage === page ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDirectoryVideosPage(page)}
                          >
                            {page}
                          </Button>
                        ),
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setDirectoryVideosPage((prev) =>
                          Math.min(Math.ceil(directoryVideos.length / itemsPerPage), prev + 1),
                        )
                      }
                      disabled={directoryVideosPage === Math.ceil(directoryVideos.length / itemsPerPage)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
