import { Sparkles, Film, Play, Zap, Banana, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAiSolutionLabel, getAiSolutionClassName, getAiSolutionIconColor, type AiSolution } from "@/lib/translations";

// Map AI solutions to their icons
const aiSolutionIcons: Record<AiSolution, React.ReactNode> = {
  Sora: <Sparkles className="h-3 w-3" />,
  Runway: <Film className="h-3 w-3" />,
  Veo: <Play className="h-3 w-3" />,
  Pika: <Zap className="h-3 w-3" />,
  NanoBanana: <Banana className="h-3 w-3" />,
  Other: <MoreHorizontal className="h-3 w-3" />,
};

interface AiSolutionBadgeProps {
  aiSolution: string | null;
  showIcon?: boolean;
  className?: string;
}

export function AiSolutionBadge({ aiSolution, showIcon = true, className }: AiSolutionBadgeProps) {
  if (!aiSolution) return null;

  const icon = aiSolutionIcons[aiSolution as AiSolution];
  const iconColor = getAiSolutionIconColor(aiSolution);

  return (
    <Badge className={`${getAiSolutionClassName(aiSolution)} ${className || ""}`}>
      <span className="flex items-center gap-1">
        {showIcon && icon && <span className={iconColor}>{icon}</span>}
        {getAiSolutionLabel(aiSolution)}
      </span>
    </Badge>
  );
}
