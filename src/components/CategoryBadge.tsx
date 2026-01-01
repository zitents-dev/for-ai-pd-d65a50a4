import { GraduationCap, Clapperboard, PlayCircle, Megaphone, Wand2, Mic, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCategoryLabel, getCategoryClassName, getCategoryIconColor, type VideoCategory } from "@/lib/translations";

// Map categories to their icons
const categoryIcons: Record<VideoCategory, React.ReactNode> = {
  education: <GraduationCap className="h-3 w-3" />,
  entertainment: <Clapperboard className="h-3 w-3" />,
  tutorial: <PlayCircle className="h-3 w-3" />,
  commercial: <Megaphone className="h-3 w-3" />,
  fiction: <Wand2 className="h-3 w-3" />,
  podcast: <Mic className="h-3 w-3" />,
  other: <MoreHorizontal className="h-3 w-3" />,
};

interface CategoryBadgeProps {
  category: string | null;
  showIcon?: boolean;
  className?: string;
}

export function CategoryBadge({ category, showIcon = true, className }: CategoryBadgeProps) {
  if (!category) return null;

  const icon = categoryIcons[category as VideoCategory];
  const iconColor = getCategoryIconColor(category);

  return (
    <Badge className={`${getCategoryClassName(category)} ${className || ""}`}>
      <span className="flex items-center gap-1">
        {showIcon && icon && <span className={iconColor}>{icon}</span>}
        {getCategoryLabel(category)}
      </span>
    </Badge>
  );
}
