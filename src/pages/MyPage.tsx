import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, LogOut, Trash2, UserX } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import { DirectoryManager } from '@/components/DirectoryManager';
import { MoveToDirectoryDropdown } from '@/components/MoveToDirectoryDropdown';

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  created_at: string;
}

interface FavoriteVideo {
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
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos((data as Video[]) || []);
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
      const { error } = await supabase
        .from('profiles')
        .update({ name, bio })
        .eq('id', user!.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
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

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
        .eq('creator_id', user!.id);

      if (error) throw error;
      
      toast.success('작품이 삭제되었습니다');
      loadMyVideos();
    } catch (error: any) {
      toast.error('작품 삭제에 실패했습니다');
      console.error('Error deleting video:', error);
    }
  };

  const handleQuitMember = async () => {
    try {
      // Soft delete - set is_deleted flag and deleted_at date
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        } as any)
        .eq('id', user!.id);

      if (error) throw error;
      
      toast.success('회원 탈퇴가 완료되었습니다. 1년 내 재가입이 불가능합니다.');
      await signOut();
      navigate('/');
    } catch (error: any) {
      toast.error('회원 탈퇴에 실패했습니다');
      console.error('Error quitting member:', error);
    }
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
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">{name[0]}</AvatarFallback>
                </Avatar>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <UserX className="mr-2 h-4 w-4" />
                    회원 탈퇴
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>회원 탈퇴</AlertDialogTitle>
                    <AlertDialogDescription>
                      정말 탈퇴하시겠습니까? 탈퇴 후 1년 이내에는 동일 계정으로 재가입할 수 없습니다.
                      데이터는 보존되며, 1년 후에 완전히 삭제됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleQuitMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      탈퇴하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                  <div 
                    key={video.id} 
                    className="relative group"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("videoId", video.id);
                      e.dataTransfer.setData("videoTitle", video.title);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <div className="cursor-grab active:cursor-grabbing">
                      <VideoCard
                        video={{
                          ...video,
                          profiles: {
                            name: profile?.name || '',
                            avatar_url: profile?.avatar_url || null,
                          }
                        }}
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <MoveToDirectoryDropdown videoId={video.id} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>작품 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{video.title}"을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteVideo(video.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              삭제하기
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Directory Section */}
        <div className="mt-8">
          <DirectoryManager />
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
      </div>
    </div>
  );
}
