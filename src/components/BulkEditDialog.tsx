import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVideoIds: string[];
  onSuccess: () => void;
}

const AI_SOLUTIONS = Constants.public.Enums.ai_solution;
const CATEGORIES = Constants.public.Enums.video_category;

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedVideoIds,
  onSuccess,
}: BulkEditDialogProps) {
  const [category, setCategory] = useState<string>("");
  const [aiSolution, setAiSolution] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!category && !aiSolution) {
      toast.error("변경할 항목을 선택하세요");
      return;
    }

    setIsSaving(true);
    try {
      const updateData: Record<string, string> = {};
      if (category) updateData.category = category;
      if (aiSolution) updateData.ai_solution = aiSolution;

      const { error } = await supabase
        .from("videos")
        .update(updateData)
        .in("id", selectedVideoIds);

      if (error) throw error;

      toast.success(`${selectedVideoIds.length}개의 작품이 수정되었습니다`);
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error("작품 수정에 실패했습니다");
      console.error("Bulk edit error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setCategory("");
    setAiSolution("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>일괄 수정</DialogTitle>
          <DialogDescription>
            선택한 {selectedVideoIds.length}개의 작품을 일괄 수정합니다.
            변경하지 않을 항목은 비워두세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>카테고리</Label>
            <Select value={category} onValueChange={(value) => setCategory(value === "__none__" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="변경할 카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">변경하지 않음</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>AI 솔루션</Label>
            <Select value={aiSolution} onValueChange={(value) => setAiSolution(value === "__none__" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="변경할 AI 솔루션 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">변경하지 않음</SelectItem>
                {AI_SOLUTIONS.map((solution) => (
                  <SelectItem key={solution} value={solution}>
                    {solution}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving || (!category && !aiSolution)}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            수정하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
