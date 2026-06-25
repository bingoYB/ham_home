/**
 * 批量迁移分类弹窗组件
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
} from '@hamhome/ui';
import { CategorySelect } from '@/components/common/CategorySelect';
import type { LocalCategory } from '@/types';

interface BatchMoveCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  categories: LocalCategory[];
  onConfirm: (categoryId: string | null) => Promise<void>;
}

export function BatchMoveCategoryDialog({
  open,
  onOpenChange,
  selectedCount,
  categories,
  onConfirm,
}: BatchMoveCategoryDialogProps) {
  const { t } = useTranslation(['common', 'bookmark']);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetDialogState = () => {
    setCategoryId(null);
    setSaving(false);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(categoryId);
      resetDialogState();
      onOpenChange(false);
    } catch (error) {
      console.error('[BatchMoveCategoryDialog] Failed to move bookmarks:', error);
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
          <DialogTitle>{t('bookmark:bookmark.batch.moveCategory')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {t('bookmark:bookmark.batch.moveCategoryDescription', { count: selectedCount })}
          </p>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FolderOpen className="h-4 w-4 text-emerald-500" />
              {t('bookmark:savePanel.categoryLabel')}
            </Label>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              categories={categories}
              placeholder={t('bookmark:savePanel.selectCategory')}
              className="[&_button]:shadow-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {t('common:common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('bookmark:savePanel.saving')}
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('bookmark:bookmark.batch.moveCategoryConfirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
