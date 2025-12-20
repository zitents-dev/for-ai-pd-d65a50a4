import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VideoEvaluationProps {
  videoId: string;
}

interface EvaluationAverages {
  consistency: number | null;
  probability: number | null;
}

export const VideoEvaluation = ({ videoId }: VideoEvaluationProps) => {
  const { user } = useAuth();
  const [userConsistencyScore, setUserConsistencyScore] = useState<number | null>(null);
  const [userProbabilityScore, setUserProbabilityScore] = useState<number | null>(null);
  const [averages, setAverages] = useState<EvaluationAverages>({ consistency: null, probability: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAverages();
    if (user) {
      loadUserEvaluation();
    }
  }, [videoId, user]);

  const loadAverages = async () => {
    try {
      const { data } = await supabase
        .from("video_evaluations")
        .select("consistency_score, probability_score")
        .eq("video_id", videoId);

      if (data && data.length > 0) {
        const consistencyScores = data.filter(e => e.consistency_score !== null).map(e => e.consistency_score!);
        const probabilityScores = data.filter(e => e.probability_score !== null).map(e => e.probability_score!);
        
        setAverages({
          consistency: consistencyScores.length > 0 
            ? Number((consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length).toFixed(2))
            : null,
          probability: probabilityScores.length > 0
            ? Number((probabilityScores.reduce((a, b) => a + b, 0) / probabilityScores.length).toFixed(2))
            : null,
        });
      }
    } catch (error) {
      console.error("Error loading evaluation averages:", error);
    }
  };

  const loadUserEvaluation = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from("video_evaluations")
        .select("consistency_score, probability_score")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setUserConsistencyScore(data.consistency_score);
        setUserProbabilityScore(data.probability_score);
      }
    } catch (error) {
      console.error("Error loading user evaluation:", error);
    }
  };

  const handleScore = async (type: "consistency" | "probability", score: number) => {
    if (!user) {
      toast.error("평가하려면 로그인이 필요합니다");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const currentScore = type === "consistency" ? userConsistencyScore : userProbabilityScore;
      const newScore = currentScore === score ? null : score;
      
      const updateData = type === "consistency" 
        ? { consistency_score: newScore }
        : { probability_score: newScore };

      const { data: existing } = await supabase
        .from("video_evaluations")
        .select("id")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("video_evaluations")
          .update(updateData)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("video_evaluations")
          .insert({
            video_id: videoId,
            user_id: user.id,
            ...updateData,
          });
      }

      if (type === "consistency") {
        setUserConsistencyScore(newScore);
      } else {
        setUserProbabilityScore(newScore);
      }

      await loadAverages();
      toast.success(newScore !== null ? "평가가 저장되었습니다" : "평가가 취소되었습니다");
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("평가 저장에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const ScoreButton = ({ 
    score, 
    selectedScore, 
    onClick 
  }: { 
    score: number; 
    selectedScore: number | null; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "w-8 h-8 rounded-full text-sm font-medium transition-all",
        "border hover:bg-primary hover:text-primary-foreground hover:border-primary",
        selectedScore === score
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      {score}
    </button>
  );

  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
      {/* Consistency Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 min-w-[100px]">
          <span className="text-sm font-medium text-foreground">일관성</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p>이 동영상에 등장하는 피사체들은 일관성이 있나요?</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <ScoreButton
              key={score}
              score={score}
              selectedScore={userConsistencyScore}
              onClick={() => handleScore("consistency", score)}
            />
          ))}
        </div>
        {averages.consistency !== null && (
          <span className="text-sm text-muted-foreground ml-2">
            평균: <span className="font-semibold text-foreground">{averages.consistency.toFixed(2)}</span>
          </span>
        )}
      </div>

      {/* Probability Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 min-w-[100px]">
          <span className="text-sm font-medium text-foreground">개연성</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p>이 동영상의 내용은 개연성이 있나요?</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <ScoreButton
              key={score}
              score={score}
              selectedScore={userProbabilityScore}
              onClick={() => handleScore("probability", score)}
            />
          ))}
        </div>
        {averages.probability !== null && (
          <span className="text-sm text-muted-foreground ml-2">
            평균: <span className="font-semibold text-foreground">{averages.probability.toFixed(2)}</span>
          </span>
        )}
      </div>
    </div>
  );
};

// Hook for fetching evaluation averages (used in VideoCard)
export const useVideoEvaluationAverages = (videoId: string) => {
  const [averages, setAverages] = useState<EvaluationAverages>({ consistency: null, probability: null });

  useEffect(() => {
    const loadAverages = async () => {
      try {
        const { data } = await supabase
          .from("video_evaluations")
          .select("consistency_score, probability_score")
          .eq("video_id", videoId);

        if (data && data.length > 0) {
          const consistencyScores = data.filter(e => e.consistency_score !== null).map(e => e.consistency_score!);
          const probabilityScores = data.filter(e => e.probability_score !== null).map(e => e.probability_score!);
          
          setAverages({
            consistency: consistencyScores.length > 0 
              ? Number((consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length).toFixed(2))
              : null,
            probability: probabilityScores.length > 0
              ? Number((probabilityScores.reduce((a, b) => a + b, 0) / probabilityScores.length).toFixed(2))
              : null,
          });
        }
      } catch (error) {
        console.error("Error loading evaluation averages:", error);
      }
    };

    loadAverages();
  }, [videoId]);

  return averages;
};
