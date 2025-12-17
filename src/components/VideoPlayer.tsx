import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Check } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
}

type Resolution = "auto" | "1080p" | "720p" | "480p" | "360p";

const resolutionLabels: Record<Resolution, string> = {
  auto: "자동",
  "1080p": "1080p (HD)",
  "720p": "720p",
  "480p": "480p",
  "360p": "360p",
};

export function VideoPlayer({ src, autoPlay = false, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolution, setResolution] = useState<Resolution>(() => {
    const saved = localStorage.getItem("video-resolution-preference");
    return (saved as Resolution) || "auto";
  });
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    localStorage.setItem("video-resolution-preference", resolution);
  }, [resolution]);

  // Apply resolution scale (CSS-based for single source videos)
  // In a real implementation with HLS/DASH, this would switch streams
  const getVideoStyle = () => {
    const baseStyle = "w-full aspect-video bg-black";
    
    // For single-source videos, we use CSS rendering hints
    // In production with multiple quality streams, this would switch sources
    switch (resolution) {
      case "360p":
        return `${baseStyle} [image-rendering:pixelated]`;
      case "480p":
        return `${baseStyle} [image-rendering:auto]`;
      case "720p":
      case "1080p":
      case "auto":
      default:
        return `${baseStyle} [image-rendering:high-quality]`;
    }
  };

  return (
    <div 
      className={`relative group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        controls
        className={getVideoStyle()}
        autoPlay={autoPlay}
      />
      
      {/* Resolution Settings */}
      <div 
        className={`absolute bottom-14 right-4 transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-black/70 hover:bg-black/90 text-white border-0"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs">{resolutionLabels[resolution]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(Object.keys(resolutionLabels) as Resolution[]).map((res) => (
              <DropdownMenuItem
                key={res}
                onClick={() => setResolution(res)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{resolutionLabels[res]}</span>
                {resolution === res && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
