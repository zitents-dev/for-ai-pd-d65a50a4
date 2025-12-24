import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Loader2, Calendar, MapPin, Mail, User, Users, UserPlus, UserCheck, Cake, CalendarIcon, ArrowUpDown, X } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

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
  badge_type: "official" | "amateur" | "semi_pro" | "pro" | "director" | "mentor" | "gold" | "silver" | "bronze" | "buffer";
  award_year?: number | null;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url?: string;
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'recent' | 'views'>('recent');
  const [dateOpen, setDateOpen] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchBadges();
      fetchVideos();
      fetchSubscriberCount();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && user && !isOwnProfile) {
      checkSubscription();
    }
  }, [userId, user]);

  const checkSubscription = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', user.id)
        .eq('creator_id', userId)
        .maybeSingle();
      setIsSubscribed(!!data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const toggleSubscription = async () => {
    if (!user) {
      toast.error('구독하려면 로그인이 필요합니다');
      return;
    }

    try {
      if (isSubscribed) {
        const { error } = await supabase
          .from('subscriptions')
          .delete()
          .eq('subscriber_id', user.id)
          .eq('creator_id', userId);
        if (error) throw error;
        setIsSubscribed(false);
        setSubscriberCount((prev) => prev - 1);
        toast.success('구독이 취소되었습니다');
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({ subscriber_id: user.id, creator_id: userId });
        if (error) throw error;
        setIsSubscribed(true);
        setSubscriberCount((prev) => prev + 1);
        toast.success('구독했습니다');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다');
      console.error('Error toggling subscription:', error);
    }
  };

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
        .select('badge_type, award_year')
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
        .select('id, title, thumbnail_url, video_url, duration, views, created_at')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchSubscriberCount = async () => {
    try {
      const { count, error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId);

      if (error) throw error;
      setSubscriberCount(count || 0);
    } catch (error) {
      console.error('Error fetching subscriber count:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleClearDate = () => {
    setDateRange(undefined);
  };

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Apply date filter
    if (dateRange?.from) {
      result = result.filter((video) => {
        const videoDate = new Date(video.created_at);
        if (dateRange.to) {
          return videoDate >= dateRange.from! && videoDate <= dateRange.to;
        }
        return videoDate >= dateRange.from!;
      });
    }

    // Apply sorting
    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'views') {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    }

    return result;
  }, [videos, dateRange, sortBy]);

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
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>구독자 {subscriberCount.toLocaleString()}명</span>
                  </div>
                  {!isOwnProfile && (
                    <Button
                      variant={isSubscribed ? "secondary" : "default"}
                      size="sm"
                      onClick={toggleSubscription}
                    >
                      {isSubscribed ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          구독 중
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          구독
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.created_at && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>가입일: {formatDate(profile.created_at)}</span>
                  </div>
                )}
                {profile.show_email && profile.email && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.show_birthday && profile.birthday && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Cake className="h-4 w-4" />
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
              </div>
              {profile.bio && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">코멘트</p>
                  <p className="text-foreground">{profile.bio}</p>
                </div>
              )}
              {!profile.show_email && !profile.show_birthday && !profile.show_gender && !profile.show_country && (
                <p className="text-muted-foreground text-center py-4">
                  공개된 프로필 정보가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>


          {/* Videos */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold">업로드한 영상 ({filteredVideos.length})</h2>
              <div className="flex items-center gap-2">
                {/* Sort Select */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'views')}>
                  <SelectTrigger className="w-[120px] h-9">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="recent">최신순</SelectItem>
                    <SelectItem value="views">인기순</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Filter */}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MM.dd", { locale: ko })} -{" "}
                            {format(dateRange.to, "MM.dd", { locale: ko })}
                          </>
                        ) : (
                          format(dateRange.from, "yyyy.MM.dd", { locale: ko })
                        )
                      ) : (
                        "기간 설정"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background" align="end">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ko}
                    />
                    {dateRange && (
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={handleClearDate}
                        >
                          <X className="mr-2 h-4 w-4" />
                          기간 초기화
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVideos.map((video) => (
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
                  {videos.length > 0 ? "해당 기간에 업로드한 영상이 없습니다." : "아직 업로드한 영상이 없습니다."}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
