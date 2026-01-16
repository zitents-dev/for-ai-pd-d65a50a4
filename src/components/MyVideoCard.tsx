import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
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
  FileText,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useLazyLoad } from "@/hooks/useLazyLoad";
import { getCategoryLabel, getCategoryClassName, getAiSolutionClassName } from "@/lib/translations";

interface MyVideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    video_url?: string;
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
  onTogglePromptVisibility?: (id: string, currentVisibility: boolean) => void;
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
  onTogglePromptVisibility,
}: MyVideoCardProps) {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { ref: lazyRef, isInView } = useLazyLoad<HTMLDivElement>();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, [role='checkbox'], [role='menuitem']")) {
      return;
    }
    navigate(`/video/${video.id}`);
  };

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <Card
      className={`group relative overflow-hidden transition-colors cursor-pointer ${
        isSelected 
          ? 'bg-primary/15 hover:bg-primary/20' 
          : 'hover:bg-accent/50'
      }`}
      onClick={handleCardClick}
    >
      {/* Belt-style selector */}
      <button
        className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ease-out z-10 ${
          isSelected
            ? 'w-4 bg-primary'
            : 'w-1 bg-muted-foreground/30 hover:w-2 hover:bg-primary/50'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(video.id);
        }}
        aria-label={isSelected ? "선택 해제" : "선택"}
      />
      <div className="flex gap-3 p-3 pl-7">

        {/* Thumbnail */}
        <div
          ref={lazyRef}
          className="relative w-32 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted group/thumbnail"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Skeleton loader */}
          {(!isInView || !isImageLoaded) && (
            <Skeleton className="absolute inset-0 w-full h-full" />
          )}

          {/* Thumbnail Image - only load when in view */}
          {isInView && (
            <img
              src={video.thumbnail_url || "/placeholder.svg"}
              alt={video.title}
              onLoad={() => setIsImageLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-300 ${
                !isImageLoaded ? "opacity-0" : isHovering ? "opacity-0" : "opacity-100 group-hover/thumbnail:scale-110"
              }`}
            />
          )}

          {/* Video Preview on Hover */}
          {video.video_url && (
            <video
              ref={videoRef}
              src={video.video_url}
              muted
              loop
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                isHovering ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Hover overlay - only show when not previewing video */}
          {!isHovering && (
            <div className="absolute inset-0 bg-black/0 group-hover/thumbnail:bg-black/20 transition-colors duration-300" />
          )}
          {/* Play icon on hover - only show when not previewing video */}
          {!isHovering && !video.video_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumbnail:opacity-100 transition-opacity duration-300">
              <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
                <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Preview indicator */}
          {isHovering && video.video_url && (
            <div className="absolute top-1 left-1 bg-primary/80 text-primary-foreground text-[8px] px-1 py-0.5 rounded font-medium z-10">
              미리보기
            </div>
          )}

          {/* Duration badge - hide when previewing */}
          {video.duration !== null && video.duration !== undefined && !isHovering && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded z-10">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-sm truncate mb-1" title={video.title}>{video.title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {video.ai_solution && (
                <Badge className={`text-xs h-5 ${getAiSolutionClassName(video.ai_solution)}`}>
                  {video.ai_solution === "Other" ? "기타" : video.ai_solution}
                </Badge>
              )}
              {video.category && (
                <Badge className={`text-xs h-5 ${getCategoryClassName(video.category)}`}>
                  {getCategoryLabel(video.category)}
                </Badge>
              )}
              {/* Public Prompt Label with Toggle */}
              {video.prompt_command && (
                onTogglePromptVisibility ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePromptVisibility(video.id, video.show_prompt || false);
                    }}
                    className="inline-flex items-center transition-colors hover:opacity-80"
                    title={video.show_prompt ? "클릭하여 비공개로 변경" : "클릭하여 공개로 변경"}
                  >
                    {video.show_prompt ? (
                      <Badge className="text-xs h-5 bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 cursor-pointer hover:bg-green-500/30">
                        <FileText className="h-3 w-3 mr-1" />
                        공개
                      </Badge>
                    ) : (
                      <Badge className="text-xs h-5 bg-muted text-muted-foreground border-muted-foreground/30 cursor-pointer hover:bg-muted/80">
                        <EyeOff className="h-3 w-3 mr-1" />
                        비공개
                      </Badge>
                    )}
                  </button>
                ) : (
                  video.show_prompt ? (
                    <Badge className="text-xs h-5 bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                      <FileText className="h-3 w-3 mr-1" />
                      공개
                    </Badge>
                  ) : (
                    <Badge className="text-xs h-5 bg-muted text-muted-foreground border-muted-foreground/30">
                      <EyeOff className="h-3 w-3 mr-1" />
                      비공개
                    </Badge>
                  )
                )
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
