import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DirectoryManager } from '@/components/DirectoryManager';
import { PlaylistManager } from '@/components/PlaylistManager';
import { WatchHistory } from '@/components/WatchHistory';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, LogOut, Camera, Mail } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { VideoCard } from '@/components/VideoCard';

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  name_updated_at: string;
  show_email: boolean;
  email: string | null;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  views: number;
  created_at: string;
  age_restriction?: string[];
  has_sexual_content?: boolean;
  has_violence_drugs?: boolean;
}

interface FavoriteVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  views: number;
  created_at: string;
  age_restriction?: string[];
  has_sexual_content?: boolean;
  has_violence_drugs?: boolean;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export default function MyPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [favoriteVideos, setFavoriteVideos] = useState<FavoriteVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [canChangeName, setCanChangeName] = useState(true);
  const [nextNameChangeDate, setNextNameChangeDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadMyVideos();
      loadFavorites();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setName(data.name);
      setBio(data.bio || '');
      setShowEmail(data.show_email || false);

      // Check if user can change name (14 days since last change)
      const nameUpdatedAt = new Date(data.name_updated_at);
      const daysSinceUpdate = (Date.now() - nameUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
      setCanChangeName(daysSinceUpdate >= 14);
      
      if (daysSinceUpdate < 14) {
        const nextChangeDate = new Date(nameUpdatedAt);
        nextChangeDate.setDate(nextChangeDate.getDate() + 14);
        setNextNameChangeDate(nextChangeDate);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `)
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          video_id,
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
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedFavorites = data?.map((item: any) => item.videos).filter(Boolean) || [];
      setFavoriteVideos(formattedFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user!.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('thumbnails')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      // Prepare update data
      const updateData: any = {
        bio,
        avatar_url: avatarUrl,
        show_email: showEmail,
        email: user?.email || null,
      };

      // Only update name if it changed and user can change it
      if (name !== profile?.name) {
        if (!canChangeName) {
          toast.error('이름은 14일에 한 번만 변경할 수 있습니다');
          setSaving(false);
          return;
        }
        updateData.name = name;
        updateData.name_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user!.id);

      if (error) throw error;
      
      toast.success('프로필이 업데이트되었습니다!');
      setAvatarFile(null);
      loadProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8 max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>프로필</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">{name[0]}</AvatarFallback>
                  </Avatar>
                  <Label 
                    htmlFor="avatar-upload" 
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={!canChangeName}
                  />
                  {!canChangeName && nextNameChangeDate && (
                    <p className="text-xs text-muted-foreground">
                      다음 변경 가능: {nextNameChangeDate.toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">소개</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="당신을 소개하세요!"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>이메일 주소</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-email"
                      checked={showEmail}
                      onCheckedChange={(checked) => setShowEmail(checked as boolean)}
                    />
                    <Label htmlFor="show-email" className="font-normal cursor-pointer text-sm">
                      프로필에 이메일 표시
                    </Label>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장중...
                    </>
                  ) : (
                    '저장하기'
                  )}
                </Button>
              </form>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그 아웃
              </Button>
            </CardContent>
          </Card>

          {/* Videos Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">내 작품</h2>
              <Button asChild>
                <a href="/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  새 작품
                </a>
              </Button>
            </div>

            {videos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">아직 업로드된 작품이 없습니다</p>
                  <Button asChild>
                    <a href="/upload">당신의 첫 작품을 업로드 하세요</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={{
                      ...video,
                      profiles: {
                        name: profile?.name || '',
                        avatar_url: profile?.avatar_url || null,
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Favorites Section */}
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold">즐겨찾기</h2>
          
          {favoriteVideos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">즐겨찾기한 영상이 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoriteVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>

        {/* Watch History Section */}
        <WatchHistory />

        {/* Playlists Section */}
        <PlaylistManager />

        {/* Directories Section */}
        <DirectoryManager />
      </div>
    </div>
  );
}
