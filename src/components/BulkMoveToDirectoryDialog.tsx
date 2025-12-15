import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, FolderPlus } from "lucide-react";

interface Directory {
  id: string;
  name: string;
  description: string | null;
}

interface BulkMoveToDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVideoIds: string[];
  onSuccess: () => void;
}

export function BulkMoveToDirectoryDialog({
  open,
  onOpenChange,
  selectedVideoIds,
  onSuccess,
}: BulkMoveToDirectoryDialogProps) {
  const { user } = useAuth();
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [selectedDirectories, setSelectedDirectories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadDirectories();
      setSelectedDirectories(new Set());
    }
  }, [open, user]);

  const loadDirectories = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("directories")
        .select("id, name, description")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setDirectories(data || []);
    } catch (error) {
      console.error("Error loading directories:", error);
      toast.error("디렉토리 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const toggleDirectory = (directoryId: string) => {
    const newSelected = new Set(selectedDirectories);
    if (newSelected.has(directoryId)) {
      newSelected.delete(directoryId);
    } else {
      newSelected.add(directoryId);
    }
    setSelectedDirectories(newSelected);
  };

  const handleSave = async () => {
    if (selectedDirectories.size === 0) {
      toast.error("디렉토리를 선택하세요");
      return;
    }

    setIsSaving(true);
    try {
      const directoryIds = Array.from(selectedDirectories);
      let addedCount = 0;
      let skippedCount = 0;

      for (const directoryId of directoryIds) {
        // Check existing entries
        const { data: existing } = await supabase
          .from("directory_videos")
          .select("video_id")
          .eq("directory_id", directoryId)
          .in("video_id", selectedVideoIds);

        const existingVideoIds = new Set(existing?.map((e) => e.video_id) || []);
        const newVideoIds = selectedVideoIds.filter((id) => !existingVideoIds.has(id));

        if (newVideoIds.length > 0) {
          const insertData = newVideoIds.map((videoId) => ({
            directory_id: directoryId,
            video_id: videoId,
          }));

          const { error } = await supabase.from("directory_videos").insert(insertData);

          if (error) throw error;
          addedCount += newVideoIds.length;
        }
        skippedCount += existingVideoIds.size;
      }

      if (addedCount > 0) {
        toast.success(`${addedCount}개의 작품이 디렉토리에 추가되었습니다`);
      }
      if (skippedCount > 0) {
        toast.info(`${skippedCount}개의 작품은 이미 디렉토리에 있습니다`);
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error("디렉토리 이동에 실패했습니다");
      console.error("Bulk move error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            디렉토리로 이동
          </DialogTitle>
          <DialogDescription>
            선택한 {selectedVideoIds.length}개의 작품을 디렉토리에 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : directories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>디렉토리가 없습니다.</p>
              <p className="text-sm mt-1">먼저 디렉토리를 만들어주세요.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {directories.map((dir) => (
                  <div
                    key={dir.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => toggleDirectory(dir.id)}
                  >
                    <Checkbox
                      id={dir.id}
                      checked={selectedDirectories.has(dir.id)}
                      onCheckedChange={() => toggleDirectory(dir.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={dir.id}
                        className="font-medium cursor-pointer"
                      >
                        {dir.name}
                      </Label>
                      {dir.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {dir.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedDirectories.size === 0 || directories.length === 0}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            이동하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
