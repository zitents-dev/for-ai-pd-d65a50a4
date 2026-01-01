import { LayoutGrid } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Constants } from "@/integrations/supabase/types";
import { getCategoryLabel } from "@/lib/translations";

const categories = Constants.public.Enums.video_category;

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
              {getCategoryLabel(cat)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
