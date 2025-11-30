import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import OptimizedVideoCard from "@/components/OptimizedVideoCard";
import { TrendingSection } from "@/components/TrendingSection";
import { RecommendedVideos } from "@/components/RecommendedVideos";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import heroBg from "@/assets/hero-bg.jpg";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  views: number;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "education", label: "Education" },
  { value: "commercial", label: "Commercial" },
  { value: "fiction", label: "Fiction" },
  { value: "podcast", label: "Podcast" },
  { value: "entertainment", label: "Entertainment" },
  { value: "tutorial", label: "Tutorial" },
  { value: "other", label: "Other" },
];

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const VIDEOS_PER_PAGE = 12;

  useEffect(() => {
    setVideos([]);
    setPage(0);
    setHasMore(true);
    loadVideos(0, true);
  }, [selectedCategory]);

  const loadMoreVideos = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      setLoadingMore(true);
      loadVideos(nextPage, false);
    }
  };

  const observerTarget = useInfiniteScroll({
    onLoadMore: loadMoreVideos,
    hasMore,
    loading: loading || loadingMore,
  });

  const loadVideos = async (pageNum: number = 0, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      }

      const from = pageNum * VIDEOS_PER_PAGE;
      const to = from + VIDEOS_PER_PAGE - 1;

      let query = supabase
        .from("videos")
        .select(
          `
          id,
          title,
          thumbnail_url,
          duration,
          views,
          created_at,
          creator_id,
          profiles (
            id,
            name,
            avatar_url
          )
        `,
          { count: "exact" }
        )
        .range(from, to);
      
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory as any);
      }
      
      const { data, error, count } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      if (reset) {
        setVideos(data || []);
      } else {
        setVideos(prev => [...prev, ...(data || [])]);
      }

      if (count !== null) {
        setHasMore((pageNum + 1) * VIDEOS_PER_PAGE < count);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 -z-10"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <Navbar />
      
      {/* Recommended Videos Section */}
      <RecommendedVideos />
      
      {/* Trending Section */}
      <TrendingSection />
      
      {/* Category Filter */}
      <section className="container px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.value)}
              className="whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Videos Grid */}
      <section className="container px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-lg">No videos yet. Be the first to upload!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <OptimizedVideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more videos...</span>
                </div>
              )}
              {!hasMore && videos.length > 0 && (
                <p className="text-muted-foreground text-sm">
                  No more videos to load
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
