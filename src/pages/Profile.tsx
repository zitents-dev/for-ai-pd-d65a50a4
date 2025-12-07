import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, MapPin, Mail, User } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import { BadgeDisplay } from '@/components/BadgeDisplay';

interface Profile {
  id: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  email: string | null;
  birthday: string | null;
  gender: string | null;
  country: string | null;
  show_email: boolean;
  show_birthday: boolean;
  show_gender: boolean;
  show_country: boolean;
  created_at: string | null;
}

interface UserBadge {
  badge_type: 'best' | 'official';
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  created_at: string;
}

const genderLabels: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
  prefer_not_to_say: '밝히고 싶지 않음',
};

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchBadges();
      fetchVideos();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setNotFound(true);
        }
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_type')
        .eq('user_id', userId);

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, duration, views, created_at')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">사용자를 찾을 수 없습니다</h1>
          <p className="text-muted-foreground">존재하지 않거나 삭제된 프로필입니다.</p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const name = profile.name || '익명 사용자';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pb-12">
        {/* Banner */}
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/10">
          {profile.banner_url && (
            <img
              src={profile.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="container mx-auto px-4">
          {/* Profile Header */}
          <div className="relative -mt-16 md:-mt-20 mb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} alt={name} />
                <AvatarFallback className="text-4xl">{name[0] || '?'}</AvatarFallback>
              </Avatar>

              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold">{name}</h1>
                  <BadgeDisplay badges={badges} />
                </div>
                {profile.bio && (
                  <p className="text-muted-foreground mt-2 max-w-2xl">{profile.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.show_email && profile.email && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.show_birthday && profile.birthday && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(profile.birthday)}</span>
                  </div>
                )}
                {profile.show_gender && profile.gender && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{genderLabels[profile.gender] || profile.gender}</span>
                  </div>
                )}
                {profile.show_country && profile.country && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.country}</span>
                  </div>
                )}
                {profile.created_at && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>가입일: {formatDate(profile.created_at)}</span>
                  </div>
                )}
              </div>
              {!profile.show_email && !profile.show_birthday && !profile.show_gender && !profile.show_country && (
                <p className="text-muted-foreground text-center py-4">
                  공개된 프로필 정보가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Videos */}
          <div>
            <h2 className="text-xl font-semibold mb-4">업로드한 영상 ({videos.length})</h2>
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={{
                      id: video.id,
                      title: video.title,
                      thumbnail_url: video.thumbnail_url,
                      duration: video.duration,
                      views: video.views || 0,
                      created_at: video.created_at,
                      profiles: {
                        name: name,
                        avatar_url: profile.avatar_url,
                      },
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  아직 업로드한 영상이 없습니다.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
