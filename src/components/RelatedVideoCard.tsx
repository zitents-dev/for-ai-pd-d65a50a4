import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

interface RelatedVideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
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

  return (
    <div
      className="flex gap-2 cursor-pointer group"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      {/* Thumbnail - smaller */}
      <div className="relative w-28 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No thumbnail</span>
          </div>
        )}
        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
            {formatDuration(video.duration)}
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
