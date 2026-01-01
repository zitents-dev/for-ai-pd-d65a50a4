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
}

export function CategorySelect({
  value,
  onValueChange,
  showLabel = true,
  showIcon = true,
  required = false,
  placeholder = "카테고리 선택",
  id = "category",
}: CategorySelectProps) {
  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor={id} className="flex items-center gap-1.5">
          {showIcon && <LayoutGrid className="h-4 w-4" />}
          카테고리{required && " *(필수)"}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background">
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
