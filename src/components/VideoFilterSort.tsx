import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { CalendarIcon, ArrowUpDown, X, Filter, Search, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Constants } from "@/integrations/supabase/types";
import { getCategoryLabel } from "@/lib/translations";

export type SortOption = "recent" | "views" | "likes" | "dislikes" | "comments";

const AI_SOLUTIONS = Constants.public.Enums.ai_solution;
const CATEGORIES = Constants.public.Enums.video_category;

export type DurationFilter = "" | "under1" | "1to5" | "over5";

interface Directory {
  id: string;
  name: string;
  video_count?: number;
}

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "", label: "전체 길이" },
  { value: "under1", label: "1분 미만" },
  { value: "1to5", label: "1~5분" },
  { value: "over5", label: "5분 이상" },
];

interface VideoFilterSortProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  // New filter props
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  aiSolutionFilter?: string;
  onAiSolutionFilterChange?: (solution: string) => void;
  directoryFilter?: string;
  onDirectoryFilterChange?: (directoryId: string) => void;
  directories?: Directory[];
  durationFilter?: DurationFilter;
  onDurationFilterChange?: (duration: DurationFilter) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "최신순" },
  { value: "views", label: "시청 횟수 순" },
  { value: "likes", label: "좋아요 수 순" },
  { value: "dislikes", label: "싫어요 수 순" },
  { value: "comments", label: "댓글 수 순" },
];

export function VideoFilterSort({
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  aiSolutionFilter,
  onAiSolutionFilterChange,
  directoryFilter,
  onDirectoryFilterChange,
  directories = [],
  durationFilter,
  onDurationFilterChange,
}: VideoFilterSortProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClearDate = () => {
    onDateRangeChange(undefined);
  };

  const hasActiveFilters = categoryFilter || aiSolutionFilter || directoryFilter || durationFilter;
  const activeFilterCount = [categoryFilter, aiSolutionFilter, directoryFilter, durationFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    onCategoryFilterChange?.("");
    onAiSolutionFilterChange?.("");
    onDirectoryFilterChange?.("");
    onDurationFilterChange?.("");
  };

  const showFilterRow = onCategoryFilterChange || onAiSolutionFilterChange || onDurationFilterChange || (onDirectoryFilterChange && directories.length > 0);

  return (
    <div className="space-y-2">
      {/* Row 1: Search, Sort, Date - Always visible */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Box */}
        {onSearchQueryChange && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="제목 검색..."
              value={searchQuery || ""}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="h-9 w-[180px] pl-8"
            />
          </div>
        )}

        {/* Sort Select */}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
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

        {/* Date Range Filter */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MM.dd", { locale: ko })} -{" "}
                    {format(dateRange.to, "MM.dd", { locale: ko })}
                  </>
                ) : (
                  format(dateRange.from, "yyyy.MM.dd", { locale: ko })
                )
              ) : (
                "기간 설정"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={ko}
            />
            {dateRange && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={handleClearDate}
                >
                  <X className="mr-2 h-4 w-4" />
                  기간 초기화
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 2: Filter toggle + horizontal expanding filters */}
      {showFilterRow && (
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
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-200 ${isExpanded ? 'opacity-100 max-w-[600px]' : 'opacity-0 max-w-0'}`}>
            {/* Category Filter */}
            {onCategoryFilterChange && (
              <Select 
                value={categoryFilter || "__all__"} 
                onValueChange={(value) => onCategoryFilterChange(value === "__all__" ? "" : value)}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="__all__">전체 카테고리</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* AI Solution Filter */}
            {onAiSolutionFilterChange && (
              <Select 
                value={aiSolutionFilter || "__all__"} 
                onValueChange={(value) => onAiSolutionFilterChange(value === "__all__" ? "" : value)}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="AI 솔루션" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="__all__">전체 솔루션</SelectItem>
                  {AI_SOLUTIONS.map((solution) => (
                    <SelectItem key={solution} value={solution}>
                      {solution}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Duration Filter */}
            {onDurationFilterChange && (
              <Select 
                value={durationFilter || "__all__"} 
                onValueChange={(value) => onDurationFilterChange(value === "__all__" ? "" : value as DurationFilter)}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="길이" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Directory Filter */}
            {onDirectoryFilterChange && directories.length > 0 && (
              <Select 
                value={directoryFilter || "__all__"} 
                onValueChange={(value) => onDirectoryFilterChange(value === "__all__" ? "" : value)}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="디렉토리" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="__all__">전체 디렉토리</SelectItem>
                  {directories.map((dir) => (
                    <SelectItem key={dir.id} value={dir.id}>
                      <span className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{dir.name}</span>
                        <span className="text-muted-foreground text-xs">({dir.video_count ?? 0})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
      )}
    </div>
  );
}
