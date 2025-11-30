import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    duration: number | null;
    views: number;
    created_at: string;
    profiles: {
      name: string;
      avatar_url: string | null;
    };
  };
}

const OptimizedVideoCard = memo(({ video }: VideoCardProps) => {
  const navigate = useNavigate();

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const creatorId = (video as any).creator_id || (video as any).profiles?.id;
    if (creatorId) {
      navigate(`/profile/${creatorId}`);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <div className="relative aspect-video bg-muted">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/90"></div>
        )}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar 
            className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleAvatarClick}
          >
            <AvatarImage src={video.profiles.avatar_url || ""} />
            <AvatarFallback>{video.profiles.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
              {video.title}
            </h3>
            <p 
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              onClick={handleAvatarClick}
            >
              {video.profiles.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {video.views.toLocaleString()}
              </span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.video.id === nextProps.video.id &&
    prevProps.video.views === nextProps.video.views &&
    prevProps.video.title === nextProps.video.title
  );
});

OptimizedVideoCard.displayName = "OptimizedVideoCard";

export default OptimizedVideoCard;
