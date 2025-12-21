import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Eye, Calendar, Info, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { LikeDislikeButtons } from "@/components/LikeDislikeButtons";
import { ReportDialog } from "@/components/ReportDialog";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { CommentSection } from "@/components/CommentSection";
import { RelatedVideoList } from "@/components/RelatedVideoList";
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
  views: number | null;
  likes_count?: number;
  dislikes_count?: number;
  tags: string[] | null;
  created_at: string;
  prompt_command: string | null;
  show_prompt: boolean | null;
  ai_solution: string | null;
  category: string | null;
  creator_id: string;
  profiles: {
    id?: string;
    name: string;
    avatar_url: string | null;
  };
}

interface Badge {
  badge_type: "official" | "amateur" | "semi_pro" | "pro" | "director" | "mentor" | "gold" | "silver" | "bronze" | "buffer";
  award_year?: number | null;
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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    if (id) {
      loadVideo();
      checkFavorite();
      checkLike();
      checkDislike();
      incrementViews();
    }
  }, [id]);

  useEffect(() => {
    if (video?.creator_id) {
      checkSubscription();
      loadSubscriberCount();
    }
  }, [video?.creator_id, user]);

  const loadVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Load like and dislike counts
      const [likesResult, dislikesResult] = await Promise.all([
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("video_id", id)
          .eq("type", "like"),
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("video_id", id)
          .eq("type", "dislike"),
      ]);

      setVideo({
        ...data,
        likes_count: likesResult.count || 0,
        dislikes_count: dislikesResult.count || 0,
      } as Video);
      
      // Load creator badges
      if (data?.creator_id) {
        const { data: badges } = await supabase
          .from("user_badges")
          .select("badge_type, award_year")
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

  const checkSubscription = async () => {
    if (!user || !video?.creator_id) return;

    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("subscriber_id", user.id)
        .eq("creator_id", video.creator_id)
        .maybeSingle();

      setIsSubscribed(!!data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const loadSubscriberCount = async () => {
    if (!video?.creator_id) return;

    try {
      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", video.creator_id);

      setSubscriberCount(count || 0);
    } catch (error) {
      console.error("Error loading subscriber count:", error);
    }
  };

  const toggleSubscription = async () => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      navigate("/auth");
      return;
    }

    if (user.id === video?.creator_id) {
      toast.error("You cannot subscribe to yourself");
      return;
    }

    try {
      if (isSubscribed) {
        await supabase
          .from("subscriptions")
          .delete()
          .eq("subscriber_id", user.id)
          .eq("creator_id", video?.creator_id);
        setIsSubscribed(false);
        setSubscriberCount((prev) => Math.max(0, prev - 1));
        toast.success("구독 취소되었습니다");
      } else {
        await supabase
          .from("subscriptions")
          .insert({ subscriber_id: user.id, creator_id: video?.creator_id });
        setIsSubscribed(true);
        setSubscriberCount((prev) => prev + 1);
        toast.success("구독되었습니다");
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast.error("Failed to update subscription");
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
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Side - Main Content */}
          <div className="flex-1 space-y-6">
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
                  <LikeDislikeButtons
                    videoId={video.id}
                    initialLiked={isLiked}
                    initialDisliked={isDisliked}
                    initialLikesCount={video.likes_count || 0}
                    initialDislikesCount={video.dislikes_count || 0}
                  />
                  <Button
                    variant={isFavorited ? "default" : "outline"}
                    size="sm"
                    onClick={toggleFavorite}
                    className="gap-2"
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
                    {isFavorited ? "Favorited" : "Favorite"}
                  </Button>
                  <ReportDialog videoId={video.id} />
                </div>
              </div>

              {/* Creator Info */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar 
                    className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => navigate(`/profile/${video.creator_id}`)}
                  >
                    <AvatarImage src={video.profiles.avatar_url || ""} />
                    <AvatarFallback>{video.profiles.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 
                        className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/profile/${video.creator_id}`)}
                      >
                        {video.profiles.name}
                      </h3>
                      <BadgeDisplay badges={creatorBadges} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      구독자 {subscriberCount.toLocaleString()}명
                    </p>
                  </div>
                  {user?.id !== video.creator_id && (
                    <Button
                      variant={isSubscribed ? "secondary" : "default"}
                      size="sm"
                      onClick={toggleSubscription}
                      className="gap-2"
                    >
                      {isSubscribed ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          구독중
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          구독
                        </>
                      )}
                    </Button>
                  )}
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
              <CommentSection videoId={video.id} creatorId={video.creator_id} />
            </div>
          </div>

          {/* Right Side - Related Videos */}
          <div className="lg:w-96 lg:shrink-0">
            <div className="lg:sticky lg:top-4">
              <RelatedVideoList
                currentVideoId={video.id}
                creatorId={video.creator_id}
                creatorName={video.profiles.name}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
