import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "./VideoCard";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

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

export const RecommendedVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (user) {
      loadRecommendations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("recommend-videos", {
        body: {},
      });

      if (error) {
        if (error.message?.includes("Rate limit")) {
          toast.error("Too many requests. Please try again in a moment.");
        } else if (error.message?.includes("quota")) {
          toast.error("AI service temporarily unavailable.");
        } else {
          throw error;
        }
        return;
      }

      if (data?.recommendations && data.recommendations.length > 0) {
        setReason(data.reason || "");

        // Fetch full video details
        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select(`
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
          `)
          .in("id", data.recommendations);

        if (videosError) throw videosError;

        // Sort videos by recommendation order
        const sortedVideos = data.recommendations
          .map((id: string) => videosData?.find((v: any) => v.id === id))
          .filter(Boolean);

        setVideos(sortedVideos);
      }
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) {
    return null;
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="container px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 rounded-full border border-primary/30">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Recommended For You</h2>
        </div>
      </div>

      {reason && (
        <p className="text-sm text-muted-foreground mb-4">
          {reason}
        </p>
      )}

      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {videos.map((video) => (
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
