import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  LogOut,
  Trash2,
  UserX,
  Pencil,
  Eye,
  EyeOff,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { VideoCard } from "@/components/VideoCard";
import { DirectoryManager } from "@/components/DirectoryManager";
import { MoveToDirectoryDropdown } from "@/components/MoveToDirectoryDropdown";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { ImageCropDialog } from "@/components/ImageCropDialog";

interface Profile {
  id: string;
  name: string;
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
}

interface UserBadge {
  badge_type: "best" | "official";
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

const countries = ["대한민국", "미국", "일본", "중국", "영국", "독일", "프랑스", "캐나다", "호주", "기타"];

const genders = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
  { value: "other", label: "임의" },
];

export default function MyPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [favoriteVideos, setFavoriteVideos] = useState<FavoriteVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");

  // Visibility settings
  const [showEmail, setShowEmail] = useState(false);
  const [showBirthday, setShowBirthday] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [showCountry, setShowCountry] = useState(false);

  // Edit modes
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [editingCountry, setEditingCountry] = useState(false);

  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropImageType, setCropImageType] = useState<"banner" | "avatar">("banner");

  // Pagination for work list
  const [workPage, setWorkPage] = useState(1);
  const worksPerPage = 4;

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadBadges();
      loadMyVideos();
      loadFavorites();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

      if (error) throw error;

      setProfile(data as Profile);
      setName(data.name || "");
      setBio(data.bio || "");
      setEmail(data.email || "");
      setBirthday(data.birthday || "");
      setGender(data.gender || "");
      setCountry(data.country || "");
      setShowEmail(data.show_email || false);
      setShowBirthday(data.show_birthday || false);
      setShowGender(data.show_gender || false);
      setShowCountry(data.show_country || false);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBadges = async () => {
    try {
      const { data, error } = await supabase.from("user_badges").select("badge_type").eq("user_id", user!.id);

      if (error) throw error;
      setBadges((data as UserBadge[]) || []);
    } catch (error) {
      console.error("Error loading badges:", error);
    }
  };

  const loadMyVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos((data as Video[]) || []);
    } catch (error) {
      console.error("Error loading videos:", error);
    }
  };

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
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
        `,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedFavorites = data?.map((item: any) => item.videos).filter(Boolean) || [];
      setFavoriteVideos(formattedFavorites);
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const handleSaveField = async (field: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", user!.id);

      if (error) throw error;
      toast.success("저장되었습니다");
      loadProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (file: File, type: "banner" | "avatar") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropImageType(type);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!user) return;

    const fileName = `${user.id}-${cropImageType}-${Date.now()}.jpg`;
    const bucket = "thumbnails";

    try {
      setSaving(true);
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, croppedBlob, {
        upsert: true,
        contentType: "image/jpeg",
      });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

      const field = cropImageType === "banner" ? "banner_url" : "avatar_url";
      await handleSaveField(field, urlData.publicUrl);
      toast.success("이미지가 저장되었습니다");
    } catch (error: any) {
      toast.error("이미지 업로드 실패");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase.from("videos").delete().eq("id", videoId).eq("creator_id", user!.id);

      if (error) throw error;

      toast.success("작품이 삭제되었습니다");
      loadMyVideos();
    } catch (error: any) {
      toast.error("작품 삭제에 실패했습니다");
      console.error("Error deleting video:", error);
    }
  };

  const handleQuitMember = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        } as any)
        .eq("id", user!.id);

      if (error) throw error;

      toast.success("회원 탈퇴가 완료되었습니다. 1년 내 재가입이 불가능합니다.");
      await signOut();
      navigate("/");
    } catch (error: any) {
      toast.error("회원 탈퇴에 실패했습니다");
      console.error("Error quitting member:", error);
    }
  };

  const EditableField = ({
    label,
    value,
    setValue,
    fieldName,
    isEditing,
    setIsEditing,
    showField,
    setShowField,
    showFieldName,
    type = "text",
    options,
  }: {
    label: string;
    value: string;
    setValue: (v: string) => void;
    fieldName: string;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    showField?: boolean;
    setShowField?: (v: boolean) => void;
    showFieldName?: string;
    type?: "text" | "date" | "select";
    options?: { value: string; label: string }[];
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            {type === "select" && options ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input type={type} value={value} onChange={(e) => setValue(e.target.value)} className="h-8" />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                handleSaveField(fieldName, value || null);
                setIsEditing(false);
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "저장"}
            </Button>
          </div>
        ) : (
          <p className="text-sm">{value || "-"}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {showField !== undefined && setShowField && showFieldName && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const newValue = !showField;
              setShowField(newValue);
              handleSaveField(showFieldName, newValue);
            }}
            title={showField ? "공개 중" : "비공개"}
          >
            {showField ? (
              <Eye className="h-4 w-4 text-primary" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(!isEditing)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

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

      {/* Hero Banner */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: profile?.banner_url
              ? `url(${profile.banner_url})`
              : "linear-gradient(135deg, hsl(217 91% 60% / 0.3), hsl(230 91% 65% / 0.5))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Banner Edit Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {profile?.banner_url && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                  title="배너 이미지 삭제"
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>배너 이미지 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    배너 이미지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleSaveField("banner_url", null)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="bg-background/80 backdrop-blur-sm"
            onClick={() => bannerInputRef.current?.click()}
            title="배너 이미지 변경"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageSelect(file, "banner");
            e.target.value = "";
          }}
        />

        {/* Profile Info on Banner */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="container max-w-6xl mx-auto flex items-end gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-4xl">{name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              {profile?.avatar_url && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-0 left-0 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                      title="프로필 사진 삭제"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>프로필 사진 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        프로필 사진을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleSaveField("avatar_url", null)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={() => avatarInputRef.current?.click()}
                title="프로필 사진 변경"
              >
                <Camera className="h-3 w-3" />
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file, "avatar");
                  e.target.value = "";
                }}
              />
            </div>

            {/* Name & Badge */}
            <div className="flex-1 pb-2 bg-background/60 backdrop-blur-sm rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 text-2xl font-bold bg-background/80"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveField("name", name);
                        setEditingName(false);
                      }}
                      disabled={saving}
                    >
                      저장
                    </Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{name || "이름 없음"}</h1>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingName(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {badges.length > 0 && (
                <div className="mt-2">
                  <BadgeDisplay badges={badges} size="md" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-8 max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Profile Card - Private Info */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <EditableField
                label="소개"
                value={bio}
                setValue={setBio}
                fieldName="bio"
                isEditing={editingBio}
                setIsEditing={setEditingBio}
              />

              <EditableField
                label="이메일"
                value={email}
                setValue={setEmail}
                fieldName="email"
                isEditing={editingEmail}
                setIsEditing={setEditingEmail}
                showField={showEmail}
                setShowField={setShowEmail}
                showFieldName="show_email"
              />

              <EditableField
                label="생년월일"
                value={birthday}
                setValue={setBirthday}
                fieldName="birthday"
                isEditing={editingBirthday}
                setIsEditing={setEditingBirthday}
                showField={showBirthday}
                setShowField={setShowBirthday}
                showFieldName="show_birthday"
                type="date"
              />

              <EditableField
                label="성별"
                value={gender}
                setValue={setGender}
                fieldName="gender"
                isEditing={editingGender}
                setIsEditing={setEditingGender}
                showField={showGender}
                setShowField={setShowGender}
                showFieldName="show_gender"
                type="select"
                options={genders}
              />

              <EditableField
                label="거주 국가"
                value={country}
                setValue={setCountry}
                fieldName="country"
                isEditing={editingCountry}
                setIsEditing={setEditingCountry}
                showField={showCountry}
                setShowField={setShowCountry}
                showFieldName="show_country"
                type="select"
                options={countries.map((c) => ({ value: c, label: c }))}
              />

              <div className="pt-4 space-y-2">
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
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
                        정말 탈퇴하시겠습니까? 탈퇴 후 1년 이내에는 동일 계정으로 재가입할 수 없습니다. 데이터는
                        보존되며, 1년 후에 완전히 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleQuitMember}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        탈퇴하기
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Videos Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">내 작품</h2>
              <Button asChild>
                <a href="/upload">
                  <Upload className="mr-2 h-4 w-4" />새 작품
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {videos.slice((workPage - 1) * worksPerPage, workPage * worksPerPage).map((video) => (
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
                              name: profile?.name || "",
                              avatar_url: profile?.avatar_url || null,
                            },
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
                              <AlertDialogAction
                                onClick={() => handleDeleteVideo(video.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                삭제하기
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {videos.length > worksPerPage && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setWorkPage((prev) => Math.max(1, prev - 1))}
                      disabled={workPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(videos.length / worksPerPage) }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={workPage === page ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setWorkPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setWorkPage((prev) => Math.min(Math.ceil(videos.length / worksPerPage), prev + 1))}
                      disabled={workPage === Math.ceil(videos.length / worksPerPage)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Directory Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold">내 분류</h2>
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

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={cropImageSrc}
        aspectRatio={cropImageType === "avatar" ? 1 : 16 / 6}
        onCropComplete={handleCroppedImage}
        title={cropImageType === "avatar" ? "프로필 사진 편집" : "배너 이미지 편집"}
      />
    </div>
  );
}
