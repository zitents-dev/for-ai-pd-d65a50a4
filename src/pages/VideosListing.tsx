import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { VideoCard } from "@/components/VideoCard";
import { VideoCardSkeleton } from "@/components/VideoCardSkeleton";
import { BackToTopButton } from "@/components/BackToTopButton";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type VideoCategory = "all" | "education" | "commercial" | "fiction" | "podcast" | "entertainment" | "tutorial" | "other";
type SectionType = "mentor" | "recent" | "popular" | "subscriptions";

const CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "education", label: "Education" },
  { value: "commercial", label: "Commercial" },
  { value: "fiction", label: "Fiction" },
  { value: "podcast", label: "Podcast" },
  { value: "entertainment", label: "Entertainment" },
  { value: "tutorial", label: "Tutorial" },
  { value: "other", label: "Other" },
];

const SECTION_TITLES: Record<SectionType, string> = {
  mentor: "🎓 Mentor Videos",
  recent: "🕐 Recent Videos",
  popular: "🔥 Popular Videos",
  subscriptions: "📺 From Your Subscriptions",
};

const PAGE_SIZE = 20;

export default function VideosListing() {
  const { section } = useParams<{ section: SectionType }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState<VideoCategory>("all");

  // Redirect if trying to access subscriptions without being logged in
  useEffect(() => {
    if (section === "subscriptions" && !user) {
      navigate("/auth");
    }
  }, [section, user, navigate]);

  const addLikeCounts = async (videosData: any[]): Promise<Video[]> => {
    if (videosData.length === 0) return [];
    
    const videoIds = videosData.map(v => v.id);
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

    return videosData.map(video => ({
      ...video,
      views: video.views || 0,
      likes_count: likeCounts[video.id]?.likes || 0,
      dislikes_count: likeCounts[video.id]?.dislikes || 0,
    }));
  };

  const loadVideos = useCallback(async (pageNum: number, cat: VideoCategory, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let data: any[] = [];

      if (section === "mentor") {
        // Get mentor user IDs
        const { data: mentorBadges } = await supabase
          .from("user_badges")
          .select("user_id")
          .eq("badge_type", "mentor");

        if (mentorBadges && mentorBadges.length > 0) {
          const mentorIds = mentorBadges.map(b => b.user_id);
          
          let query = supabase
            .from("videos")
            .select(`id, title, thumbnail_url, duration, views, created_at, profiles (name, avatar_url)`)
            .in("creator_id", mentorIds)
            .order("created_at", { ascending: false });

          if (cat !== "all") {
            query = query.eq("category", cat as any);
          }

          const { data: videosData, error } = await query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
          if (error) throw error;
          data = videosData || [];
        }
      } else if (section === "recent") {
        let query = supabase
          .from("videos")
          .select(`id, title, thumbnail_url, duration, views, created_at, profiles (name, avatar_url)`)
          .order("created_at", { ascending: false });

        if (cat !== "all") {
          query = query.eq("category", cat as any);
        }

        const { data: videosData, error } = await query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
        if (error) throw error;
        data = videosData || [];
      } else if (section === "popular") {
        let query = supabase
          .from("trending_videos_view")
          .select("*")
          .order("likes_count", { ascending: false, nullsFirst: false });

        if (cat !== "all") {
          query = query.eq("category", cat as any);
        }

        const { data: videosData, error } = await query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
        if (error) throw error;
        
        data = (videosData || []).map(v => ({
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
      } else if (section === "subscriptions" && user) {
        const { data: subscriptions } = await supabase
          .from("subscriptions")
          .select("creator_id")
          .eq("subscriber_id", user.id);

        if (subscriptions && subscriptions.length > 0) {
          const creatorIds = subscriptions.map(s => s.creator_id);
          
          let query = supabase
            .from("videos")
            .select(`id, title, thumbnail_url, duration, views, created_at, profiles (name, avatar_url)`)
            .in("creator_id", creatorIds)
            .order("created_at", { ascending: false });

          if (cat !== "all") {
            query = query.eq("category", cat as any);
          }

          const { data: videosData, error } = await query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
          if (error) throw error;
          data = videosData || [];
        }
      }

      // Add like counts for non-popular sections (popular already has them)
      const videosWithCounts = section === "popular" ? data : await addLikeCounts(data);

      if (append) {
        setVideos(prev => [...prev, ...videosWithCounts]);
      } else {
        setVideos(videosWithCounts);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [section, user]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadVideos(0, category, false);
  }, [section, category, loadVideos]);

  const handleCategoryChange = (newCategory: VideoCategory) => {
    setCategory(newCategory);
    setPage(0);
    setHasMore(true);
  };

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setPage(0);
    setHasMore(true);
    await loadVideos(0, category, false);
  }, [category, loadVideos]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    isEnabled: !loading,
  });

  // Infinite scroll with intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadVideos(nextPage, category, true);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadingMore, loading, page, category, loadVideos]);

  if (!section || !SECTION_TITLES[section as SectionType]) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen relative">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 -z-10"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <Navbar />
      
      <div className="container px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {SECTION_TITLES[section as SectionType]}
            </h1>
          </div>
          <Select value={category} onValueChange={(v) => handleCategoryChange(v as VideoCategory)}>
            <SelectTrigger className="w-44 bg-background border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-lg">No videos found in this section.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="w-full py-4">
              {loadingMore && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <VideoCardSkeleton count={4} variant="grid" />
                </div>
              )}
              {!hasMore && videos.length > 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No more videos to load
                </p>
              )}
            </div>
          </>
        )}
      </div>
      <ScrollProgressBar />
      <BackToTopButton />
    </div>
  );
}
