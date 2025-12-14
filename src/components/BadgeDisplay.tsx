import { ShieldCheck, Medal, Trophy, Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type BadgeType =
  | "official"
  | "amateur"
  | "semi_pro"
  | "pro"
  | "director"
  | "gold"
  | "silver"
  | "bronze"
  | "buffer";

interface BadgeItem {
  badge_type: BadgeType;
  award_year?: number | null;
}

interface BadgeDisplayProps {
  badges?: BadgeItem[];
  size?: "sm" | "md" | "lg";
}

const badgeConfig: Record<
  BadgeType,
  {
    icon: typeof ShieldCheck;
    label: string;
    bgColor: string;
    iconColor: string;
  }
> = {
  official: {
    icon: ShieldCheck,
    label: "공식 인증",
    bgColor: "bg-blue-500",
    iconColor: "text-white",
  },
  amateur: {
    icon: Star,
    label: "아마추어",
    bgColor: "bg-green-500",
    iconColor: "text-white",
  },
  semi_pro: {
    icon: Star,
    label: "세미프로",
    bgColor: "bg-yellow-500",
    iconColor: "text-white",
  },
  pro: {
    icon: Star,
    label: "프로",
    bgColor: "bg-orange-500",
    iconColor: "text-white",
  },
  director: {
    icon: Star,
    label: "디렉터",
    bgColor: "bg-red-500",
    iconColor: "text-white",
  },
  gold: {
    icon: Medal,
    label: "Gold",
    bgColor: "bg-gradient-to-br from-yellow-300 to-yellow-600",
    iconColor: "text-yellow-900",
  },
  silver: {
    icon: Medal,
    label: "Silver",
    bgColor: "bg-gradient-to-br from-gray-200 to-gray-400",
    iconColor: "text-gray-700",
  },
  bronze: {
    icon: Medal,
    label: "Bronze",
    bgColor: "bg-gradient-to-br from-orange-300 to-orange-600",
    iconColor: "text-orange-900",
  },
  buffer: {
    icon: Trophy,
    label: "버퍼 뱃지",
    bgColor: "bg-purple-500",
    iconColor: "text-white",
  },
};

export const BadgeDisplay = ({ badges, size = "md" }: BadgeDisplayProps) => {
  if (!badges || badges.length === 0) return null;

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 flex-wrap">
        {badges.map((badge, index) => {
          const config = badgeConfig[badge.badge_type];
          if (!config) return null;

          const Icon = config.icon;
          const isAward = ["gold", "silver", "bronze"].includes(badge.badge_type);
          const tooltipLabel = isAward && badge.award_year
            ? `${badge.award_year} ${config.label}`
            : config.label;

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center cursor-default shadow-sm transition-transform hover:scale-110",
                    sizeClasses[size],
                    config.bgColor
                  )}
                >
                  <Icon className={cn(iconSizeClasses[size], config.iconColor)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                {tooltipLabel}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};