import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Settings, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate?: () => void;
}

type Quality = "480p" | "720p" | "1080p" | "auto";

const QUALITY_LABELS: Record<Quality, string> = {
  auto: "Auto",
  "480p": "480p",
  "720p": "720p HD",
  "1080p": "1080p Full HD",
};

export const VideoPlayer = ({ videoUrl, onTimeUpdate }: VideoPlayerProps) => {
  const [selectedQuality, setSelectedQuality] = useState<Quality>("auto");
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // In a real implementation, you would have different URLs for each quality
  // For now, we use the same URL but the UI is ready for multiple qualities
  const getVideoUrl = (quality: Quality): string => {
    // This is where you would map to different quality URLs
    // Example: return videoUrls[quality] || videoUrl;
    return videoUrl;
  };

  const handleQualityChange = (quality: Quality) => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const isPaused = videoRef.current.paused;
      
      setSelectedQuality(quality);
      
      // Wait for video to load, then restore position
      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
          if (!isPaused) {
            videoRef.current.play();
          }
        }
        videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={getVideoUrl(selectedQuality)}
        controls
        className="w-full aspect-video"
        autoPlay
        onTimeUpdate={onTimeUpdate}
      />
      
      {/* Quality Selector Overlay */}
      <div
        className={`absolute bottom-16 right-4 transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="bg-black/80 hover:bg-black/90 text-white border-0 backdrop-blur-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              {QUALITY_LABELS[selectedQuality]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="bg-popover/95 backdrop-blur-sm border-border z-50"
          >
            <div className="px-2 py-1.5 text-sm font-semibold text-foreground">
              Video Quality
            </div>
            {(Object.keys(QUALITY_LABELS) as Quality[]).map((quality) => (
              <DropdownMenuItem
                key={quality}
                onClick={() => handleQualityChange(quality)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{QUALITY_LABELS[quality]}</span>
                {selectedQuality === quality && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quality Badge */}
      <div
        className={`absolute top-4 right-4 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium backdrop-blur-sm transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {QUALITY_LABELS[selectedQuality]}
      </div>
    </div>
  );
};
