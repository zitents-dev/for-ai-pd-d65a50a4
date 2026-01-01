import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { VirtualVideoGrid } from "@/components/VirtualVideoGrid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Video, User, Users, Loader2, Clock, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { VideoFilterSort, SortOption, DurationFilter } from "@/components/VideoFilterSort";
import { CreatorFilterSort, CreatorSortOption, SubscriberFilter, VideoCountFilter, BadgeFilter } from "@/components/CreatorFilterSort";
import { DateRange } from "react-day-picker";

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
  category?: string | null;
  ai_solution?: string | null;
  creator_id?: string;
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

const RECENT_SEARCHES_KEY = "hephai_recent_searches";
const MAX_RECENT_SEARCHES = 10;

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
  
  // Filter states
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [aiSolutionFilter, setAiSolutionFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("");
  
  // Creator filter states
  const [creatorSortBy, setCreatorSortBy] = useState<CreatorSortOption>("name");
  const [subscriberFilter, setSubscriberFilter] = useState<SubscriberFilter>("");
  const [videoCountFilter, setVideoCountFilter] = useState<VideoCountFilter>("");
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("");
  
  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const currentSearchQuery = useRef("");
  const creatorsContainerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveRecentSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const removeRecentSearch = (searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== searchTerm);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleSuggestionClick = (searchTerm: string) => {
    setQuery(searchTerm);
    setShowSuggestions(false);
    setSearchParams({ q: searchTerm });
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  // Re-search when filters change
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      performSearch(q);
    }
  }, [sortBy, dateRange, categoryFilter, aiSolutionFilter, durationFilter]);

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

  // Filter and sort creators based on creator filters
  const filterAndSortCreators = (creatorsData: Creator[]): Creator[] => {
    let filtered = [...creatorsData];
    
    // Apply subscriber filter
    if (subscriberFilter) {
      switch (subscriberFilter) {
        case "under100":
          filtered = filtered.filter(c => (c.subscriberCount || 0) < 100);
          break;
        case "100to1000":
          filtered = filtered.filter(c => (c.subscriberCount || 0) >= 100 && (c.subscriberCount || 0) <= 1000);
          break;
        case "over1000":
          filtered = filtered.filter(c => (c.subscriberCount || 0) > 1000);
          break;
      }
    }
    
    // Apply video count filter
    if (videoCountFilter) {
      switch (videoCountFilter) {
        case "under10":
          filtered = filtered.filter(c => (c.videoCount || 0) < 10);
          break;
        case "10to50":
          filtered = filtered.filter(c => (c.videoCount || 0) >= 10 && (c.videoCount || 0) <= 50);
          break;
        case "over50":
          filtered = filtered.filter(c => (c.videoCount || 0) > 50);
          break;
      }
    }
    
    // Apply badge filter
    if (badgeFilter) {
      filtered = filtered.filter(c => 
        c.badges?.some(b => b.badge_type === badgeFilter)
      );
    }
    
    // Apply sorting
    switch (creatorSortBy) {
      case "subscribers":
        filtered.sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));
        break;
      case "videos":
        filtered.sort((a, b) => (b.videoCount || 0) - (a.videoCount || 0));
        break;
      case "name":
      default:
        filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
    }
    
    return filtered;
  };

  // Memoized filtered creators
  const filteredCreators = filterAndSortCreators(creators);

  const buildVideoQuery = (baseQuery: any, searchQuery: string) => {
    let query = baseQuery.or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
    
    // Apply category filter
    if (categoryFilter) {
      query = query.eq("category", categoryFilter as any);
    }
    
    // Apply AI solution filter
    if (aiSolutionFilter) {
      query = query.eq("ai_solution", aiSolutionFilter as any);
    }
    
    // Apply duration filter (duration is in seconds)
    if (durationFilter) {
      switch (durationFilter) {
        case "under1":
          query = query.lt("duration", 60);
          break;
        case "1to5":
          query = query.gte("duration", 60).lte("duration", 300);
          break;
        case "over5":
          query = query.gt("duration", 300);
          break;
      }
    }
    
    // Apply date range filter
    if (dateRange?.from) {
      query = query.gte("created_at", dateRange.from.toISOString());
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }
    }
    
    // Apply sorting
    switch (sortBy) {
      case "views":
        query = query.order("views", { ascending: false, nullsFirst: false });
        break;
      case "likes":
        // We'll sort after fetching since likes are counted separately
        query = query.order("created_at", { ascending: false });
        break;
      case "dislikes":
        query = query.order("created_at", { ascending: false });
        break;
      case "comments":
        query = query.order("created_at", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }
    
    return query;
  };

  const sortVideosByLikesOrDislikes = (videos: Video[], sortType: SortOption) => {
    if (sortType === "likes") {
      return [...videos].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (sortType === "dislikes") {
      return [...videos].sort((a, b) => (b.dislikes_count || 0) - (a.dislikes_count || 0));
    }
    return videos;
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    currentSearchQuery.current = searchQuery;
    setLoading(true);
    setVideos([]);
    setCreators([]);
    
    try {
      // Build count query with filters
      let countQuery = supabase
        .from("videos")
        .select("*", { count: "exact", head: true })
        .or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
      
      if (categoryFilter) {
        countQuery = countQuery.eq("category", categoryFilter as any);
      }
      if (aiSolutionFilter) {
        countQuery = countQuery.eq("ai_solution", aiSolutionFilter as any);
      }
      if (durationFilter) {
        switch (durationFilter) {
          case "under1":
            countQuery = countQuery.lt("duration", 60);
            break;
          case "1to5":
            countQuery = countQuery.gte("duration", 60).lte("duration", 300);
            break;
          case "over5":
            countQuery = countQuery.gt("duration", 300);
            break;
        }
      }
      if (dateRange?.from) {
        countQuery = countQuery.gte("created_at", dateRange.from.toISOString());
        if (dateRange.to) {
          const endDate = new Date(dateRange.to);
          endDate.setHours(23, 59, 59, 999);
          countQuery = countQuery.lte("created_at", endDate.toISOString());
        }
      }

      const [{ count: videoCount }, { count: creatorCount }] = await Promise.all([
        countQuery,
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .ilike("name", `%${searchQuery}%`)
      ]);

      setTotalVideos(videoCount || 0);
      setTotalCreators(creatorCount || 0);

      // Search videos with filters
      let videoQuery = supabase
        .from("videos")
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `);
      
      videoQuery = buildVideoQuery(videoQuery, searchQuery);
      videoQuery = videoQuery.range(0, VIDEOS_PER_PAGE - 1);

      const { data: videoData, error: videoError } = await videoQuery;

      if (videoError) throw videoError;

      let videosWithCounts = await fetchVideosWithCounts(videoData || []);
      
      // Sort by likes/dislikes if needed (since we can't sort by computed columns in DB)
      if (sortBy === "likes" || sortBy === "dislikes") {
        videosWithCounts = sortVideosByLikesOrDislikes(videosWithCounts as Video[], sortBy);
      }
      
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
      let videoQuery = supabase
        .from("videos")
        .select(`
          *,
          profiles (
            name,
            avatar_url
          )
        `);
      
      videoQuery = buildVideoQuery(videoQuery, currentSearchQuery.current);
      videoQuery = videoQuery.range(startIndex, startIndex + VIDEOS_PER_PAGE - 1);

      const { data: videoData, error } = await videoQuery;

      if (error) throw error;

      let videosWithCounts = await fetchVideosWithCounts(videoData || []);
      
      if (sortBy === "likes" || sortBy === "dislikes") {
        // For likes/dislikes sorting, we need to merge and re-sort
        const allVideos = [...videos, ...(videosWithCounts as Video[])];
        setVideos(sortVideosByLikesOrDislikes(allVideos, sortBy));
      } else {
        setVideos(prev => [...prev, ...(videosWithCounts as Video[])]);
      }
      
      setHasMoreVideos((videoData?.length || 0) >= VIDEOS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more videos:", error);
    } finally {
      setLoadingMoreVideos(false);
    }
  }, [loadingMoreVideos, hasMoreVideos, videos, sortBy, categoryFilter, aiSolutionFilter, dateRange, durationFilter]);

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

  // Infinite scroll for creators - trigger when filtered list is short or user scrolls
  useEffect(() => {
    const container = creatorsContainerRef.current;
    if (!container || activeTab !== "creators") return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when near bottom OR when filtered results are less than visible area
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMoreCreators();
      }
    };

    // Also check if we need to load more when filters reduce visible items
    if (hasMoreCreators && filteredCreators.length < 6 && creators.length > 0) {
      loadMoreCreators();
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeTab, loadMoreCreators, hasMoreCreators, filteredCreators.length, creators.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setShowSuggestions(false);
      setSearchParams({ q: query });
    }
  };

  const filteredSuggestions = recentSearches.filter(s => 
    s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="제목, 크리에이터명, 태그로 검색하세요..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full"
                />
                {/* Recent Searches Dropdown */}
                {showSuggestions && (recentSearches.length > 0 || query) && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden"
                  >
                    {filteredSuggestions.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <span className="text-xs text-muted-foreground">최근 검색어</span>
                          <button
                            type="button"
                            onClick={clearAllRecentSearches}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            전체 삭제
                          </button>
                        </div>
                        <ul className="max-h-60 overflow-auto">
                          {filteredSuggestions.map((search, index) => (
                            <li
                              key={index}
                              onClick={() => handleSuggestionClick(search)}
                              className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{search}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => removeRecentSearch(search, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                              >
                                <X className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : query && recentSearches.length > 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        일치하는 검색어가 없습니다
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <Button type="submit">
                <SearchIcon className="w-4 h-4 mr-2" />
                찾기
              </Button>
            </div>
          </form>

          {/* Filters - Show video filters for videos tab, creator filters for creators tab */}
          {searchParams.get("q") && activeTab === "videos" && (
            <VideoFilterSort
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              sortBy={sortBy}
              onSortChange={setSortBy}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={(value) => setCategoryFilter(value)}
              aiSolutionFilter={aiSolutionFilter}
              onAiSolutionFilterChange={(value) => setAiSolutionFilter(value)}
              durationFilter={durationFilter}
              onDurationFilterChange={(value) => setDurationFilter(value)}
            />
          )}
          
          {searchParams.get("q") && activeTab === "creators" && (
            <CreatorFilterSort
              sortBy={creatorSortBy}
              onSortChange={setCreatorSortBy}
              subscriberFilter={subscriberFilter}
              onSubscriberFilterChange={setSubscriberFilter}
              videoCountFilter={videoCountFilter}
              onVideoCountFilterChange={setVideoCountFilter}
              badgeFilter={badgeFilter}
              onBadgeFilterChange={setBadgeFilter}
            />
          )}

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
                  크리에이터명 ({filteredCreators.length !== creators.length ? `${filteredCreators.length}/` : ""}{totalCreators})
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
                {filteredCreators.length > 0 ? (
                  <div 
                    ref={creatorsContainerRef}
                    className="h-[calc(100vh-300px)] overflow-auto space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCreators.map((creator) => (
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
                    {!hasMoreCreators && filteredCreators.length > 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        더 이상 결과가 없습니다
                      </div>
                    )}
                  </div>
                ) : creators.length > 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    필터 조건에 맞는 크리에이터가 없습니다
                    {hasMoreCreators && (
                      <div className="mt-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    크리에이터를 찾을 수 없습니다
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
