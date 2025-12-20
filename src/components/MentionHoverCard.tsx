import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { User, Video, MessageSquare } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface UserStats {
  videos_uploaded: number;
  comments_made: number;
}

interface MentionHoverCardProps {
  username: string;
  children: React.ReactNode;
}

export function MentionHoverCard({ username, children }: MentionHoverCardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadProfile = async () => {
    if (hasSearched) return;
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      // Find user by name
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, bio")
        .eq("name", username.trim())
        .eq("is_deleted", false)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (profileData) {
        setProfile(profileData as UserProfile);
        
        // Get user stats
        const { data: statsData, error: statsError } = await supabase
          .from("user_statistics_view")
          .select("videos_uploaded, comments_made")
          .eq("user_id", profileData.id)
          .maybeSingle();
          
        if (!statsError && statsData) {
          setStats({
            videos_uploaded: Number(statsData.videos_uploaded) || 0,
            comments_made: Number(statsData.comments_made) || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild onMouseEnter={loadProfile}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72" align="start">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback>
                  {profile.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate">
                  {profile.name}
                </h4>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            
            {stats && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Video className="w-4 h-4" />
                  <span>{stats.videos_uploaded} 영상</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{stats.comments_made} 댓글</span>
                </div>
              </div>
            )}
            
            <Link to={`/profile/${profile.id}`}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <User className="w-4 h-4" />
                프로필 보기
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-2 text-sm text-muted-foreground">
            사용자를 찾을 수 없습니다
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
