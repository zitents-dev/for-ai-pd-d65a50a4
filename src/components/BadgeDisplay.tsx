import { BadgeCheck, Bulb, Orbit, Moon, Sun, Star, Crown, Trophy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type BadgeType =
  | "official"
  | "amateur"
  | "semi_pro"
  | "pro"
  | "director"
  | "mentor"
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
    icon: typeof BadgeCheck;
    label: string;
    bgColor: string;
    iconColor: string;
  }
> = {
  official: {
    icon: BadgeCheck,
    label: "공식인증",
    bgColor: "bg-blue-500",
    iconColor: "text-white",
  },
  amateur: {
    icon: Moon,
    label: "아마추어",
    bgColor: "bg-green-500",
    iconColor: "text-white",
  },
  semi_pro: {
    icon: Orbit,
    label: "세미프로",
    bgColor: "bg-yellow-500",
    iconColor: "text-white",
  },
  pro: {
    icon: Sun,
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
  mentor: {
    icon: Bulb,
    label: "멘토",
    bgColor: "bg-green-600",
    iconColor: "text-white",
  },
  gold: {
    icon: Crown,
    label: "Top1",
    bgColor: "bg-gradient-to-br from-yellow-300 to-yellow-600",
    iconColor: "text-yellow-900",
  },
  silver: {
    icon: Crown,
    label: "Top2",
    bgColor: "bg-gradient-to-br from-gray-200 to-gray-400",
    iconColor: "text-gray-700",
  },
  bronze: {
    icon: Crown,
    label: "Top3",
    bgColor: "bg-gradient-to-br from-orange-300 to-orange-600",
    iconColor: "text-orange-900",
  },
  buffer: {
    icon: Trophy,
    label: "buffer",
    bgColor: "bg-purple-500",
    iconColor: "text-white",
  },
};

const premiumBadges: BadgeType[] = ["pro", "director", "mentor", "gold", "silver", "bronze"];

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
          const isPremium = premiumBadges.includes(badge.badge_type);
          const tooltipLabel = isAward && badge.award_year ? `${badge.award_year} ${config.label}` : config.label;

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "relative rounded-full flex items-center justify-center cursor-default shadow-sm overflow-hidden",
                    "animate-in fade-in-0 zoom-in-50 duration-300",
                    "transition-all hover:scale-125 hover:shadow-md hover:-translate-y-0.5",
                    sizeClasses[size],
                    config.bgColor,
                  )}
                  style={{ animationDelay: `${index * 75}ms`, animationFillMode: "backwards" }}
                >
                  {isPremium && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    </div>
                  )}
                  <Icon className={cn(iconSizeClasses[size], config.iconColor, "relative z-10")} />
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
