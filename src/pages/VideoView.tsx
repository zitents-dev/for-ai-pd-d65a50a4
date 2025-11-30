import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Eye, Calendar, Info, ListPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { LikeButton } from "@/components/LikeButton";
import { DislikeButton } from "@/components/DislikeButton";
import { ReportDialog } from "@/components/ReportDialog";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { CommentSection } from "@/components/CommentSection";
import { AddToPlaylistDialog } from "@/components/AddToPlaylistDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number;
  likes_count: number;
  dislikes_count: number;
  tags: string[] | null;
  created_at: string;
  prompt_command: string | null;
  show_prompt: boolean | null;
  ai_solution: string | null;
  category: string | null;
  creator_id: string;
  profiles: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface Badge {
  badge_type: "best" | "official";
}

export default function VideoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [creatorBadges, setCreatorBadges] = useState<Badge[]>([]);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadVideo();
      checkFavorite();
      checkLike();
      checkDislike();
      incrementViews();
    }
  }, [id]);

  const loadVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Get likes and dislikes count
      const { data: likesData } = await supabase
        .from("likes")
        .select("type")
        .eq("video_id", id);
      
      const likes_count = likesData?.filter(l => l.type === "like").length || 0;
      const dislikes_count = likesData?.filter(l => l.type === "dislike").length || 0;
      
      setVideo({ ...data, likes_count, dislikes_count });
      
      // Load creator badges
      if (data?.creator_id) {
        const { data: badges } = await supabase
          .from("user_badges")
          .select("badge_type")
          .eq("user_id", data.creator_id);
        
        setCreatorBadges(badges || []);
      }
    } catch (error) {
      console.error("Error loading video:", error);
      toast.error("Failed to load video");
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", id)
        .maybeSingle();

      setIsFavorited(!!data);
    } catch (error) {
      console.error("Error checking favorite:", error);
    }
  };

  const checkLike = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", id)
        .eq("type", "like")
        .maybeSingle();

      setIsLiked(!!data);
    } catch (error) {
      console.error("Error checking like:", error);
    }
  };

  const checkDislike = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", id)
        .eq("type", "dislike")
        .maybeSingle();

      setIsDisliked(!!data);
    } catch (error) {
      console.error("Error checking dislike:", error);
    }
  };

  const incrementViews = async () => {
    if (!id) return;

    try {
      // Increment view count
      const { data: currentVideo } = await supabase
        .from("videos")
        .select("views")
        .eq("id", id)
        .single();

      if (currentVideo) {
        await supabase
          .from("videos")
          .update({ views: (currentVideo.views || 0) + 1 })
          .eq("id", id);
      }
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please sign in to add favorites");
      navigate("/auth");
      return;
    }

    try {
      if (isFavorited) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", id);
        setIsFavorited(false);
        toast.success("Removed from favorites");
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: user.id, video_id: id });
        setIsFavorited(true);
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">결과를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate("/")}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Video Player */}
          <Card className="overflow-hidden">
            <video
              src={video.video_url}
              controls
              className="w-full aspect-video bg-black"
              autoPlay
            />
          </Card>

          {/* Video Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">{video.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {video.views.toLocaleString()} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-2">
                  <LikeButton 
                    videoId={video.id} 
                    initialLiked={isLiked} 
                    initialLikesCount={video.likes_count || 0} 
                  />
                  <DislikeButton
                    videoId={video.id}
                    initialDisliked={isDisliked}
                    initialDislikesCount={video.dislikes_count || 0}
                  />
                </div>
                <Button
                  variant={isFavorited ? "default" : "outline"}
                  size="sm"
                  onClick={toggleFavorite}
                  className="gap-2"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
                  {isFavorited ? "Favorited" : "Favorite"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!user) {
                      toast.error("Please sign in to add to playlist");
                      navigate("/auth");
                      return;
                    }
                    setPlaylistDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <ListPlus className="w-4 h-4" />
                  Add to Playlist
                </Button>
                <ReportDialog videoId={video.id} />
              </div>
            </div>

            {/* Creator Info */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={video.profiles.avatar_url || ""} />
                  <AvatarFallback>{video.profiles.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{video.profiles.name}</h3>
                    <BadgeDisplay badges={creatorBadges} size="sm" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Video Details */}
            {(video.ai_solution || video.category || (video.prompt_command && video.show_prompt)) && (
              <Card className="p-4">
                <div className="space-y-3">
                  {video.ai_solution && (
                    <div>
                      <span className="text-sm font-semibold text-foreground">AI Solution: </span>
                      <span className="text-sm text-muted-foreground">{video.ai_solution}</span>
                    </div>
                  )}
                  {video.category && (
                    <div>
                      <span className="text-sm font-semibold text-foreground">Category: </span>
                      <span className="text-sm text-muted-foreground capitalize">{video.category}</span>
                    </div>
                  )}
                  {video.prompt_command && video.show_prompt && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 p-0">
                          <Info className="w-4 h-4" />
                          <span className="text-sm font-semibold">프롬프트 명령어 보기</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <pre className="text-sm text-muted-foreground bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                          {video.prompt_command}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </Card>
            )}

            {/* Description */}
            {video.description && (
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-2">설명</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{video.description}</p>
              </Card>
            )}

            {/* Tags */}
            {video.tags && video.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {video.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Comments Section */}
            <CommentSection videoId={video.id} />
          </div>
        </div>
      </div>

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        videoId={video.id}
        open={playlistDialogOpen}
        onOpenChange={setPlaylistDialogOpen}
      />
    </div>
  );
}
