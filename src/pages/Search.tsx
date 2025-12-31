import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { VirtualVideoGrid } from "@/components/VirtualVideoGrid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Video, User, Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { BadgeDisplay } from "@/components/BadgeDisplay";

const VIDEOS_PER_PAGE = 12;
const CREATORS_PER_PAGE = 10;

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url?: string;
  duration: number | null;
  views: number | null;
  created_at: string;
  likes_count?: number;
  dislikes_count?: number;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

interface UserBadge {
  badge_type: "official" | "amateur" | "semi_pro" | "pro" | "director" | "mentor" | "gold" | "silver" | "bronze" | "buffer";
  award_year?: number | null;
}

interface Creator {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  subscriberCount?: number;
  videoCount?: number;
  badges?: UserBadge[];
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const [loadingMoreCreators, setLoadingMoreCreators] = useState(false);
  const [hasMoreVideos, setHasMoreVideos] = useState(false);
  const [hasMoreCreators, setHasMoreCreators] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalCreators, setTotalCreators] = useState(0);
  
  const currentSearchQuery = useRef("");
  const creatorsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const fetchVideosWithCounts = async (videoData: any[]) => {
    if (!videoData || videoData.length === 0) return [];
    
    const videoIds = videoData.map(v => v.id);
    const { data: likesData } = await supabase
      .from("likes")
      .select("video_id, type")
      .in("video_id", videoIds);

    const likeCounts: Record<string, { likes: number; dislikes: number }> = {};
    videoIds.forEach(id => {
      likeCounts[id] = { likes: 0, dislikes: 0 };
    });
    
    likesData?.forEach(like => {
      if (like.type === "like") {
        likeCounts[like.video_id].likes++;
      } else if (like.type === "dislike") {
        likeCounts[like.video_id].dislikes++;
      }
    });

    return videoData.map(video => ({
      ...video,
      likes_count: likeCounts[video.id]?.likes || 0,
      dislikes_count: likeCounts[video.id]?.dislikes || 0,
    }));
  };

  const fetchCreatorsWithCounts = async (creatorData: any[]) => {
    if (!creatorData || creatorData.length === 0) return [];
    
    return await Promise.all(
      creatorData.map(async (creator) => {
        const [{ count: subscriberCount }, { count: videoCount }, { data: badgesData }] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id),
          supabase
            .from("videos")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id),
          supabase
            .from("user_badges")
            .select("badge_type, award_year")
            .eq("user_id", creator.id)
        ]);
        return { 
          ...creator, 
          subscriberCount: subscriberCount || 0, 
          videoCount: videoCount || 0,
          badges: badgesData || []
        };
      })
    );
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    currentSearchQuery.current = searchQuery;
    setLoading(true);
    setVideos([]);
    setCreators([]);
    
    try {
      // Get total counts first
      const [{ count: videoCount }, { count: creatorCount }] = await Promise.all([
        supabase
          .from("videos")
          .select("*", { count: "exact", head: true })
          .or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .ilike("name", `%${searchQuery}%`)
      ]);

      setTotalVideos(videoCount || 0);
      setTotalCreators(creatorCount || 0);

      // Search videos by title or tags (first page)
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
        .order("created_at", { ascending: false })
        .range(0, VIDEOS_PER_PAGE - 1);

      if (videoError) throw videoError;

      const videosWithCounts = await fetchVideosWithCounts(videoData || []);
      setVideos(videosWithCounts as Video[]);
      setHasMoreVideos((videoData?.length || 0) >= VIDEOS_PER_PAGE && (videoCount || 0) > VIDEOS_PER_PAGE);

      // Search creators by name (first page)
      const { data: creatorData, error: creatorError } = await supabase
        .from("profiles")
        .select("*")
        .ilike("name", `%${searchQuery}%`)
        .range(0, CREATORS_PER_PAGE - 1);

      if (creatorError) throw creatorError;
      
      const creatorsWithCounts = await fetchCreatorsWithCounts(creatorData || []);
      setCreators(creatorsWithCounts);
      setHasMoreCreators((creatorData?.length || 0) >= CREATORS_PER_PAGE && (creatorCount || 0) > CREATORS_PER_PAGE);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreVideos = useCallback(async () => {
    if (loadingMoreVideos || !hasMoreVideos || !currentSearchQuery.current) return;

    setLoadingMoreVideos(true);
    try {
      const startIndex = videos.length;
      const { data: videoData, error } = await supabase
        .from("videos")
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${currentSearchQuery.current}%,tags.cs.{${currentSearchQuery.current}}`)
        .order("created_at", { ascending: false })
        .range(startIndex, startIndex + VIDEOS_PER_PAGE - 1);

      if (error) throw error;

      const videosWithCounts = await fetchVideosWithCounts(videoData || []);
      setVideos(prev => [...prev, ...(videosWithCounts as Video[])]);
      setHasMoreVideos((videoData?.length || 0) >= VIDEOS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more videos:", error);
    } finally {
      setLoadingMoreVideos(false);
    }
  }, [loadingMoreVideos, hasMoreVideos, videos.length]);

  const loadMoreCreators = useCallback(async () => {
    if (loadingMoreCreators || !hasMoreCreators || !currentSearchQuery.current) return;

    setLoadingMoreCreators(true);
    try {
      const startIndex = creators.length;
      const { data: creatorData, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("name", `%${currentSearchQuery.current}%`)
        .range(startIndex, startIndex + CREATORS_PER_PAGE - 1);

      if (error) throw error;

      const creatorsWithCounts = await fetchCreatorsWithCounts(creatorData || []);
      setCreators(prev => [...prev, ...creatorsWithCounts]);
      setHasMoreCreators((creatorData?.length || 0) >= CREATORS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more creators:", error);
    } finally {
      setLoadingMoreCreators(false);
    }
  }, [loadingMoreCreators, hasMoreCreators, creators.length]);

  // Infinite scroll for creators
  useEffect(() => {
    const container = creatorsContainerRef.current;
    if (!container || activeTab !== "creators") return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMoreCreators();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeTab, loadMoreCreators]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="제목, PD명, 태그로 검색하세요..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 w-full"
            />
            <Button type="submit">
              <SearchIcon className="w-4 h-4 mr-2" />
              찾기
            </Button>
          </form>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="videos" className="gap-2">
                  <Video className="w-4 h-4" />
                  작품들 ({totalVideos})
                </TabsTrigger>
                <TabsTrigger value="creators" className="gap-2">
                  <User className="w-4 h-4" />
                  PD명 ({totalCreators})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="videos" className="mt-6">
                <VirtualVideoGrid
                  videos={videos.map(v => ({ ...v, views: v.views ?? 0 }))}
                  loading={false}
                  loadingMore={loadingMoreVideos}
                  hasMore={hasMoreVideos}
                  onLoadMore={loadMoreVideos}
                />
              </TabsContent>

              <TabsContent value="creators" className="mt-6">
                {creators.length > 0 ? (
                  <div 
                    ref={creatorsContainerRef}
                    className="h-[calc(100vh-300px)] overflow-auto space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {creators.map((creator) => (
                        <Card 
                          key={creator.id} 
                          className="p-4 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => navigate(`/profile/${creator.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={creator.avatar_url || ""} />
                              <AvatarFallback>{creator.name?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-foreground">{creator.name}</h3>
                                {creator.badges && creator.badges.length > 0 && (
                                  <BadgeDisplay badges={creator.badges} />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>구독자 {creator.subscriberCount?.toLocaleString() || 0}명</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5" />
                                  <span>작품 {creator.videoCount?.toLocaleString() || 0}개</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Loading more indicator */}
                    {loadingMoreCreators && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* End of list */}
                    {!hasMoreCreators && creators.length > 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        더 이상 결과가 없습니다
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    PD명을 찾을 수 없습니다
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
