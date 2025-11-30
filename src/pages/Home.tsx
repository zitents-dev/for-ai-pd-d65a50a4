import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import OptimizedVideoCard from "@/components/OptimizedVideoCard";
import { TrendingSection } from "@/components/TrendingSection";
import { RecommendedVideos } from "@/components/RecommendedVideos";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

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
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "education", label: "Education" },
  { value: "commercial", label: "Commercial" },
  { value: "fiction", label: "Fiction" },
  { value: "podcast", label: "Podcast" },
  { value: "entertainment", label: "Entertainment" },
  { value: "tutorial", label: "Tutorial" },
  { value: "other", label: "Other" },
];

export default function Home() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  
  // Content filters
  const [hideChild, setHideChild] = useState(false);
  const [hideUnder19, setHideUnder19] = useState(false);
  const [hideAdult, setHideAdult] = useState(false);
  const [hideSexual, setHideSexual] = useState(false);
  const [hideViolence, setHideViolence] = useState(false);

  const VIDEOS_PER_PAGE = 12;

  // Load user filter preferences on mount
  useEffect(() => {
    if (user) {
      loadFilterPreferences();
    } else {
      setFiltersLoaded(true);
    }
  }, [user]);

  // Save filter preferences when they change (only after initial load)
  useEffect(() => {
    if (filtersLoaded && user) {
      const timeoutId = setTimeout(() => {
        saveFilterPreferences();
      }, 500); // Debounce to avoid too many updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [hideChild, hideUnder19, hideAdult, hideSexual, hideViolence, filtersLoaded, user]);

  useEffect(() => {
    if (filtersLoaded) {
      setCurrentPage(1);
      loadVideos(1);
    }
  }, [selectedCategory, hideChild, hideUnder19, hideAdult, hideSexual, hideViolence, filtersLoaded]);

  const loadFilterPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('hide_child_content, hide_under19_content, hide_adult_content, hide_sexual_content, hide_violence_drugs_content')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      if (data) {
        setHideChild(data.hide_child_content || false);
        setHideUnder19(data.hide_under19_content || false);
        setHideAdult(data.hide_adult_content || false);
        setHideSexual(data.hide_sexual_content || false);
        setHideViolence(data.hide_violence_drugs_content || false);
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
    } finally {
      setFiltersLoaded(true);
    }
  };

  const saveFilterPreferences = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          hide_child_content: hideChild,
          hide_under19_content: hideUnder19,
          hide_adult_content: hideAdult,
          hide_sexual_content: hideSexual,
          hide_violence_drugs_content: hideViolence,
        })
        .eq('id', user!.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving filter preferences:', error);
      toast.error('Failed to save filter preferences');
    }
  };

  const loadVideos = async (pageNum: number = 1) => {
    try {
      setLoading(true);

      const from = (pageNum - 1) * VIDEOS_PER_PAGE;
      const to = from + VIDEOS_PER_PAGE - 1;

      let query = supabase
        .from("videos")
        .select(
          `
          id,
          title,
          thumbnail_url,
          duration,
          views,
          created_at,
          creator_id,
          age_restriction,
          has_sexual_content,
          has_violence_drugs,
          profiles (
            id,
            name,
            avatar_url
          )
        `,
          { count: "exact" }
        )
        .range(from, to);
      
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory as any);
      }
      
      // Apply content filters
      if (hideChild) {
        query = query.not("age_restriction", "cs", '{"child"}');
      }
      if (hideUnder19) {
        query = query.not("age_restriction", "cs", '{"under_19"}');
      }
      if (hideAdult) {
        query = query.not("age_restriction", "cs", '{"adult"}');
      }
      if (hideSexual) {
        query = query.eq("has_sexual_content", false);
      }
      if (hideViolence) {
        query = query.eq("has_violence_drugs", false);
      }
      
      const { data, error, count } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      setVideos(data || []);

      if (count !== null) {
        setTotalPages(Math.ceil(count / VIDEOS_PER_PAGE));
      }
      
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    loadVideos(pageNum);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => goToPage(i)}
          disabled={loading}
        >
          {i}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="min-h-screen relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 -z-10"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <Navbar />
      
      {/* Recommended Videos Section */}
      <RecommendedVideos />
      
      {/* Trending Section */}
      <TrendingSection />
      
      {/* Category and Content Filters */}
      <section className="container px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.value)}
                className="whitespace-nowrap"
              >
                {cat.label}
              </Button>
            ))}
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">콘텐츠 필터</h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">연령 제한 숨기기</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hide-child"
                          checked={hideChild}
                          onCheckedChange={(checked) => setHideChild(checked as boolean)}
                        />
                        <Label htmlFor="hide-child" className="font-normal cursor-pointer text-sm">
                          어린이 부적절 콘텐츠 숨기기
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hide-under19"
                          checked={hideUnder19}
                          onCheckedChange={(checked) => setHideUnder19(checked as boolean)}
                        />
                        <Label htmlFor="hide-under19" className="font-normal cursor-pointer text-sm">
                          19세 미만 부적절 콘텐츠 숨기기
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hide-adult"
                          checked={hideAdult}
                          onCheckedChange={(checked) => setHideAdult(checked as boolean)}
                        />
                        <Label htmlFor="hide-adult" className="font-normal cursor-pointer text-sm">
                          성인 콘텐츠 숨기기
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-sm font-medium">콘텐츠 유형 숨기기</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hide-sexual"
                          checked={hideSexual}
                          onCheckedChange={(checked) => setHideSexual(checked as boolean)}
                        />
                        <Label htmlFor="hide-sexual" className="font-normal cursor-pointer text-sm">
                          성적 표현 포함 콘텐츠 숨기기
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hide-violence"
                          checked={hideViolence}
                          onCheckedChange={(checked) => setHideViolence(checked as boolean)}
                        />
                        <Label htmlFor="hide-violence" className="font-normal cursor-pointer text-sm">
                          폭력/마약 표현 포함 콘텐츠 숨기기
                        </Label>
                      </div>
                    </div>
                  </div>

                  {(hideChild || hideUnder19 || hideAdult || hideSexual || hideViolence) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setHideChild(false);
                        setHideUnder19(false);
                        setHideAdult(false);
                        setHideSexual(false);
                        setHideViolence(false);
                      }}
                    >
                      모든 필터 초기화
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </section>

      {/* Videos Grid */}
      <section className="container px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-lg">No videos yet. Be the first to upload!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <OptimizedVideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                {currentPage > 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={loading}
                    >
                      1
                    </Button>
                    {currentPage > 4 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                  </>
                )}

                {renderPaginationButtons()}

                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={loading}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
