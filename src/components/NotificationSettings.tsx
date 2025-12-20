import { useState, useEffect } from "react";
import { Settings, AtSign, Pin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface NotificationSettingsData {
  mention_enabled: boolean;
  comment_pinned_enabled: boolean;
  new_content_enabled: boolean;
}

export const NotificationSettings = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsData>({
    mention_enabled: true,
    comment_pinned_enabled: true,
    new_content_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      loadSettings();
    }
  }, [user, isOpen]);

  const loadSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSettings({
        mention_enabled: data.mention_enabled,
        comment_pinned_enabled: data.comment_pinned_enabled,
        new_content_enabled: data.new_content_enabled,
      });
    }
    // If no settings exist, defaults are already set
  };

  const updateSetting = async (
    key: keyof NotificationSettingsData,
    value: boolean
  ) => {
    if (!user) return;

    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsLoading(true);

    try {
      // Try to upsert the settings
      const { error } = await supabase
        .from("notification_settings")
        .upsert(
          {
            user_id: user.id,
            ...settings,
            [key]: value,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      toast.success("알림 설정이 저장되었습니다");
    } catch (error) {
      console.error("Error updating notification settings:", error);
      setSettings((prev) => ({ ...prev, [key]: !value }));
      toast.error("설정 저장에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>알림 설정</DialogTitle>
          <DialogDescription>
            받고 싶은 알림 유형을 선택하세요
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <AtSign className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="mention" className="text-sm font-medium">
                  멘션 알림
                </Label>
                <p className="text-xs text-muted-foreground">
                  누군가 댓글에서 나를 멘션할 때
                </p>
              </div>
            </div>
            <Switch
              id="mention"
              checked={settings.mention_enabled}
              onCheckedChange={(checked) =>
                updateSetting("mention_enabled", checked)
              }
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Pin className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <Label htmlFor="pinned" className="text-sm font-medium">
                  댓글 고정 알림
                </Label>
                <p className="text-xs text-muted-foreground">
                  크리에이터가 내 댓글을 고정할 때
                </p>
              </div>
            </div>
            <Switch
              id="pinned"
              checked={settings.comment_pinned_enabled}
              onCheckedChange={(checked) =>
                updateSetting("comment_pinned_enabled", checked)
              }
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Video className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <Label htmlFor="new_content" className="text-sm font-medium">
                  새 영상 알림
                </Label>
                <p className="text-xs text-muted-foreground">
                  구독한 크리에이터가 새 영상을 업로드할 때
                </p>
              </div>
            </div>
            <Switch
              id="new_content"
              checked={settings.new_content_enabled}
              onCheckedChange={(checked) =>
                updateSetting("new_content_enabled", checked)
              }
              disabled={isLoading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
