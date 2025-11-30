import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Share2, Lock, Globe, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export default function Playlist() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylist();
    loadCurrentUser();
  }, [id]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadPlaylist = async () => {
    try {
      const { data: playlistData, error: playlistError } = await supabase
        .from("playlists")
        .select(`
          id,
          title,
          description,
          is_public,
          created_at,
          user_id,
          profiles (
            name,
            avatar_url
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (playlistError) throw playlistError;
      if (!playlistData) {
        toast.error("Playlist not found");
        navigate("/");
        return;
      }

      setPlaylist(playlistData);

      const { data: playlistVideos, error: videosError } = await supabase
        .from("playlist_videos")
        .select(`
          position,
          videos (
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
          )
        `)
        .eq("playlist_id", id)
        .order("position", { ascending: true });

      if (videosError) throw videosError;

      const formattedVideos = playlistVideos
        ?.map((pv: any) => pv.videos)
        .filter(Boolean) || [];

      setVideos(formattedVideos);
    } catch (error: any) {
      toast.error(error.message);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!playlist?.is_public) {
      toast.error("This playlist is private and cannot be shared");
      return;
    }
    setShareDialogOpen(true);
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
    setShareDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!playlist) {
    return null;
  }

  const isOwner = currentUserId === playlist.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container px-4 py-8 max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{playlist.title}</h1>
              {playlist.description && (
                <p className="text-lg text-muted-foreground mb-4">
                  {playlist.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>by {playlist.profiles.name}</span>
                <span>•</span>
                <span>{videos.length} videos</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {playlist.is_public ? (
                    <>
                      <Globe className="h-4 w-4" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {playlist.is_public && (
              <Button onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-lg">
              {isOwner 
                ? "This playlist is empty. Add some videos to get started!"
                : "This playlist doesn't have any videos yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this playlist with others by copying the link below:
            </p>
            <div className="flex gap-2">
              <Input
                value={window.location.href}
                readOnly
                className="flex-1"
              />
              <Button onClick={copyShareLink}>Copy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
