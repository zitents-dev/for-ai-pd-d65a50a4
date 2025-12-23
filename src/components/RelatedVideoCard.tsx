import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

interface RelatedVideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    video_url?: string;
    duration: number | null;
    views: number;
    profiles: {
      name: string;
      avatar_url: string | null;
    };
  };
}

export function RelatedVideoCard({ video }: RelatedVideoCardProps) {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
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
    <div
      className="flex gap-2 cursor-pointer group"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      {/* Thumbnail - medium size with video preview */}
      <div
        className="relative w-40 h-[90px] shrink-0 rounded-md overflow-hidden bg-muted"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Thumbnail Image */}
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isHovering ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No thumbnail</span>
          </div>
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

        {/* Duration badge */}
        {video.duration && !isHovering && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Preview indicator */}
        {isHovering && video.video_url && (
          <div className="absolute top-1 left-1 bg-primary/80 text-primary-foreground text-[8px] px-1 py-0.5 rounded font-medium">
            미리보기
          </div>
        )}
      </div>

      {/* Video Info - on the right */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Title - 2 lines max */}
        <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {video.title}
        </h4>
        {/* Creator and views */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground truncate">
            {video.profiles.name}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Eye className="w-3 h-3" />
            {formatViews(video.views)}
          </span>
        </div>
      </div>
    </div>
  );
}
