import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const isVisible = pullDistance > 10 || isRefreshing;

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-200",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{
        top: `${Math.min(pullDistance, threshold)}px`,
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-lg transition-transform",
          isRefreshing && "animate-pulse"
        )}
        style={{
          transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 360}deg)`,
        }}
      >
        <Loader2
          className={cn(
            "h-5 w-5 text-primary transition-opacity",
            isRefreshing && "animate-spin"
          )}
        />
      </div>
    </div>
  );
};
