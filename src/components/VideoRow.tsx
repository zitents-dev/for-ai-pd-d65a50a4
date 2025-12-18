import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VideoCard } from "./VideoCard";
import { VideoCardSkeleton } from "./VideoCardSkeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number;
  created_at: string;
  likes_count?: number;
  dislikes_count?: number;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export type VideoCategory =
  | "all"
  | "education"
  | "commercial"
  | "fiction"
  | "podcast"
  | "entertainment"
  | "tutorial"
  | "other";
export type SectionType = "mentor" | "recent" | "popular" | "subscriptions";

const CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "education", label: "교육" },
  { value: "commercial", label: "광고" },
  { value: "fiction", label: "픽션" },
  { value: "podcast", label: "팟캐스트" },
  { value: "entertainment", label: "엔터테인먼트" },
  { value: "tutorial", label: "튜토리얼" },
  { value: "other", label: "기타" },
];

interface VideoRowProps {
  title: string;
  videos: Video[];
  loading?: boolean;
  initialLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  selectedCategory?: VideoCategory;
  onCategoryChange?: (category: VideoCategory) => void;
  showCategoryFilter?: boolean;
  sectionType?: SectionType;
}

export const VideoRow = ({
  title,
  videos,
  loading,
  initialLoading,
  onLoadMore,
  hasMore,
  selectedCategory = "all",
  onCategoryChange,
  showCategoryFilter = true,
  sectionType,
}: VideoRowProps) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      return () => container.removeEventListener("scroll", checkScrollButtons);
    }
  }, [videos]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore || !hasMore) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      if (scrollWidth - scrollLeft - clientWidth < 300) {
        onLoadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onLoadMore, hasMore]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Reset scroll position when category changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollLeft = 0;
    }
  }, [selectedCategory]);

  const showEmptyState = videos.length === 0 && !loading;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          {showCategoryFilter && onCategoryChange && (
            <Select value={selectedCategory} onValueChange={(value) => onCategoryChange(value as VideoCategory)}>
              <SelectTrigger className="w-36 bg-background border-border">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {sectionType && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/videos/${sectionType}`)}>
              View All
            </Button>
          )}
        </div>
      </div>

      <div className="relative group">
        {/* Left scroll button */}
        {canScrollLeft && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {initialLoading ? (
            <VideoCardSkeleton count={5} />
          ) : showEmptyState ? (
            <div className="flex-shrink-0 w-full text-center py-8 text-muted-foreground">
              No videos found in this category
            </div>
          ) : (
            <>
              {videos.map((video) => (
                <div key={video.id} className="flex-shrink-0 w-72">
                  <VideoCard video={video} />
                </div>
              ))}
              {loading && <VideoCardSkeleton count={2} />}
            </>
          )}
        </div>

        {/* Right scroll button */}
        {(canScrollRight || hasMore) && !showEmptyState && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>
    </section>
  );
};
