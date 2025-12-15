import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

interface VideoEditDialogProps {
  video: {
    id: string;
    title: string;
    description?: string | null;
    ai_solution?: string | null;
    category?: string | null;
    prompt_command?: string | null;
    show_prompt?: boolean | null;
    tags?: string[] | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const aiSolutions = Constants.public.Enums.ai_solution;
const categories = Constants.public.Enums.video_category;

export function VideoEditDialog({
  video,
  open,
  onOpenChange,
  onSaved,
}: VideoEditDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiSolution, setAiSolution] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [promptCommand, setPromptCommand] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (video) {
      setTitle(video.title || "");
      setDescription(video.description || "");
      setAiSolution(video.ai_solution || "");
      setCategory(video.category || "");
      setPromptCommand(video.prompt_command || "");
      setShowPrompt(video.show_prompt || false);
      setTags(video.tags || []);
    }
  }, [video]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  }, [tags]);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  }, [isComposing, handleAddTag]);

  const handleSave = async () => {
    if (!video) return;

    if (!title.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }

    setIsSaving(true);

    try {
      const updateData: {
        title: string;
        description: string | null;
        ai_solution?: "NanoBanana" | "Veo" | "Sora" | "Runway" | "Pika" | "Other" | null;
        category?: "education" | "commercial" | "fiction" | "podcast" | "entertainment" | "tutorial" | "other" | null;
        prompt_command: string | null;
        show_prompt: boolean;
        tags: string[] | null;
      } = {
        title: title.trim(),
        description: description.trim() || null,
        prompt_command: promptCommand.trim() || null,
        show_prompt: showPrompt,
        tags: tags.length > 0 ? tags : null,
      };

      if (aiSolution) {
        updateData.ai_solution = aiSolution as "NanoBanana" | "Veo" | "Sora" | "Runway" | "Pika" | "Other";
      } else {
        updateData.ai_solution = null;
      }

      if (category) {
        updateData.category = category as "education" | "commercial" | "fiction" | "podcast" | "entertainment" | "tutorial" | "other";
      } else {
        updateData.category = null;
      }

      const { error } = await supabase
        .from("videos")
        .update(updateData)
        .eq("id", video.id);

      if (error) throw error;

      toast.success("영상 정보가 수정되었습니다");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating video:", error);
      toast.error("수정에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>영상 정보 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="영상 제목"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="영상 설명"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AI 솔루션</Label>
              <Select value={aiSolution} onValueChange={setAiSolution}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {aiSolutions.map((solution) => (
                    <SelectItem key={solution} value={solution}>
                      {solution}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="promptCommand">프롬프트 명령어</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="showPrompt" className="text-sm text-muted-foreground">
                  공개
                </Label>
                <Switch
                  id="showPrompt"
                  checked={showPrompt}
                  onCheckedChange={setShowPrompt}
                />
              </div>
            </div>
            <Textarea
              id="promptCommand"
              value={promptCommand}
              onChange={(e) => setPromptCommand(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="프롬프트 명령어 입력"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>태그</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="태그 입력 후 Enter"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
