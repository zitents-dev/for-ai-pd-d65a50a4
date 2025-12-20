import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Eye, ThumbsUp, ThumbsDown, Target, Sparkles } from "lucide-react";
import { useVideoEvaluationAverages } from "@/components/VideoEvaluation";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
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
  const evaluationAverages = useVideoEvaluationAverages(video.id);

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden group/thumbnail">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/thumbnail:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/90"></div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover/thumbnail:bg-black/20 transition-colors duration-300" />
        {/* Play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumbnail:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {video.duration !== null && video.duration !== undefined && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm z-10">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
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
              {(evaluationAverages.consistency !== null || evaluationAverages.probability !== null) && (
                <>
                  <span>•</span>
                  {evaluationAverages.consistency !== null && (
                    <span className="flex items-center gap-1" title="일관성">
                      <Target className="w-3 h-3" />
                      {evaluationAverages.consistency.toFixed(2)}
                    </span>
                  )}
                  {evaluationAverages.probability !== null && (
                    <span className="flex items-center gap-1" title="개연성">
                      <Sparkles className="w-3 h-3" />
                      {evaluationAverages.probability.toFixed(2)}
                    </span>
                  )}
                </>
              )}
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
