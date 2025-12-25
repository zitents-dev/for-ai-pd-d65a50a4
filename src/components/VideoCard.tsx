import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Eye, ThumbsUp, ThumbsDown } from "lucide-react";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    video_url?: string;
    duration: number | null;
    views: number;
    created_at: string;
    likes_count?: number;
    dislikes_count?: number;
    profiles: {
      name: string;
      avatar_url: string | null;
    };
  };
}

export const VideoCard = ({ video }: VideoCardProps) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        className="relative aspect-video bg-muted overflow-hidden group/thumbnail"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Skeleton loader */}
        {!isImageLoaded && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}

        {/* Thumbnail Image */}
        <img
          src={video.thumbnail_url || "/placeholder.svg"}
          alt={video.title}
          onLoad={() => setIsImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-300 ${
            !isImageLoaded ? "opacity-0" : isHovering ? "opacity-0" : "opacity-100 group-hover/thumbnail:scale-110"
          }`}
        />

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

        {/* Duration badge - hide when previewing */}
        {video.duration !== null && video.duration !== undefined && !isHovering && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm z-10">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={video.profiles.avatar_url || ""} />
            <AvatarFallback>{video.profiles.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate mb-1" title={video.title}>
              {video.title}
            </h3>
            <p className="text-sm text-muted-foreground">{video.profiles.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {video.views.toLocaleString()}
              </span>
              {(video.likes_count !== undefined || video.dislikes_count !== undefined) && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {(video.likes_count || 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3" />
                    {(video.dislikes_count || 0).toLocaleString()}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
