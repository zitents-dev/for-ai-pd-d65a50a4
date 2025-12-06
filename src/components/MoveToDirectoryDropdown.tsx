import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderInput, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Directory {
  id: string;
  name: string;
}

interface MoveToDirectoryDropdownProps {
  videoId: string;
  onMoved?: () => void;
}

export const MoveToDirectoryDropdown = ({ videoId, onMoved }: MoveToDirectoryDropdownProps) => {
  const { user } = useAuth();
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [currentDirectories, setCurrentDirectories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadDirectories();
      loadCurrentDirectories();
    }
  }, [open, user]);

  const loadDirectories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("directories")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setDirectories(data || []);
    } catch (error) {
      console.error("Error loading directories:", error);
    }
  };

  const loadCurrentDirectories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("directory_videos")
        .select("directory_id")
        .eq("video_id", videoId);

      if (error) throw error;
      setCurrentDirectories(data?.map((d) => d.directory_id) || []);
    } catch (error) {
      console.error("Error loading current directories:", error);
    }
  };

  const toggleDirectory = async (directoryId: string) => {
    if (loading) return;
    setLoading(true);

    const isInDirectory = currentDirectories.includes(directoryId);

    try {
      if (isInDirectory) {
        // Remove from directory
        const { error } = await supabase
          .from("directory_videos")
          .delete()
          .eq("video_id", videoId)
          .eq("directory_id", directoryId);

        if (error) throw error;
        
        setCurrentDirectories((prev) => prev.filter((id) => id !== directoryId));
        toast.success("디렉토리에서 제거되었습니다");
      } else {
        // Add to directory
        const { error } = await supabase
          .from("directory_videos")
          .insert({
            video_id: videoId,
            directory_id: directoryId,
          });

        if (error) throw error;

        setCurrentDirectories((prev) => [...prev, directoryId]);
        toast.success("디렉토리에 추가되었습니다");
      }

      onMoved?.();
    } catch (error: any) {
      console.error("Error toggling directory:", error);
      if (error.code === "23505") {
        toast.error("이미 이 디렉토리에 있습니다");
      } else {
        toast.error("작업에 실패했습니다");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <FolderInput className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-popover z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>디렉토리로 이동</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {directories.length === 0 ? (
          <DropdownMenuItem disabled>
            디렉토리가 없습니다
          </DropdownMenuItem>
        ) : (
          directories.map((dir) => {
            const isInDirectory = currentDirectories.includes(dir.id);
            return (
              <DropdownMenuItem
                key={dir.id}
                onClick={() => toggleDirectory(dir.id)}
                disabled={loading}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{dir.name}</span>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isInDirectory ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
