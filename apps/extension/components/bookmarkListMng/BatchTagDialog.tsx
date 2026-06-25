/**
 * 批量打标签弹窗组件
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag as TagIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
} from '@hamhome/ui';
import { TagInput } from '@/components/common/TagInput';

interface BatchTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  allTags: string[];
  onConfirm: (tags: string[]) => Promise<void>;
}

export function BatchTagDialog({
  open,
  onOpenChange,
  selectedCount,
  allTags,
  onConfirm,
}: BatchTagDialogProps) {
  const { t } = useTranslation(['common', 'bookmark']);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const resetDialogState = () => {
    setTags([]);
    setSaving(false);
  };

  const handleConfirm = async () => {
    if (tags.length === 0) return;
    setSaving(true);
    try {
      await onConfirm(tags);
      resetDialogState();
      onOpenChange(false);
    } catch (error) {
      console.error('[BatchTagDialog] Failed to add tags:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving && !nextOpen) return;
    if (!nextOpen) {
      resetDialogState();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('bookmark:bookmark.batch.addTags')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {t('bookmark:bookmark.batch.addTagsDescription', { count: selectedCount })}
          </p>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <TagIcon className="h-4 w-4 text-purple-500" />
              {t('bookmark:savePanel.tagsLabel')}
            </Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder={t('bookmark:savePanel.tagPlaceholder')}
              maxTags={10}
              suggestions={allTags}
              className="[&_input]:shadow-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {t('common:common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={saving || tags.length === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('bookmark:savePanel.saving')}
              </>
            ) : (
              <>
                <TagIcon className="h-4 w-4 mr-2" />
                {t('bookmark:bookmark.batch.addTagsConfirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
