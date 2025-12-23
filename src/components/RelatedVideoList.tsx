import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelatedVideoCard } from "@/components/RelatedVideoCard";
import { Flame, Clock, Users, User, Loader2, ChevronRight } from "lucide-react";

type CategoryType = "popular" | "recent" | "subscribed" | "creator";

const VIDEOS_PER_PAGE = 5;

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
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
  onCollapse?: () => void;
}

export const RelatedVideoList = ({ currentVideoId, creatorId, creatorName, onCollapse }: RelatedVideoListProps) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryType>("popular");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset when category changes
  useEffect(() => {
    setVideos([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
  }, [category, currentVideoId, creatorId]);

  // Load videos when page changes
  useEffect(() => {
    loadVideos();
  }, [page, category, currentVideoId, creatorId, user]);

  const loadVideos = async () => {
    if (page === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = page * VIDEOS_PER_PAGE;
      let query = supabase
        .from("videos")
        .select(`
          id,
          title,
          thumbnail_url,
          video_url,
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
        .range(offset, offset + VIDEOS_PER_PAGE - 1);

      switch (category) {
        case "popular":
          query = query.order("views", { ascending: false });
          break;
        case "recent":
          query = query.order("created_at", { ascending: false });
          break;
        case "subscribed":
          if (user) {
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
              setLoadingMore(false);
              setHasMore(false);
              return;
            }
          } else {
            setVideos([]);
            setLoading(false);
            setLoadingMore(false);
            setHasMore(false);
            return;
          }
          break;
        case "creator":
          query = query.eq("creator_id", creatorId).order("created_at", { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Check if there are more videos
      if (!data || data.length < VIDEOS_PER_PAGE) {
        setHasMore(false);
      }

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

      if (page === 0) {
        setVideos(videosWithLikes);
      } else {
        setVideos((prev) => [...prev, ...videosWithLikes]);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Intersection Observer for infinite scroll
  const lastVideoRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, hasMore]
  );

  const categories = [
    { id: "popular" as const, label: "인기", icon: Flame },
    { id: "recent" as const, label: "최신", icon: Clock },
    { id: "subscribed" as const, label: "구독", icon: Users },
    { id: "creator" as const, label: creatorName, icon: User },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">관련 영상</h3>
        {onCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapse}
            className="h-8 w-8 p-0"
            title="접기"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
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

          {/* Video List - Compact horizontal cards */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="w-28 h-16 rounded-md shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
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
            <div className="flex flex-col gap-3">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  ref={index === videos.length - 1 ? lastVideoRef : null}
                >
                  <RelatedVideoCard video={video} />
                </div>
              ))}
              
              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {/* End of List */}
              {!hasMore && videos.length > 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  더 이상 영상이 없습니다
                </div>
              )}
            </div>
          )}
    </Card>
  );
};
