import { Sparkles, Film, Play, Zap, Banana, MoreHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Constants } from "@/integrations/supabase/types";
import { getAiSolutionLabel, getAiSolutionIconColor, type AiSolution } from "@/lib/translations";

const aiSolutions = Constants.public.Enums.ai_solution;

// Map AI solutions to their icons
const aiSolutionIcons: Record<AiSolution, React.ReactNode> = {
  Sora: <Sparkles className="h-4 w-4" />,
  Runway: <Film className="h-4 w-4" />,
  Veo: <Play className="h-4 w-4" />,
  Pika: <Zap className="h-4 w-4" />,
  NanoBanana: <Banana className="h-4 w-4" />,
  Other: <MoreHorizontal className="h-4 w-4" />,
};

interface AiSolutionSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  showLabel?: boolean;
  showIcon?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
  showOptionIcons?: boolean;
}

export function AiSolutionSelect({
  value,
  onValueChange,
  showLabel = true,
  showIcon = true,
  required = false,
  placeholder = "AI 솔루션 선택",
  id = "ai_solution",
  showAllOption = false,
  allOptionLabel = "전체 솔루션",
  className,
  showOptionIcons = true,
}: AiSolutionSelectProps) {
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue === "__all__" ? "" : newValue);
  };

  return (
    <div className={showLabel ? "space-y-2" : className}>
      {showLabel && (
        <Label htmlFor={id} className="flex items-center gap-1.5">
          {showIcon && <Sparkles className="h-4 w-4" />}
          AI 솔루션{required && " *(필수)"}
        </Label>
      )}
      <Select value={showAllOption && !value ? "__all__" : value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} className={!showLabel ? className : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background">
          {showAllOption && (
            <SelectItem value="__all__">{allOptionLabel}</SelectItem>
          )}
          {aiSolutions.map((solution) => (
            <SelectItem key={solution} value={solution}>
              <span className="flex items-center gap-2">
                {showOptionIcons && (
                  <span className={getAiSolutionIconColor(solution)}>
                    {aiSolutionIcons[solution]}
                  </span>
                )}
                {getAiSolutionLabel(solution)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
