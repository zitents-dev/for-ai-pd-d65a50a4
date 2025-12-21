import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/VideoCard";
import { Flame, Clock, Users, User } from "lucide-react";

type CategoryType = "popular" | "recent" | "subscribed" | "creator";

interface Video {
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
}

interface RelatedVideoListProps {
  currentVideoId: string;
  creatorId: string;
  creatorName: string;
}

export const RelatedVideoList = ({ currentVideoId, creatorId, creatorName }: RelatedVideoListProps) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryType>("popular");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, [category, currentVideoId, creatorId, user]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("videos")
        .select(`
          id,
          title,
          thumbnail_url,
          duration,
          views,
          created_at,
          creator_id,
          profiles (
            name,
            avatar_url
          )
        `)
        .neq("id", currentVideoId)
        .limit(8);

      switch (category) {
        case "popular":
          query = query.order("views", { ascending: false });
          break;
        case "recent":
          query = query.order("created_at", { ascending: false });
          break;
        case "subscribed":
          if (user) {
            // Get subscribed creators
            const { data: subscriptions } = await supabase
              .from("subscriptions")
              .select("creator_id")
              .eq("subscriber_id", user.id);

            if (subscriptions && subscriptions.length > 0) {
              const creatorIds = subscriptions.map((s) => s.creator_id);
              query = query.in("creator_id", creatorIds).order("created_at", { ascending: false });
            } else {
              setVideos([]);
              setLoading(false);
              return;
            }
          } else {
            setVideos([]);
            setLoading(false);
            return;
          }
          break;
        case "creator":
          query = query.eq("creator_id", creatorId).order("created_at", { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Load like counts for each video
      const videosWithLikes = await Promise.all(
        (data || []).map(async (video) => {
          const [likesResult, dislikesResult] = await Promise.all([
            supabase
              .from("likes")
              .select("*", { count: "exact", head: true })
              .eq("video_id", video.id)
              .eq("type", "like"),
            supabase
              .from("likes")
              .select("*", { count: "exact", head: true })
              .eq("video_id", video.id)
              .eq("type", "dislike"),
          ]);

          return {
            ...video,
            views: video.views || 0,
            likes_count: likesResult.count || 0,
            dislikes_count: dislikesResult.count || 0,
          } as Video;
        })
      );

      setVideos(videosWithLikes);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "popular" as const, label: "인기", icon: Flame },
    { id: "recent" as const, label: "최신", icon: Clock },
    { id: "subscribed" as const, label: "구독", icon: Users },
    { id: "creator" as const, label: creatorName, icon: User },
  ];

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-foreground mb-4">관련 영상</h3>
      
      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={category === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat.id)}
            className="gap-2"
          >
            <cat.icon className="w-4 h-4" />
            <span className="truncate max-w-[80px]">{cat.label}</span>
          </Button>
        ))}
      </div>

      {/* Video List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {category === "subscribed" && !user
            ? "로그인하여 구독한 크리에이터의 영상을 확인하세요"
            : category === "subscribed"
            ? "구독한 크리에이터가 없습니다"
            : "영상이 없습니다"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </Card>
  );
};
