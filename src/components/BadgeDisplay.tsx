import { Badge } from "@/components/ui/badge";
import { Award, Shield } from "lucide-react";

interface BadgeDisplayProps {
  badges?: Array<{ badge_type: "best" | "official" }>;
  size?: "sm" | "md" | "lg";
}

export const BadgeDisplay = ({ badges, size = "md" }: BadgeDisplayProps) => {
  if (!badges || badges.length === 0) return null;

  const iconSize = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5";
  const badgeSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-1">
      {badges.map((badge, index) => (
        <Badge
          key={index}
          variant={badge.badge_type === "official" ? "default" : "secondary"}
          className={`${badgeSize} gap-1`}
        >
          {badge.badge_type === "official" ? (
            <>
              <Shield className={iconSize} />
              <span>Official</span>
            </>
          ) : (
            <>
              <Award className={iconSize} />
              <span>Best</span>
            </>
          )}
        </Badge>
      ))}
    </div>
  );
};