import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ReportDialogProps {
  videoId: string;
}

const REPORT_REASONS = [
  "AI 작품이 아님",
  "성적인 콘텐츠",
  "폭력적 또는 혐오스러운 콘텐츠",
  "증오 또는 악의적인 콘텐츠",
  "괴롭힘 또는 폭력",
  "유해하거나 위험한 행위",
  "잘못된 정보",
  "아동 학대",
  "테러 조장",
  "스팸 또는 혼동을 야기하는 콘텐츠",
  "법적 문제",
  "캡션 문제",
];

export const ReportDialog = ({ videoId }: ReportDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }

    if (!reason) {
      toast.error("신고 사유를 선택해주세요");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("reports").insert({
        video_id: videoId,
        reporter_id: user.id,
        reason,
        details,
      });

      if (error) throw error;

      toast.success("신고가 접수되었습니다");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("신고 접수에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Flag className="w-4 h-4" />
          신고
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>동영상 신고</DialogTitle>
          <DialogDescription>부적절한 콘텐츠를 신고해주세요. 모든 신고는 검토됩니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>신고 사유</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">상세 내용 (선택사항)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="추가 정보를 입력해주세요"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? "접수 중..." : "신고하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
