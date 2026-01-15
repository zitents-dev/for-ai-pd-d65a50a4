import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Eye, ThumbsUp, ThumbsDown, Clock, FileText, EyeOff } from "lucide-react";
import { useLazyLoad } from "@/hooks/useLazyLoad";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { CategoryBadge } from "@/components/CategoryBadge";
import { AiSolutionBadge } from "@/components/AiSolutionBadge";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    video_url?: string;
    duration: number | null;
    views: number | null;
    created_at: string;
    likes_count?: number;
    dislikes_count?: number;
    creator_id?: string;
    category?: string | null;
    ai_solution?: string | null;
    show_prompt?: boolean | null;
    prompt_command?: string | null;
    profiles: {
      name: string;
      avatar_url: string | null;
    };
  };
  compact?: boolean;
}

export const VideoCard = ({ video, compact = false }: VideoCardProps) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { ref: lazyRef, isInView } = useLazyLoad<HTMLDivElement>();

  // Fetch creator badges
  const { data: badges } = useQuery({
    queryKey: ["user-badges", video.creator_id],
    queryFn: async () => {
      if (!video.creator_id) return [];
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge_type, award_year")
        .eq("user_id", video.creator_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!video.creator_id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

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
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <div
        ref={lazyRef}
        className="relative aspect-video bg-muted overflow-hidden group/thumbnail"
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
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Preview indicator */}
        {isHovering && video.video_url && (
          <div className="absolute top-2 left-2 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium z-10">
            미리보기
          </div>
        )}

        {/* Category, AI Solution, and Prompt badges - hide when previewing */}
        {!isHovering && (video.category || video.ai_solution || video.prompt_command) && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
            {video.category && <CategoryBadge category={video.category} className="text-xs py-0.5 px-1.5" />}
            {video.ai_solution && <AiSolutionBadge aiSolution={video.ai_solution} className="text-xs py-0.5 px-1.5" />}
            {video.prompt_command && (
              <span
                className={`inline-flex items-center gap-1 text-xs py-0.5 px-1.5 rounded font-medium ${
                  video.show_prompt
                    ? "bg-emerald-500/80 text-white"
                    : "bg-zinc-600/80 text-white"
                }`}
                title={video.show_prompt ? "프롬프트 공개" : "프롬프트 비공개"}
              >
                {video.show_prompt ? (
                  <FileText className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                {video.show_prompt ? "공개" : "비공개"}
              </span>
            )}
          </div>
        )}

        {/* Duration badge - hide when previewing */}
        {video.duration !== null && video.duration !== undefined && !isHovering && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm z-10">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
          </span>
        )}
      </div>
      <div className={compact ? "p-2" : "p-4"}>
        <div className={`flex ${compact ? "gap-2" : "gap-3"}`}>
          {!compact && (
            <Avatar className="w-10 h-10">
              <AvatarImage src={video.profiles.avatar_url || ""} />
              <AvatarFallback>{video.profiles.name[0]}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-foreground truncate ${compact ? "text-sm mb-0.5" : "mb-1"}`} title={video.title}>
              {video.title}
            </h3>
            {!compact && (
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{video.profiles.name}</p>
                <BadgeDisplay badges={badges} size="sm" />
              </div>
            )}
            <div className={`flex items-center gap-2 text-muted-foreground flex-wrap ${compact ? "text-[10px]" : "text-xs"}`}>
              <span className="flex items-center gap-1">
                <Eye className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
                {(video.views || 0).toLocaleString()}
              </span>
              {(video.likes_count !== undefined || video.dislikes_count !== undefined) && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
                    {(video.likes_count || 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
                    {(video.dislikes_count || 0).toLocaleString()}
                  </span>
                </>
              )}
              {compact && video.duration !== null && video.duration !== undefined && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
                  </span>
                </>
              )}
              {compact && (
                <>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                </>
              )}
            </div>
            {!compact && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
