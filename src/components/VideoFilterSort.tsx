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
import { CalendarIcon, ArrowUpDown, X, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Constants } from "@/integrations/supabase/types";

export type SortOption = "recent" | "views" | "likes" | "dislikes" | "comments";

const AI_SOLUTIONS = Constants.public.Enums.ai_solution;
const CATEGORIES = Constants.public.Enums.video_category;

interface Directory {
  id: string;
  name: string;
  video_count?: number;
}

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
}: VideoFilterSortProps) {
  const [dateOpen, setDateOpen] = useState(false);

  const handleClearDate = () => {
    onDateRangeChange(undefined);
  };

  const hasActiveFilters = searchQuery || categoryFilter || aiSolutionFilter || directoryFilter;

  const clearAllFilters = () => {
    onSearchQueryChange?.("");
    onCategoryFilterChange?.("");
    onAiSolutionFilterChange?.("");
    onDirectoryFilterChange?.("");
  };

  return (
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

      {/* Category Filter */}
      {onCategoryFilterChange && (
        <Select 
          value={categoryFilter || "__all__"} 
          onValueChange={(value) => onCategoryFilterChange(value === "__all__" ? "" : value)}
        >
          <SelectTrigger className="w-[130px] h-9">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="__all__">전체 카테고리</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
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
            <Filter className="mr-2 h-4 w-4" />
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

      {/* Directory Filter */}
      {onDirectoryFilterChange && directories.length > 0 && (
        <Select 
          value={directoryFilter || "__all__"} 
          onValueChange={(value) => onDirectoryFilterChange(value === "__all__" ? "" : value)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="mr-2 h-4 w-4" />
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

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-9" onClick={clearAllFilters}>
          <X className="mr-2 h-4 w-4" />
          필터 초기화
        </Button>
      )}
    </div>
  );
}
