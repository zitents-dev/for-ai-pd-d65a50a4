import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ListPlus, Check, Plus } from "lucide-react";
import { CreatePlaylistDialog } from "./CreatePlaylistDialog";

interface Playlist {
  id: string;
  title: string;
  description: string | null;
}

interface AddToPlaylistDialogProps {
  videoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddToPlaylistDialog = ({ videoId, open, onOpenChange }: AddToPlaylistDialogProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [addedPlaylists, setAddedPlaylists] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadPlaylists();
    }
  }, [open]);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { data: playlistsData, error: playlistsError } = await supabase
        .from("playlists")
        .select("id, title, description")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (playlistsError) throw playlistsError;

      const { data: playlistVideosData, error: playlistVideosError } = await supabase
        .from("playlist_videos")
        .select("playlist_id")
        .eq("video_id", videoId);

      if (playlistVideosError) throw playlistVideosError;

      setPlaylists(playlistsData || []);
      setAddedPlaylists(new Set(playlistVideosData?.map(pv => pv.playlist_id) || []));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlaylist = async (playlistId: string) => {
    setActionLoading(playlistId);
    try {
      const isAdded = addedPlaylists.has(playlistId);

      if (isAdded) {
        const { error } = await supabase
          .from("playlist_videos")
          .delete()
          .eq("playlist_id", playlistId)
          .eq("video_id", videoId);

        if (error) throw error;
        setAddedPlaylists(prev => {
          const next = new Set(prev);
          next.delete(playlistId);
          return next;
        });
        toast.success("Removed from playlist");
      } else {
        const { data: existingVideos } = await supabase
          .from("playlist_videos")
          .select("position")
          .eq("playlist_id", playlistId)
          .order("position", { ascending: false })
          .limit(1);

        const nextPosition = existingVideos && existingVideos.length > 0 
          ? existingVideos[0].position + 1 
          : 0;

        const { error } = await supabase
          .from("playlist_videos")
          .insert({
            playlist_id: playlistId,
            video_id: videoId,
            position: nextPosition,
          });

        if (error) throw error;
        setAddedPlaylists(prev => new Set(prev).add(playlistId));
        toast.success("Added to playlist");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">You don't have any playlists yet</p>
            <CreatePlaylistDialog onPlaylistCreated={loadPlaylists} />
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {playlists.map((playlist) => {
                  const isAdded = addedPlaylists.has(playlist.id);
                  const isLoading = actionLoading === playlist.id;

                  return (
                    <button
                      key={playlist.id}
                      onClick={() => handleTogglePlaylist(playlist.id)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium">{playlist.title}</p>
                        {playlist.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isAdded ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <ListPlus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="pt-4 border-t">
              <CreatePlaylistDialog 
                onPlaylistCreated={loadPlaylists}
                trigger={
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Playlist
                  </Button>
                }
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
