import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, X, Filter, ChevronRight } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

export type CreatorSortOption = "name" | "subscribers" | "videos";
export type SubscriberFilter = "" | "under100" | "100to1000" | "over1000";
export type VideoCountFilter = "" | "under10" | "10to50" | "over50";
export type BadgeFilter = "" | "official" | "amateur" | "semi_pro" | "pro" | "director" | "mentor" | "gold" | "silver" | "bronze";

const BADGE_TYPES = Constants.public.Enums.badge_type.filter(b => b !== "buffer");

const SUBSCRIBER_OPTIONS: { value: SubscriberFilter; label: string }[] = [
  { value: "", label: "전체 구독자" },
  { value: "under100", label: "100명 미만" },
  { value: "100to1000", label: "100~1,000명" },
  { value: "over1000", label: "1,000명 이상" },
];

const VIDEO_COUNT_OPTIONS: { value: VideoCountFilter; label: string }[] = [
  { value: "", label: "전체 작품 수" },
  { value: "under10", label: "10개 미만" },
  { value: "10to50", label: "10~50개" },
  { value: "over50", label: "50개 이상" },
];

const BADGE_LABELS: Record<string, string> = {
  official: "공식",
  amateur: "아마추어",
  semi_pro: "세미프로",
  pro: "프로",
  director: "디렉터",
  mentor: "멘토",
  gold: "골드",
  silver: "실버",
  bronze: "브론즈",
};

interface CreatorFilterSortProps {
  sortBy: CreatorSortOption;
  onSortChange: (sort: CreatorSortOption) => void;
  subscriberFilter: SubscriberFilter;
  onSubscriberFilterChange: (filter: SubscriberFilter) => void;
  videoCountFilter: VideoCountFilter;
  onVideoCountFilterChange: (filter: VideoCountFilter) => void;
  badgeFilter: BadgeFilter;
  onBadgeFilterChange: (filter: BadgeFilter) => void;
}

const sortOptions: { value: CreatorSortOption; label: string }[] = [
  { value: "name", label: "이름순" },
  { value: "subscribers", label: "구독자순" },
  { value: "videos", label: "작품 수 순" },
];

export function CreatorFilterSort({
  sortBy,
  onSortChange,
  subscriberFilter,
  onSubscriberFilterChange,
  videoCountFilter,
  onVideoCountFilterChange,
  badgeFilter,
  onBadgeFilterChange,
}: CreatorFilterSortProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = subscriberFilter || videoCountFilter || badgeFilter;
  const activeFilterCount = [subscriberFilter, videoCountFilter, badgeFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    onSubscriberFilterChange("");
    onVideoCountFilterChange("");
    onBadgeFilterChange("");
  };

  return (
    <div className="space-y-2">
      {/* Row 1: Sort */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort Select */}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as CreatorSortOption)}>
          <SelectTrigger className="w-[140px] h-9">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Filter toggle + horizontal expanding filters */}
      <div className="flex items-center gap-2">
        {/* Filter Toggle Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter className="h-4 w-4" />
          필터
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
              {activeFilterCount}
            </span>
          )}
          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>

        {/* Horizontal expanding filters */}
        <div className={`flex items-center gap-2 overflow-hidden transition-all duration-200 ${isExpanded ? 'opacity-100 max-w-[700px]' : 'opacity-0 max-w-0'}`}>
          {/* Subscriber Filter */}
          <Select 
            value={subscriberFilter || "__all__"} 
            onValueChange={(value) => onSubscriberFilterChange(value === "__all__" ? "" : value as SubscriberFilter)}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="구독자 수" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {SUBSCRIBER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Video Count Filter */}
          <Select 
            value={videoCountFilter || "__all__"} 
            onValueChange={(value) => onVideoCountFilterChange(value === "__all__" ? "" : value as VideoCountFilter)}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="작품 수" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {VIDEO_COUNT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Badge Filter */}
          <Select 
            value={badgeFilter || "__all__"} 
            onValueChange={(value) => onBadgeFilterChange(value === "__all__" ? "" : value as BadgeFilter)}
          >
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="뱃지" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="__all__">전체 뱃지</SelectItem>
              {BADGE_TYPES.map((badge) => (
                <SelectItem key={badge} value={badge}>
                  {BADGE_LABELS[badge] || badge}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear All Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearAllFilters}>
              <X className="mr-1 h-4 w-4" />
              초기화
            </Button>
          )}
        </div>

        {/* Show clear button when collapsed with active filters */}
        {!isExpanded && hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearAllFilters}>
            <X className="mr-1 h-4 w-4" />
            초기화
          </Button>
        )}
      </div>
    </div>
  );
}
