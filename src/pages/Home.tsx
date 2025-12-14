import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { VideoCard } from "@/components/VideoCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  created_at: string;
  category?: string | null;
  likes_count?: number;
  dislikes_count?: number;
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    loadVideos();
  }, [selectedCategory]);

  const loadVideos = async () => {
    try {
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
          category,
          profiles (
            name,
            avatar_url
          )
        `,
        );
      
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory as any);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Load like/dislike counts for all videos
      if (data && data.length > 0) {
        const videoIds = data.map(v => v.id);
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

        const videosWithCounts = data.map(video => ({
          ...video,
          likes_count: likeCounts[video.id]?.likes || 0,
          dislikes_count: likeCounts[video.id]?.dislikes || 0,
        }));

        setVideos(videosWithCounts as Video[]);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 -z-10"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <Navbar />
      
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
