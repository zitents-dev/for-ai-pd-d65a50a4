import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { VideoRow, VideoCategory } from "@/components/VideoRow";
import { BackToTopButton } from "@/components/BackToTopButton";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { supabase } from "@/integrations/supabase/client";
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
  const [mentorCategory, setMentorCategory] = useState<VideoCategory>("all");

  // Recent videos
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(0);
  const [recentHasMore, setRecentHasMore] = useState(true);
  const [recentCategory, setRecentCategory] = useState<VideoCategory>("all");

  // Popular videos
  const [popularVideos, setPopularVideos] = useState<Video[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularPage, setPopularPage] = useState(0);
  const [popularHasMore, setPopularHasMore] = useState(true);
  const [popularCategory, setPopularCategory] = useState<VideoCategory>("all");

  // Subscriber videos
  const [subscriberVideos, setSubscriberVideos] = useState<Video[]>([]);
  const [subscriberLoading, setSubscriberLoading] = useState(false);
  const [subscriberPage, setSubscriberPage] = useState(0);
  const [subscriberHasMore, setSubscriberHasMore] = useState(true);
  const [subscriberCategory, setSubscriberCategory] = useState<VideoCategory>("all");

  // Helper to add like counts to videos
  const addLikeCounts = async (videos: any[]): Promise<Video[]> => {
    if (videos.length === 0) return [];

    const videoIds = videos.map((v) => v.id);
    const { data: likesData } = await supabase.from("likes").select("video_id, type").in("video_id", videoIds);

    const likeCounts: Record<string, { likes: number; dislikes: number }> = {};
    videoIds.forEach((id) => {
      likeCounts[id] = { likes: 0, dislikes: 0 };
    });

    likesData?.forEach((like) => {
      if (like.type === "like") {
        likeCounts[like.video_id].likes++;
      } else if (like.type === "dislike") {
        likeCounts[like.video_id].dislikes++;
      }
    });

    return videos.map((video) => ({
      ...video,
      views: video.views || 0,
      likes_count: likeCounts[video.id]?.likes || 0,
      dislikes_count: likeCounts[video.id]?.dislikes || 0,
    }));
  };

  // Load mentor videos (from users with mentor badge)
  const loadMentorVideos = useCallback(async (page: number, category: VideoCategory) => {
    setMentorLoading(true);

    try {
      // Get mentor user IDs
      const { data: mentorBadges } = await supabase.from("user_badges").select("user_id").eq("badge_type", "mentor");

      if (!mentorBadges || mentorBadges.length === 0) {
        setMentorHasMore(false);
        setMentorLoading(false);
        return;
      }

      const mentorIds = mentorBadges.map((b) => b.user_id);

      let query = supabase
        .from("videos")
        .select(
          `
          id, title, thumbnail_url, duration, views, created_at,
          profiles (name, avatar_url)
        `,
        )
        .in("creator_id", mentorIds)
        .order("created_at", { ascending: false });

      if (category !== "all") {
        query = query.eq("category", category as any);
      }

      const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videosWithCounts = await addLikeCounts(data);
        if (page === 0) {
          setMentorVideos(videosWithCounts);
        } else {
          setMentorVideos((prev) => [...prev, ...videosWithCounts]);
        }
        setMentorHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading mentor videos:", error);
    } finally {
      setMentorLoading(false);
    }
  }, []);

  // Load recent videos
  const loadRecentVideos = useCallback(async (page: number, category: VideoCategory) => {
    setRecentLoading(true);

    try {
      let query = supabase
        .from("videos")
        .select(
          `
          id, title, thumbnail_url, duration, views, created_at,
          profiles (name, avatar_url)
        `,
        )
        .order("created_at", { ascending: false });

      if (category !== "all") {
        query = query.eq("category", category as any);
      }

      const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videosWithCounts = await addLikeCounts(data);
        if (page === 0) {
          setRecentVideos(videosWithCounts);
        } else {
          setRecentVideos((prev) => [...prev, ...videosWithCounts]);
        }
        setRecentHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading recent videos:", error);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  // Load popular videos (sorted by likes)
  const loadPopularVideos = useCallback(async (page: number, category: VideoCategory) => {
    setPopularLoading(true);

    try {
      let query = supabase
        .from("trending_videos_view")
        .select("*")
        .order("likes_count", { ascending: false, nullsFirst: false });

      if (category !== "all") {
        query = query.eq("category", category as any);
      }

      const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videos: Video[] = data.map((v) => ({
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
          setPopularVideos((prev) => [...prev, ...videos]);
        }
        setPopularHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading popular videos:", error);
    } finally {
      setPopularLoading(false);
    }
  }, []);

  // Load subscriber videos (only for signed-in users)
  const loadSubscriberVideos = useCallback(async (page: number, category: VideoCategory, userId: string) => {
    setSubscriberLoading(true);

    try {
      // Get subscribed creator IDs
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("creator_id")
        .eq("subscriber_id", userId);

      if (!subscriptions || subscriptions.length === 0) {
        setSubscriberHasMore(false);
        setSubscriberLoading(false);
        setSubscriberVideos([]);
        return;
      }

      const creatorIds = subscriptions.map((s) => s.creator_id);

      let query = supabase
        .from("videos")
        .select(
          `
          id, title, thumbnail_url, duration, views, created_at,
          profiles (name, avatar_url)
        `,
        )
        .in("creator_id", creatorIds)
        .order("created_at", { ascending: false });

      if (category !== "all") {
        query = query.eq("category", category as any);
      }

      const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const videosWithCounts = await addLikeCounts(data);
        if (page === 0) {
          setSubscriberVideos(videosWithCounts);
        } else {
          setSubscriberVideos((prev) => [...prev, ...videosWithCounts]);
        }
        setSubscriberHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error loading subscriber videos:", error);
    } finally {
      setSubscriberLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMentorVideos(0, mentorCategory);
  }, [mentorCategory]);

  useEffect(() => {
    loadRecentVideos(0, recentCategory);
  }, [recentCategory]);

  useEffect(() => {
    loadPopularVideos(0, popularCategory);
  }, [popularCategory]);

  // Load subscriber videos when user signs in or category changes
  useEffect(() => {
    if (user) {
      loadSubscriberVideos(0, subscriberCategory, user.id);
    } else {
      setSubscriberVideos([]);
    }
  }, [user, subscriberCategory]);

  // Category change handlers
  const handleMentorCategoryChange = (category: VideoCategory) => {
    setMentorCategory(category);
    setMentorPage(0);
    setMentorHasMore(true);
  };

  const handleRecentCategoryChange = (category: VideoCategory) => {
    setRecentCategory(category);
    setRecentPage(0);
    setRecentHasMore(true);
  };

  const handlePopularCategoryChange = (category: VideoCategory) => {
    setPopularCategory(category);
    setPopularPage(0);
    setPopularHasMore(true);
  };

  const handleSubscriberCategoryChange = (category: VideoCategory) => {
    setSubscriberCategory(category);
    setSubscriberPage(0);
    setSubscriberHasMore(true);
  };

  // Track initial loading state for each section
  const mentorInitialLoading = mentorLoading && mentorVideos.length === 0;
  const recentInitialLoading = recentLoading && recentVideos.length === 0;
  const popularInitialLoading = popularLoading && popularVideos.length === 0;
  const subscriberInitialLoading = subscriberLoading && subscriberVideos.length === 0;

  return (
    <div className="min-h-screen relative">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 -z-10"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <Navbar />

      <div className="py-6">
        {/* Mentor Videos */}
        <VideoRow
          title="🎓 멘토 영상"
          videos={mentorVideos}
          loading={mentorLoading && mentorVideos.length > 0}
          initialLoading={mentorInitialLoading}
          hasMore={mentorHasMore}
          selectedCategory={mentorCategory}
          onCategoryChange={handleMentorCategoryChange}
          sectionType="mentor"
          onLoadMore={() => {
            if (!mentorLoading && mentorHasMore) {
              const nextPage = mentorPage + 1;
              setMentorPage(nextPage);
              loadMentorVideos(nextPage, mentorCategory);
            }
          }}
        />

        {/* Recent Videos */}
        <VideoRow
          title="🕐 최신 영상"
          videos={recentVideos}
          loading={recentLoading && recentVideos.length > 0}
          initialLoading={recentInitialLoading}
          hasMore={recentHasMore}
          selectedCategory={recentCategory}
          onCategoryChange={handleRecentCategoryChange}
          sectionType="recent"
          onLoadMore={() => {
            if (!recentLoading && recentHasMore) {
              const nextPage = recentPage + 1;
              setRecentPage(nextPage);
              loadRecentVideos(nextPage, recentCategory);
            }
          }}
        />

        {/* Popular Videos */}
        <VideoRow
          title="🔥 Popular Videos"
          videos={popularVideos}
          loading={popularLoading && popularVideos.length > 0}
          initialLoading={popularInitialLoading}
          hasMore={popularHasMore}
          selectedCategory={popularCategory}
          onCategoryChange={handlePopularCategoryChange}
          sectionType="popular"
          onLoadMore={() => {
            if (!popularLoading && popularHasMore) {
              const nextPage = popularPage + 1;
              setPopularPage(nextPage);
              loadPopularVideos(nextPage, popularCategory);
            }
          }}
        />

        {/* Subscriber Videos (only for signed-in users) */}
        {user && (
          <VideoRow
            title="📺 From Your Subscriptions"
            videos={subscriberVideos}
            loading={subscriberLoading && subscriberVideos.length > 0}
            initialLoading={subscriberInitialLoading}
            hasMore={subscriberHasMore}
            selectedCategory={subscriberCategory}
            onCategoryChange={handleSubscriberCategoryChange}
            sectionType="subscriptions"
            onLoadMore={() => {
              if (!subscriberLoading && subscriberHasMore) {
                const nextPage = subscriberPage + 1;
                setSubscriberPage(nextPage);
                loadSubscriberVideos(nextPage, subscriberCategory, user.id);
              }
            }}
          />
        )}

        {/* Empty state */}
        {mentorVideos.length === 0 &&
          recentVideos.length === 0 &&
          popularVideos.length === 0 &&
          subscriberVideos.length === 0 &&
          !mentorLoading &&
          !recentLoading &&
          !popularLoading && (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-lg">No videos yet. Be the first to upload!</p>
            </div>
          )}
      </div>
      <ScrollProgressBar />
      <BackToTopButton />
    </div>
  );
}
