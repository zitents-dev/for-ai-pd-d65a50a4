import { LayoutGrid, GraduationCap, Clapperboard, PlayCircle, Megaphone, Wand2, Mic, MoreHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Constants } from "@/integrations/supabase/types";
import { getCategoryLabel, getCategoryIconColor, type VideoCategory } from "@/lib/translations";

const categories = Constants.public.Enums.video_category;

// Map categories to their icons
const categoryIcons: Record<VideoCategory, React.ReactNode> = {
  education: <GraduationCap className="h-4 w-4" />,
  entertainment: <Clapperboard className="h-4 w-4" />,
  tutorial: <PlayCircle className="h-4 w-4" />,
  commercial: <Megaphone className="h-4 w-4" />,
  fiction: <Wand2 className="h-4 w-4" />,
  podcast: <Mic className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  showLabel?: boolean;
  showIcon?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
  showOptionIcons?: boolean;
}

export function CategorySelect({
  value,
  onValueChange,
  showLabel = true,
  showIcon = true,
  required = false,
  placeholder = "카테고리 선택",
  id = "category",
  showAllOption = false,
  allOptionLabel = "전체 카테고리",
  className,
  showOptionIcons = true,
}: CategorySelectProps) {
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue === "__all__" ? "" : newValue);
  };

  return (
    <div className={showLabel ? "space-y-2" : className}>
      {showLabel && (
        <Label htmlFor={id} className="flex items-center gap-1.5">
          {showIcon && <LayoutGrid className="h-4 w-4" />}
          카테고리{required && " *(필수)"}
        </Label>
      )}
      <Select value={showAllOption && !value ? "__all__" : value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} className={!showLabel ? className : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background">
          {showAllOption && (
            <SelectItem value="__all__">{allOptionLabel}</SelectItem>
          )}
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              <span className="flex items-center gap-2">
                {showOptionIcons && (
                  <span className={getCategoryIconColor(cat)}>
                    {categoryIcons[cat]}
                  </span>
                )}
                {getCategoryLabel(cat)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
