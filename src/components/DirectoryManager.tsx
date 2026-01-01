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
import { Folder, Plus, Trash2, X, ChevronLeft, ChevronRight, FolderInput, Copy, Pencil, ArrowUpDown, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoCard } from "./VideoCard";
import { Badge } from "@/components/ui/badge";

// Predefined directory colors
const DIRECTORY_COLORS = [
  { name: "기본", value: null, bg: "bg-primary", text: "text-primary" },
  { name: "빨강", value: "red", bg: "bg-red-500", text: "text-red-500" },
  { name: "주황", value: "orange", bg: "bg-orange-500", text: "text-orange-500" },
  { name: "노랑", value: "yellow", bg: "bg-yellow-500", text: "text-yellow-500" },
  { name: "초록", value: "green", bg: "bg-green-500", text: "text-green-500" },
  { name: "파랑", value: "blue", bg: "bg-blue-500", text: "text-blue-500" },
  { name: "보라", value: "purple", bg: "bg-purple-500", text: "text-purple-500" },
  { name: "분홍", value: "pink", bg: "bg-pink-500", text: "text-pink-500" },
];

const getColorClasses = (color: string | null) => {
  const found = DIRECTORY_COLORS.find((c) => c.value === color);
  return found || DIRECTORY_COLORS[0];
};

interface Directory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  video_count?: number;
  color?: string | null;
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
  const [newDirColor, setNewDirColor] = useState<string | null>(null);
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

  // Copy to directory states
  const [bulkCopyDialogOpen, setBulkCopyDialogOpen] = useState(false);
  const [copyTargetDirectoryIds, setCopyTargetDirectoryIds] = useState<Set<string>>(new Set());
  const [isCopying, setIsCopying] = useState(false);

  // Rename directory states
  const [renameDialogOpen, setRenameDialogOpen] = useState<string | null>(null);
  const [renameDirName, setRenameDirName] = useState("");
  const [renameDirDescription, setRenameDirDescription] = useState("");
  const [renameDirColor, setRenameDirColor] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // Directory sorting state
  type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "count_desc" | "count_asc";
  const [directorySortBy, setDirectorySortBy] = useState<SortOption>("date_desc");

  // Directory search state
  const [directorySearchQuery, setDirectorySearchQuery] = useState("");

  // Filter and sort directories
  const filteredAndSortedDirectories = [...directories]
    .filter((dir) => 
      directorySearchQuery.trim() === "" || 
      dir.name.toLowerCase().includes(directorySearchQuery.toLowerCase()) ||
      (dir.description && dir.description.toLowerCase().includes(directorySearchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (directorySortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, "ko");
        case "name_desc":
          return b.name.localeCompare(a.name, "ko");
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "count_desc":
          return (b.video_count || 0) - (a.video_count || 0);
        case "count_asc":
          return (a.video_count || 0) - (b.video_count || 0);
        default:
          return 0;
      }
    });

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
        color: newDirColor,
      });

      if (error) throw error;

      toast.success("디렉토리가 생성되었습니다");
      setNewDirName("");
      setNewDirDescription("");
      setNewDirColor(null);
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

  const renameDirectory = async (directoryId: string) => {
    if (!renameDirName.trim()) {
      toast.error("디렉토리 이름을 입력해주세요");
      return;
    }

    setIsRenaming(true);

    try {
      const { error } = await supabase
        .from("directories")
        .update({
          name: renameDirName.trim(),
          description: renameDirDescription.trim() || null,
          color: renameDirColor,
        })
        .eq("id", directoryId);

      if (error) throw error;

      toast.success("디렉토리가 수정되었습니다");
      setRenameDialogOpen(null);
      setRenameDirName("");
      setRenameDirDescription("");
      setRenameDirColor(null);
      loadDirectories();
    } catch (error: any) {
      console.error("Error renaming directory:", error);
      if (error.code === "23505") {
        toast.error("이미 같은 이름의 디렉토리가 있습니다");
      } else {
        toast.error("디렉토리 수정에 실패했습니다");
      }
    } finally {
      setIsRenaming(false);
    }
  };

  const openRenameDialog = (dir: Directory) => {
    setRenameDirName(dir.name);
    setRenameDirDescription(dir.description || "");
    setRenameDirColor(dir.color || null);
    setRenameDialogOpen(dir.id);
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

  const bulkCopyVideosToDirectory = async () => {
    if (!selectedDirectory || copyTargetDirectoryIds.size === 0 || selectedVideos.size === 0) return;

    setIsCopying(true);

    try {
      const videoIds = Array.from(selectedVideos);
      const targetDirIds = Array.from(copyTargetDirectoryIds);
      
      // Create insert data for all video-directory combinations
      const insertData: { video_id: string; directory_id: string }[] = [];
      for (const dirId of targetDirIds) {
        for (const videoId of videoIds) {
          insertData.push({
            video_id: videoId,
            directory_id: dirId,
          });
        }
      }

      // Use upsert to avoid duplicate key errors
      const { error: insertError } = await supabase
        .from("directory_videos")
        .upsert(insertData, { onConflict: "directory_id,video_id", ignoreDuplicates: true });

      if (insertError) throw insertError;

      const targetDirNames = directories
        .filter((d) => copyTargetDirectoryIds.has(d.id))
        .map((d) => d.name)
        .join(", ");
      toast.success(`${videoIds.length}개의 작품을 ${targetDirIds.length}개 디렉토리에 복사했습니다`);
      
      setSelectedVideos(new Set());
      setBulkCopyDialogOpen(false);
      setCopyTargetDirectoryIds(new Set());
      loadDirectories();
    } catch (error) {
      console.error("Error copying videos:", error);
      toast.error("복사에 실패했습니다");
    } finally {
      setIsCopying(false);
    }
  };

  const toggleCopyTargetDirectory = (dirId: string) => {
    const newSet = new Set(copyTargetDirectoryIds);
    if (newSet.has(dirId)) {
      newSet.delete(dirId);
    } else {
      newSet.add(dirId);
    }
    setCopyTargetDirectoryIds(newSet);
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
                <div className="space-y-2">
                  <Label>색상</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIRECTORY_COLORS.map((color) => (
                      <button
                        key={color.value || "default"}
                        type="button"
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${color.bg} ${
                          newDirColor === color.value
                            ? "ring-2 ring-offset-2 ring-foreground scale-110"
                            : "hover:scale-105"
                        }`}
                        onClick={() => setNewDirColor(color.value)}
                        title={color.name}
                      >
                        {newDirColor === color.value && (
                          <span className="text-white text-xs font-bold">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
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
              {/* Search and Sorting Options */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="디렉토리 검색..."
                    value={directorySearchQuery}
                    onChange={(e) => {
                      setDirectorySearchQuery(e.target.value);
                      setDirectoryPage(1); // Reset to first page on search
                    }}
                    className="pl-9 h-8"
                  />
                  {directorySearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setDirectorySearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {/* Sorting */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <Select value={directorySortBy} onValueChange={(value: SortOption) => setDirectorySortBy(value)}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="정렬" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="date_desc">최신순</SelectItem>
                      <SelectItem value="date_asc">오래된순</SelectItem>
                      <SelectItem value="name_asc">이름 오름차순</SelectItem>
                      <SelectItem value="name_desc">이름 내림차순</SelectItem>
                      <SelectItem value="count_desc">작품 많은순</SelectItem>
                      <SelectItem value="count_asc">작품 적은순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredAndSortedDirectories.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  "{directorySearchQuery}" 검색 결과가 없습니다
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAndSortedDirectories.slice((directoryPage - 1) * itemsPerPage, directoryPage * itemsPerPage).map((dir) => (
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
                          className={`w-6 h-6 ${dragOverDirectory === dir.id ? "animate-pulse" : ""} ${getColorClasses(dir.color || null).text}`}
                        />
                        {dir.video_count !== undefined && dir.video_count > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 min-w-[20px] justify-center">
                            {dir.video_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Rename Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRenameDialog(dir);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {/* Delete Button */}
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
                  {filteredAndSortedDirectories.length > itemsPerPage && (
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
                        {Array.from({ length: Math.ceil(filteredAndSortedDirectories.length / itemsPerPage) }, (_, i) => i + 1).map(
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
                          setDirectoryPage((prev) => Math.min(Math.ceil(filteredAndSortedDirectories.length / itemsPerPage), prev + 1))
                        }
                        disabled={directoryPage === Math.ceil(filteredAndSortedDirectories.length / itemsPerPage)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
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

                {/* Copy to multiple directories button */}
                <Dialog open={bulkCopyDialogOpen} onOpenChange={setBulkCopyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Copy className="mr-2 h-4 w-4" />
                      {selectedVideos.size}개 복사
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>다른 디렉토리에 복사</DialogTitle>
                      <DialogDescription>
                        선택한 {selectedVideos.size}개의 작품을 복사할 디렉토리를 선택하세요. 여러 디렉토리를 선택할 수 있습니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {directories.filter((dir) => dir.id !== selectedDirectory).length > 0 && (
                        <div className="flex items-center justify-between">
                          {copyTargetDirectoryIds.size > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {copyTargetDirectoryIds.size}개 디렉토리 선택됨
                            </p>
                          )}
                          <div className="flex items-center gap-2 ml-auto">
                            <Checkbox
                              id="select-all-copy-dirs"
                              checked={
                                directories.filter((dir) => dir.id !== selectedDirectory).length > 0 &&
                                directories
                                  .filter((dir) => dir.id !== selectedDirectory)
                                  .every((dir) => copyTargetDirectoryIds.has(dir.id))
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const allDirIds = directories
                                    .filter((dir) => dir.id !== selectedDirectory)
                                    .map((dir) => dir.id);
                                  setCopyTargetDirectoryIds(new Set(allDirIds));
                                } else {
                                  setCopyTargetDirectoryIds(new Set());
                                }
                              }}
                            />
                            <label
                              htmlFor="select-all-copy-dirs"
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              전체 선택
                            </label>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {directories
                          .filter((dir) => dir.id !== selectedDirectory)
                          .map((dir) => (
                            <div
                              key={dir.id}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                copyTargetDirectoryIds.has(dir.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => toggleCopyTargetDirectory(dir.id)}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={copyTargetDirectoryIds.has(dir.id)}
                                  onCheckedChange={() => toggleCopyTargetDirectory(dir.id)}
                                  className="h-4 w-4"
                                />
                                <Folder className="w-5 h-5 text-primary" />
                                <span className="font-medium text-sm truncate">{dir.name}</span>
                              </div>
                              {dir.video_count !== undefined && dir.video_count > 0 && (
                                <p className="text-xs text-muted-foreground mt-1 ml-6">{dir.video_count}개 작품</p>
                              )}
                            </div>
                          ))}
                      </div>
                      {directories.filter((dir) => dir.id !== selectedDirectory).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          복사할 수 있는 다른 디렉토리가 없습니다
                        </p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBulkCopyDialogOpen(false);
                          setCopyTargetDirectoryIds(new Set());
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        onClick={bulkCopyVideosToDirectory}
                        disabled={copyTargetDirectoryIds.size === 0 || isCopying}
                      >
                        {isCopying ? "복사 중..." : `${copyTargetDirectoryIds.size > 0 ? copyTargetDirectoryIds.size + "개 디렉토리에 " : ""}복사하기`}
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

      {/* Rename Directory Dialog */}
      <Dialog open={renameDialogOpen !== null} onOpenChange={(open) => !open && setRenameDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>디렉토리 수정</DialogTitle>
            <DialogDescription>디렉토리 이름과 설명을 수정하세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-name">디렉토리 이름 *</Label>
              <Input
                id="rename-name"
                value={renameDirName}
                onChange={(e) => setRenameDirName(e.target.value)}
                placeholder="예: 교육용 영상"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-description">설명 (선택)</Label>
              <Textarea
                id="rename-description"
                value={renameDirDescription}
                onChange={(e) => setRenameDirDescription(e.target.value)}
                placeholder="디렉토리에 대한 설명"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex flex-wrap gap-2">
                {DIRECTORY_COLORS.map((color) => (
                  <button
                    key={color.value || "default"}
                    type="button"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${color.bg} ${
                      renameDirColor === color.value
                        ? "ring-2 ring-offset-2 ring-foreground scale-110"
                        : "hover:scale-105"
                    }`}
                    onClick={() => setRenameDirColor(color.value)}
                    title={color.name}
                  >
                    {renameDirColor === color.value && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(null)}>
              취소
            </Button>
            <Button
              onClick={() => renameDialogOpen && renameDirectory(renameDialogOpen)}
              disabled={isRenaming || !renameDirName.trim()}
            >
              {isRenaming ? "수정 중..." : "수정하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
