import { Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Constants } from "@/integrations/supabase/types";
import { getAiSolutionLabel } from "@/lib/translations";

const aiSolutions = Constants.public.Enums.ai_solution;

interface AiSolutionSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  showLabel?: boolean;
  showIcon?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

export function AiSolutionSelect({
  value,
  onValueChange,
  showLabel = true,
  showIcon = true,
  required = false,
  placeholder = "AI 솔루션 선택",
  id = "ai_solution",
}: AiSolutionSelectProps) {
  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor={id} className="flex items-center gap-1.5">
          {showIcon && <Sparkles className="h-4 w-4" />}
          AI 솔루션{required && " *(필수)"}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background">
          {aiSolutions.map((solution) => (
            <SelectItem key={solution} value={solution}>
              {getAiSolutionLabel(solution)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
