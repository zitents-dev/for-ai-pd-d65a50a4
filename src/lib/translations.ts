import type { Database } from "@/integrations/supabase/types";

export type VideoCategory = Database["public"]["Enums"]["video_category"];
export type AiSolution = Database["public"]["Enums"]["ai_solution"];

// Category translations and styles with icon colors
export const categoryConfig: Record<VideoCategory, { label: string; className: string; iconColor: string }> = {
  education: {
    label: "교육",
    className: "bg-blue-500/20 text-blue-600 border-blue-500/30 hover:bg-blue-500/30",
    iconColor: "text-blue-500",
  },
  entertainment: {
    label: "엔터테인먼트",
    className: "bg-purple-500/20 text-purple-600 border-purple-500/30 hover:bg-purple-500/30",
    iconColor: "text-purple-500",
  },
  tutorial: {
    label: "튜토리얼",
    className: "bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30",
    iconColor: "text-green-500",
  },
  commercial: {
    label: "광고",
    className: "bg-orange-500/20 text-orange-600 border-orange-500/30 hover:bg-orange-500/30",
    iconColor: "text-orange-500",
  },
  fiction: {
    label: "픽션",
    className: "bg-pink-500/20 text-pink-600 border-pink-500/30 hover:bg-pink-500/30",
    iconColor: "text-pink-500",
  },
  podcast: {
    label: "팟캐스트",
    className: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30 hover:bg-cyan-500/30",
    iconColor: "text-cyan-500",
  },
  other: {
    label: "기타",
    className: "bg-gray-500/20 text-gray-600 border-gray-500/30 hover:bg-gray-500/30",
    iconColor: "text-gray-500",
  },
};

export function getCategoryIconColor(category: VideoCategory | string | null): string {
  if (!category) return "text-gray-500";
  return categoryConfig[category as VideoCategory]?.iconColor || "text-gray-500";
}

// AI Solution styles with icon names
export const aiSolutionConfig: Record<AiSolution, { label: string; className: string; iconColor: string }> = {
  Sora: {
    label: "Sora",
    className: "bg-blue-500/20 text-blue-600 border-blue-500/30 hover:bg-blue-500/30",
    iconColor: "text-blue-500",
  },
  Runway: {
    label: "Runway",
    className: "bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/30",
    iconColor: "text-red-500",
  },
  Veo: {
    label: "Veo",
    className: "bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30",
    iconColor: "text-green-500",
  },
  Pika: {
    label: "Pika",
    className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30",
    iconColor: "text-yellow-500",
  },
  NanoBanana: {
    label: "NanoBanana",
    className: "bg-purple-500/20 text-purple-600 border-purple-500/30 hover:bg-purple-500/30",
    iconColor: "text-purple-500",
  },
  Other: {
    label: "기타",
    className: "bg-gray-500/20 text-gray-600 border-gray-500/30 hover:bg-gray-500/30",
    iconColor: "text-gray-500",
  },
};

export function getAiSolutionIconColor(aiSolution: AiSolution | string | null): string {
  if (!aiSolution) return "text-gray-500";
  return aiSolutionConfig[aiSolution as AiSolution]?.iconColor || "text-gray-500";
}

export function getCategoryLabel(category: VideoCategory | string | null): string {
  if (!category) return "-";
  return categoryConfig[category as VideoCategory]?.label || category;
}

export function getCategoryClassName(category: VideoCategory | string | null): string {
  if (!category) return "";
  return categoryConfig[category as VideoCategory]?.className || categoryConfig.other.className;
}

export function getAiSolutionLabel(aiSolution: AiSolution | string | null): string {
  if (!aiSolution) return "-";
  return aiSolutionConfig[aiSolution as AiSolution]?.label || aiSolution;
}

export function getAiSolutionClassName(aiSolution: AiSolution | string | null): string {
  if (!aiSolution) return "";
  return aiSolutionConfig[aiSolution as AiSolution]?.className || aiSolutionConfig.Other.className;
}
