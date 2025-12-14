import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { VideoRow } from "@/components/VideoRow";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import heroBg from "@/assets/hero-bg.jpg";

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

const PAGE_SIZE = 10;

export default function Home() {
  const { user } = useAuth();
  
  // Mentor videos
  const [mentorVideos, setMentorVideos] = useState<Video[]>([]);
  const [mentorLoading, setMentorLoading] = useState(true);
  const [mentorPage, setMentorPage] = useState(0);
  const [mentorHasMore, setMentorHasMore] = useState(true);

  // Recent videos
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(0);
  const [recentHasMore, setRecentHasMore] = useState(true);

  // Popular videos
  const [popularVideos, setPopularVideos] = useState<Video[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularPage, setPopularPage] = useState(0);
  const [popularHasMore, setPopularHasMore] = useState(true);

  // Subscriber videos
  const [subscriberVideos, setSubscriberVideos] = useState<Video[]>([]);
  const [subscriberLoading, setSubscriberLoading] = useState(false);
  const [subscriberPage, setSubscriberPage] = useState(0);
  const [subscriberHasMore, setSubscriberHasMore] = useState(true);

  // Helper to add like counts to videos
  const addLikeCounts = async (videos: any[]): Promise<Video[]> => {
    if (videos.length === 0) return [];
    
    const videoIds = videos.map(v => v.id);
    const { data: likesData } = await supabase
      .from("likes")
      .select("video_id, type")
      .in("video_id", videoIds);

    const likeCounts: Record<string, { likes: number; dislikes: number }> = {};
    videoIds.forEach(id => {
      likeCounts[id] = { likes: 0, dislikes: 0 };
    });
    
    likesData?.forEach(like => {
      if (like.type === "like") {
        likeCounts[like.video_id].likes++;
      } else if (like.type === "dislike") {
        likeCounts[like.video_id].dislikes++;
      }
    });

    return videos.map(video => ({
      ...video,
      views: video.views || 0,
      likes_count: likeCounts[video.id]?.likes || 0,
      dislikes_count: likeCounts[video.id]?.dislikes || 0,
    }));
  };

  // Load mentor videos (from users with mentor badge)
  const loadMentorVideos = useCallback(async (page: number) => {
    if (page > 0 && !mentorHasMore) return;
    setMentorLoading(true);
    
    try {
      // Get mentor user IDs
      const { data: mentorBadges } = await supabase
        .from("user_badges")
        .select("user_id")
        .eq("badge_type", "mentor");

      if (!mentorBadges || mentorBadges.length === 0) {
        setMentorHasMore(false);
        setMentorLoading(false);
        return;
      }

      const mentorIds = mentorBadges.map(b => b.user_id);
      
      const { data, error } = await supabase
        .from("videos")
        .select(`
          id, title, thumbnail_url, duration, views, created_at,
          profiles (name, avatar_url)
        `)
        .in("creator_id", mentorIds)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videosWithCounts = await addLikeCounts(data);
        if (page === 0) {
          setMentorVideos(videosWithCounts);
        } else {
          setMentorVideos(prev => [...prev, ...videosWithCounts]);
        }
        setMentorHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading mentor videos:", error);
    } finally {
      setMentorLoading(false);
    }
  }, [mentorHasMore]);

  // Load recent videos
  const loadRecentVideos = useCallback(async (page: number) => {
    if (page > 0 && !recentHasMore) return;
    setRecentLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          id, title, thumbnail_url, duration, views, created_at,
          profiles (name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videosWithCounts = await addLikeCounts(data);
        if (page === 0) {
          setRecentVideos(videosWithCounts);
        } else {
          setRecentVideos(prev => [...prev, ...videosWithCounts]);
        }
        setRecentHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading recent videos:", error);
    } finally {
      setRecentLoading(false);
    }
  }, [recentHasMore]);

  // Load popular videos (sorted by likes)
  const loadPopularVideos = useCallback(async (page: number) => {
    if (page > 0 && !popularHasMore) return;
    setPopularLoading(true);
    
    try {
      // Use trending_videos_view which has likes_count
      const { data, error } = await supabase
        .from("trending_videos_view")
        .select("*")
        .order("likes_count", { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videos: Video[] = data.map(v => ({
          id: v.id!,
          title: v.title!,
          thumbnail_url: v.thumbnail_url,
          duration: v.duration,
          views: v.views || 0,
          created_at: v.created_at!,
          likes_count: Number(v.likes_count) || 0,
          dislikes_count: Number(v.dislikes_count) || 0,
          profiles: {
            name: v.creator_name || "Unknown",
            avatar_url: v.creator_avatar,
          },
        }));
        
        if (page === 0) {
          setPopularVideos(videos);
        } else {
          setPopularVideos(prev => [...prev, ...videos]);
        }
        setPopularHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading popular videos:", error);
    } finally {
      setPopularLoading(false);
    }
  }, [popularHasMore]);

  // Load subscriber videos (only for signed-in users)
  const loadSubscriberVideos = useCallback(async (page: number) => {
    if (!user || (page > 0 && !subscriberHasMore)) return;
    setSubscriberLoading(true);
    
    try {
      // Get subscribed creator IDs
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("creator_id")
        .eq("subscriber_id", user.id);

      if (!subscriptions || subscriptions.length === 0) {
        setSubscriberHasMore(false);
        setSubscriberLoading(false);
        return;
      }

      const creatorIds = subscriptions.map(s => s.creator_id);
      
      const { data, error } = await supabase
        .from("videos")
        .select(`
          id, title, thumbnail_url, duration, views, created_at,
          profiles (name, avatar_url)
        `)
        .in("creator_id", creatorIds)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videosWithCounts = await addLikeCounts(data);
        if (page === 0) {
          setSubscriberVideos(videosWithCounts);
        } else {
          setSubscriberVideos(prev => [...prev, ...videosWithCounts]);
        }
        setSubscriberHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading subscriber videos:", error);
    } finally {
      setSubscriberLoading(false);
    }
  }, [user, subscriberHasMore]);

  // Initial load
  useEffect(() => {
    loadMentorVideos(0);
    loadRecentVideos(0);
    loadPopularVideos(0);
  }, []);

  // Load subscriber videos when user signs in
  useEffect(() => {
    if (user) {
      loadSubscriberVideos(0);
    } else {
      setSubscriberVideos([]);
    }
  }, [user]);

  const initialLoading = mentorLoading && recentLoading && popularLoading && 
    mentorVideos.length === 0 && recentVideos.length === 0 && popularVideos.length === 0;

  return (
    <div className="min-h-screen relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 -z-10"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <Navbar />
      
      {initialLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="py-6">
          {/* Mentor Videos */}
          <VideoRow
            title="🎓 Mentor Videos"
            videos={mentorVideos}
            loading={mentorLoading}
            hasMore={mentorHasMore}
            onLoadMore={() => {
              if (!mentorLoading) {
                setMentorPage(p => {
                  loadMentorVideos(p + 1);
                  return p + 1;
                });
              }
            }}
          />

          {/* Recent Videos */}
          <VideoRow
            title="🕐 Recent Videos"
            videos={recentVideos}
            loading={recentLoading}
            hasMore={recentHasMore}
            onLoadMore={() => {
              if (!recentLoading) {
                setRecentPage(p => {
                  loadRecentVideos(p + 1);
                  return p + 1;
                });
              }
            }}
          />

          {/* Popular Videos */}
          <VideoRow
            title="🔥 Popular Videos"
            videos={popularVideos}
            loading={popularLoading}
            hasMore={popularHasMore}
            onLoadMore={() => {
              if (!popularLoading) {
                setPopularPage(p => {
                  loadPopularVideos(p + 1);
                  return p + 1;
                });
              }
            }}
          />

          {/* Subscriber Videos (only for signed-in users) */}
          {user && (
            <VideoRow
              title="📺 From Your Subscriptions"
              videos={subscriberVideos}
              loading={subscriberLoading}
              hasMore={subscriberHasMore}
              onLoadMore={() => {
                if (!subscriberLoading) {
                  setSubscriberPage(p => {
                    loadSubscriberVideos(p + 1);
                    return p + 1;
                  });
                }
              }}
            />
          )}

          {/* Empty state */}
          {mentorVideos.length === 0 && recentVideos.length === 0 && 
           popularVideos.length === 0 && subscriberVideos.length === 0 && (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-lg">No videos yet. Be the first to upload!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
