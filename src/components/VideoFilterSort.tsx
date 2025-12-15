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
import { Label } from "@/components/ui/label";
import { CalendarIcon, ArrowUpDown, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { DateRange } from "react-day-picker";

export type SortOption = "recent" | "views" | "likes" | "dislikes" | "comments";

interface VideoFilterSortProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
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
}: VideoFilterSortProps) {
  const [dateOpen, setDateOpen] = useState(false);

  const handleClearDate = () => {
    onDateRangeChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
}
