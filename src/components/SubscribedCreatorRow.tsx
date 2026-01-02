import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoCard } from "@/components/VideoCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  UserMinus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  X,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface SubscribedCreator {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  subscriber_count: number;
  subscribed_at: string;
}

interface CreatorVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

interface SubscribedCreatorRowProps {
  subscriptions: SubscribedCreator[];
  onUnsubscribe: () => void;
  loading?: boolean;
}

export function SubscribedCreatorRow({ subscriptions, onUnsubscribe, loading = false }: SubscribedCreatorRowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [expandedCreatorId, setExpandedCreatorId] = useState<string | null>(null);
  const [creatorVideos, setCreatorVideos] = useState<{
    popular: CreatorVideo[];
    recent: CreatorVideo[];
  }>({ popular: [], recent: [] });
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "subscribers">("date");
  const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = useState(false);
  const [creatorToUnsubscribe, setCreatorToUnsubscribe] = useState<SubscribedCreator | null>(null);

  const filteredAndSortedSubscriptions = useMemo(() => {
    let result = [...subscriptions];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((creator) => creator.name?.toLowerCase().includes(query));
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "", "ko");
        case "subscribers":
          return b.subscriber_count - a.subscriber_count;
        case "date":
        default:
          return new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime();
      }
    });
    
    return result;
  }, [subscriptions, searchQuery, sortBy]);

  const checkScrollable = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, [filteredAndSortedSubscriptions]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleCreatorClick = async (creatorId: string) => {
    if (expandedCreatorId === creatorId) {
      setExpandedCreatorId(null);
      return;
    }

    setExpandedCreatorId(creatorId);
    setLoadingVideos(true);

    try {
      // Fetch popular videos (by likes - dislikes)
      const { data: popularData, error: popularError } = await supabase
        .from("videos")
        .select(`
          id,
          title,
          thumbnail_url,
          duration,
          views,
          created_at,
          profiles:creator_id (name, avatar_url)
        `)
        .eq("creator_id", creatorId)
        .order("views", { ascending: false })
        .limit(2);

      if (popularError) throw popularError;

      // Fetch recent videos
      const { data: recentData, error: recentError } = await supabase
        .from("videos")
        .select(`
          id,
          title,
          thumbnail_url,
          duration,
          views,
          created_at,
          profiles:creator_id (name, avatar_url)
        `)
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(2);

      if (recentError) throw recentError;

      const formatVideo = (v: any): CreatorVideo => ({
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        views: v.views,
        created_at: v.created_at,
        profiles: v.profiles || { name: "Unknown", avatar_url: null },
      });

      setCreatorVideos({
        popular: (popularData || []).map(formatVideo),
        recent: (recentData || []).map(formatVideo),
      });
    } catch (error) {
      console.error("Error fetching creator videos:", error);
      toast.error("영상을 불러오는데 실패했습니다");
    } finally {
      setLoadingVideos(false);
    }
  };

  const openUnsubscribeDialog = (e: React.MouseEvent, creator: SubscribedCreator) => {
    e.stopPropagation();
    setCreatorToUnsubscribe(creator);
    setUnsubscribeDialogOpen(true);
  };

  const handleUnsubscribeConfirm = async () => {
    if (!creatorToUnsubscribe) return;
    
    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("subscriber_id", user!.id)
        .eq("creator_id", creatorToUnsubscribe.id);
      if (error) throw error;
      toast.success("구독이 취소되었습니다");
      if (expandedCreatorId === creatorToUnsubscribe.id) {
        setExpandedCreatorId(null);
      }
      onUnsubscribe();
    } catch (error) {
      toast.error("구독 취소에 실패했습니다");
      console.error("Error unsubscribing:", error);
    } finally {
      setUnsubscribeDialogOpen(false);
      setCreatorToUnsubscribe(null);
    }
  };

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">구독 중인 크리에이터가 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const expandedCreator = filteredAndSortedSubscriptions.find((c) => c.id === expandedCreatorId);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="shrink-0 w-[220px]">
              <CardContent className="p-3 flex flex-col items-center gap-2 h-[120px]">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="w-full space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort controls */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="크리에이터 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            maxLength={50}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select value={sortBy} onValueChange={(value: "date" | "name" | "subscribers") => setSortBy(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">구독일순</SelectItem>
            <SelectItem value="name">이름순</SelectItem>
            <SelectItem value="subscribers">구독자순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAndSortedSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {subscriptions.length === 0
                ? "구독 중인 크리에이터가 없습니다"
                : "검색 결과가 없습니다"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scrollable creator row */}
          <div className="relative group">
        {/* Left scroll button */}
        {canScrollLeft && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-hide py-1 px-0.5"
            onScroll={checkScrollable}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {filteredAndSortedSubscriptions.map((creator) => (
            <Card
              key={creator.id}
              className={`shrink-0 w-[220px] cursor-pointer transition-all hover:bg-accent/50 ${
                expandedCreatorId === creator.id ? "ring-2 ring-primary bg-accent/30" : ""
              }`}
              onClick={() => handleCreatorClick(creator.id)}
            >
              <CardContent className="p-3 flex flex-col items-center gap-2 h-[120px]">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={creator.avatar_url || undefined} />
                  <AvatarFallback>{(creator.name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div className="w-full text-center min-w-0">
                  <p className="font-medium truncate text-sm">{creator.name || "익명"}</p>
                  <p className="text-xs text-muted-foreground">
                    구독자 {creator.subscriber_count.toLocaleString()}명
                  </p>
                </div>
                <div className="shrink-0">
                  {expandedCreatorId === creator.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expanded creator details */}
      {expandedCreator && (
        <Card className="animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4 space-y-4">
            {/* Creator header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={expandedCreator.avatar_url || undefined} />
                  <AvatarFallback>{(expandedCreator.name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{expandedCreator.name || "익명"}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {expandedCreator.bio && (
                      <span className="line-clamp-1">{expandedCreator.bio}</span>
                    )}
                    {expandedCreator.subscribed_at && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(expandedCreator.subscribed_at), "yyyy년 M월 d일", { locale: ko })} 구독
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/profile/${expandedCreator.id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  더 보기
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={(e) => openUnsubscribeDialog(e, expandedCreator)}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  구독 취소
                </Button>
              </div>
            </div>

            {loadingVideos ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Popular videos */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">인기 영상</h4>
                  {creatorVideos.popular.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {creatorVideos.popular.map((video) => (
                        <VideoCard key={video.id} video={video} compact />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      영상이 없습니다
                    </p>
                  )}
                </div>

                {/* Recent videos */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">최근 영상</h4>
                  {creatorVideos.recent.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {creatorVideos.recent.map((video) => (
                        <VideoCard key={video.id} video={video} compact />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      영상이 없습니다
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Unsubscribe confirmation dialog */}
      <AlertDialog open={unsubscribeDialogOpen} onOpenChange={setUnsubscribeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {creatorToUnsubscribe?.name || "이 크리에이터"}의 구독을 취소하면 새 콘텐츠 알림을 받지 못합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnsubscribeConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              구독 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
