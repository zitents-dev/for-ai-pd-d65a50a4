import { useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { VideoCard } from "./VideoCard";
import { VideoCardSkeleton } from "./VideoCardSkeleton";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url?: string;
  duration: number | null;
  views: number;
  created_at: string;
  likes_count?: number;
  dislikes_count?: number;
  creator_id?: string;
  show_prompt?: boolean | null;
  prompt_command?: string | null;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

interface VirtualVideoGridProps {
  videos: Video[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  columns?: number;
}

export function VirtualVideoGrid({
  videos,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
}: VirtualVideoGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggered = useRef(false);

  // Calculate columns based on container width
  const getColumns = useCallback(() => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 1024) return 2;
    if (width < 1280) return 3;
    return 4;
  }, []);

  const columns = getColumns();
  const rowCount = Math.ceil(videos.length / columns);
  const estimatedRowHeight = 340; // Approximate height of VideoCard

  const virtualizer = useVirtualizer({
    count: rowCount + (hasMore ? 1 : 0), // Add extra row for loading more
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 2,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // Handle load more when reaching the end
  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1];
    if (!lastItem) return;

    // If we're at the last row and there's more to load
    if (
      lastItem.index >= rowCount - 1 &&
      hasMore &&
      !loadingMore &&
      !loading &&
      onLoadMore &&
      !loadMoreTriggered.current
    ) {
      loadMoreTriggered.current = true;
      onLoadMore();
    }
  }, [virtualRows, rowCount, hasMore, loadingMore, loading, onLoadMore]);

  // Reset trigger when loadingMore changes
  useEffect(() => {
    if (!loadingMore) {
      loadMoreTriggered.current = false;
    }
  }, [loadingMore]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      virtualizer.measure();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [virtualizer]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <VideoCardSkeleton count={8} variant="grid" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground text-lg">No videos found.</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-200px)] overflow-auto"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualRows.map((virtualRow) => {
          const isLoaderRow = virtualRow.index >= rowCount;
          const startIndex = virtualRow.index * columns;
          const rowVideos = videos.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow ? (
                loadingMore && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
                    <VideoCardSkeleton count={columns} variant="grid" />
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
                  {rowVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* End of list indicator */}
      {!hasMore && videos.length > 0 && (
        <div className="text-center text-muted-foreground py-4">
          No more videos to load
        </div>
      )}
    </div>
  );
}
