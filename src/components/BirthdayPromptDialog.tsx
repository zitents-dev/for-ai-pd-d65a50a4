import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function BirthdayPromptDialog() {
  const [open, setOpen] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkBirthday = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('birthday')
        .eq('id', user.id)
        .maybeSingle();

      // Show dialog if user exists but has no birthday set
      if (profile && !profile.birthday) {
        setOpen(true);
      }
    };

    checkBirthday();
  }, [user]);

  const handleSave = async () => {
    if (!birthday) {
      toast.error('생년월일을 입력해주세요');
      return;
    }

    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ birthday })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      toast.error('저장에 실패했습니다');
    } else {
      toast.success('생년월일이 저장되었습니다');
      setOpen(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>생년월일 입력</DialogTitle>
          <DialogDescription>
            프로필 완성을 위해 생년월일을 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="birthday">생년월일</Label>
            <Input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleSkip} disabled={loading}>
              나중에
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
