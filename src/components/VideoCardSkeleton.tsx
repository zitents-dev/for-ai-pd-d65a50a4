import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface VideoCardSkeletonProps {
  count?: number;
}

export const VideoCardSkeleton = ({ count = 1 }: VideoCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex-shrink-0 w-72 animate-fade-in">
          <Card className="overflow-hidden">
            {/* Thumbnail skeleton */}
            <Skeleton className="aspect-video w-full" />
            
            <div className="p-4">
              <div className="flex gap-3">
                {/* Avatar skeleton */}
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title skeleton */}
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  
                  {/* Channel name skeleton */}
                  <Skeleton className="h-3 w-24" />
                  
                  {/* Meta info skeleton */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ))}
    </>
  );
};
