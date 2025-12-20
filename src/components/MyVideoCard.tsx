import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface MyVideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    duration?: number | null;
    views?: number | null;
    created_at?: string | null;
    likes_count?: number | null;
    dislikes_count?: number | null;
    comments_count?: number | null;
    ai_solution?: string | null;
    category?: string | null;
    description?: string | null;
    prompt_command?: string | null;
    show_prompt?: boolean | null;
    tags?: string[] | null;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (video: MyVideoCardProps["video"]) => void;
  onDelete: (id: string) => void;
  onMoveToDirectory?: (id: string) => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
};

export function MyVideoCard({
  video,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onMoveToDirectory,
}: MyVideoCardProps) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, [role='checkbox'], [role='menuitem']")) {
      return;
    }
    navigate(`/video/${video.id}`);
  };

  return (
    <Card
      className="group relative overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex gap-3 p-3">
        {/* Checkbox */}
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(video.id)}
          />
        </div>

        {/* Thumbnail */}
        <div className="relative w-32 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          {video.duration !== null && video.duration !== undefined && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-sm truncate mb-1" title={video.title}>{video.title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {video.ai_solution && (
                <Badge variant="outline" className="text-xs h-5">
                  {video.ai_solution}
                </Badge>
              )}
              {video.category && (
                <Badge variant="secondary" className="text-xs h-5">
                  {video.category}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatCount(video.views || 0)}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {formatCount(video.likes_count || 0)}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="h-3 w-3" />
              {formatCount(video.dislikes_count || 0)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {formatCount(video.comments_count || 0)}
            </span>
            <span className="ml-auto">
              {video.created_at &&
                formatDistanceToNow(new Date(video.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={() => onEdit(video)}>
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              {onMoveToDirectory && (
                <DropdownMenuItem onClick={() => onMoveToDirectory(video.id)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  폴더로 이동
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(video.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
