import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { VideoCard } from "@/components/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Video, Mail } from "lucide-react";
import { BadgeDisplay } from "@/components/BadgeDisplay";

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  show_email: boolean | null;
}

interface User {
  email: string;
}

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

interface Badge {
  badge_type: "best" | "official";
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadVideos();
      loadBadges();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, bio, avatar_url, show_email")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("User not found");
        navigate("/");
        return;
      }

      setProfile(data);

      // Load email if show_email is true
      if (data.show_email) {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId!);
        if (user?.email) {
          setUserEmail(user.email);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
      navigate("/");
    }
  };

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
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
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      console.error("Error loading videos:", error);
    }
  };

  const loadBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge_type")
        .eq("user_id", userId);

      if (error) throw error;
      setBadges(data || []);
    } catch (error: any) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container px-4 py-8 max-w-7xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl md:text-4xl">
                  {profile.name[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  <BadgeDisplay badges={badges} size="md" />
                </div>

                {profile.bio && (
                  <p className="text-muted-foreground text-lg mb-4">{profile.bio}</p>
                )}

                {userEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Mail className="h-4 w-4" />
                    <span>{userEmail}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>{videos.length} videos</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Videos Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Videos</h2>

          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  This user hasn't uploaded any videos yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
