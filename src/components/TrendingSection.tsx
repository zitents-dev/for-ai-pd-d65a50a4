import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "./VideoCard";
import { Loader2, TrendingUp } from "lucide-react";
import { Card } from "./ui/card";

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
  likes_count?: number;
  dislikes_count?: number;
}

export const TrendingSection = () => {
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingVideos();
  }, []);

  const loadTrendingVideos = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get videos from the past week
      const { data: videos, error: videosError } = await supabase
        .from("videos")
        .select(
          `
          id,
          title,
          thumbnail_url,
          duration,
          views,
          created_at,
          profiles (
            name,
            avatar_url
          )
        `
        )
        .gte("created_at", oneWeekAgo.toISOString())
        .order("views", { ascending: false })
        .limit(10);

      if (videosError) throw videosError;

      if (!videos || videos.length === 0) {
        setTrendingVideos([]);
        return;
      }

      // Get likes/dislikes counts for these videos
      const videoIds = videos.map((v) => v.id);
      const { data: likes, error: likesError } = await supabase
        .from("likes")
        .select("video_id, type")
        .in("video_id", videoIds);

      if (likesError) throw likesError;

      // Calculate trending score for each video
      const videosWithStats = videos.map((video) => {
        const videoLikes = likes?.filter(
          (l) => l.video_id === video.id && l.type === "like"
        ).length || 0;
        const videoDislikes = likes?.filter(
          (l) => l.video_id === video.id && l.type === "dislike"
        ).length || 0;

        return {
          ...video,
          likes_count: videoLikes,
          dislikes_count: videoDislikes,
          trending_score: video.views * 0.5 + videoLikes * 2 - videoDislikes,
        };
      });

      // Sort by trending score and take top 8
      const sorted = videosWithStats
        .sort((a, b) => b.trending_score - a.trending_score)
        .slice(0, 8);

      setTrendingVideos(sorted);
    } catch (error) {
      console.error("Error loading trending videos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="container px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (trendingVideos.length === 0) {
    return null;
  }

  return (
    <section className="container px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 rounded-full border border-primary/30">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Trending This Week</h2>
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {trendingVideos.map((video) => (
            <div key={video.id} className="min-w-[280px] sm:min-w-[320px] snap-start">
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};
