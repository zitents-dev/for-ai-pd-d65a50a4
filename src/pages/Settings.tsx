import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Image } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  hide_child_content: boolean;
  hide_under19_content: boolean;
  hide_adult_content: boolean;
  hide_sexual_content: boolean;
  hide_violence_drugs_content: boolean;
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Account settings
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Filter preferences
  const [hideChild, setHideChild] = useState(false);
  const [hideUnder19, setHideUnder19] = useState(false);
  const [hideAdult, setHideAdult] = useState(false);
  const [hideSexual, setHideSexual] = useState(false);
  const [hideViolence, setHideViolence] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
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
      setName(data.name || '');
      setBio(data.bio || '');
      setHideChild(data.hide_child_content || false);
      setHideUnder19(data.hide_under19_content || false);
      setHideAdult(data.hide_adult_content || false);
      setHideSexual(data.hide_sexual_content || false);
      setHideViolence(data.hide_violence_drugs_content || false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('프로필 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url;
      let bannerUrl = profile?.banner_url;

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

      // Upload new banner if selected
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const filePath = `${user!.id}/banner.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('thumbnails')
          .upload(filePath, bannerFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(filePath);

        bannerUrl = publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          bio,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          hide_child_content: hideChild,
          hide_under19_content: hideUnder19,
          hide_adult_content: hideAdult,
          hide_sexual_content: hideSexual,
          hide_violence_drugs_content: hideViolence,
        })
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('설정이 저장되었습니다');
      loadProfile(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || '설정 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">설정</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>계정 설정</CardTitle>
              <CardDescription>프로필 정보를 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="banner">프로필 배너</Label>
                {(bannerFile || profile?.banner_url) && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
                    <img
                      src={bannerFile ? URL.createObjectURL(bannerFile) : profile?.banner_url || ''}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  />
                  {bannerFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBannerFile(null)}
                    >
                      제거
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  권장 크기: 1200x400px
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">소개</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="자기소개를 입력하세요"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">프로필 이미지</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
                {profile?.avatar_url && !avatarFile && (
                  <div className="mt-2">
                    <img
                      src={profile.avatar_url}
                      alt="Current avatar"
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Filter Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>콘텐츠 필터 설정</CardTitle>
              <CardDescription>
                홈페이지에서 표시하지 않을 콘텐츠 유형을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">연령 제한 콘텐츠</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="settings-hide-child"
                      checked={hideChild}
                      onCheckedChange={(checked) => setHideChild(checked as boolean)}
                    />
                    <Label htmlFor="settings-hide-child" className="font-normal cursor-pointer">
                      어린이 부적절 콘텐츠 숨기기
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="settings-hide-under19"
                      checked={hideUnder19}
                      onCheckedChange={(checked) => setHideUnder19(checked as boolean)}
                    />
                    <Label htmlFor="settings-hide-under19" className="font-normal cursor-pointer">
                      19세 미만 부적절 콘텐츠 숨기기
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="settings-hide-adult"
                      checked={hideAdult}
                      onCheckedChange={(checked) => setHideAdult(checked as boolean)}
                    />
                    <Label htmlFor="settings-hide-adult" className="font-normal cursor-pointer">
                      성인 콘텐츠 숨기기
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">콘텐츠 유형</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="settings-hide-sexual"
                      checked={hideSexual}
                      onCheckedChange={(checked) => setHideSexual(checked as boolean)}
                    />
                    <Label htmlFor="settings-hide-sexual" className="font-normal cursor-pointer">
                      성적 표현 포함 콘텐츠 숨기기
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="settings-hide-violence"
                      checked={hideViolence}
                      onCheckedChange={(checked) => setHideViolence(checked as boolean)}
                    />
                    <Label htmlFor="settings-hide-violence" className="font-normal cursor-pointer">
                      폭력/마약 표현 포함 콘텐츠 숨기기
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Options */}
          <Card>
            <CardHeader>
              <CardTitle>개인정보 보호</CardTitle>
              <CardDescription>개인정보 및 공개 설정을 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input value={user?.email || ''} disabled />
                <p className="text-sm text-muted-foreground">
                  이메일은 변경할 수 없습니다
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  설정 저장
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}