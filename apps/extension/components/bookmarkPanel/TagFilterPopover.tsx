/**
 * TagFilterPopover - 标签筛选弹窗
 *
 * 窄屏 / 弹窗形态的标签筛选外壳，列表部分和下拉共用 TagFilterList（内置虚拟滚动）。
 */
import { useContext } from 'react';
import { X, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from '@hamhome/ui';
import { ContentUIContext } from '@/utils/ContentUIContext';
import { TagFilterList } from '@/components/common/TagFilterList';

export interface TagFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onConfirm?: () => void;
}

export function TagFilterPopover({
  open,
  onOpenChange,
  allTags,
  selectedTags,
  onToggleTag,
  onConfirm,
}: TagFilterPopoverProps) {
  const { t } = useTranslation(['bookmark', 'common']);
  // Falls back to undefined (renders into document.body) outside a ContentUIProvider,
  // which is the case on the extension app page
  const portalContainer = useContext(ContentUIContext)?.container;

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={portalContainer} className="sm:max-w-[320px] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" />
            {t('bookmark:contentPanel.tagFilter')}
          </DialogTitle>
        </DialogHeader>

        {/* 已选标签 */}
        {selectedTags.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {tag}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-2">
          <TagFilterList
            allTags={allTags}
            selectedTags={selectedTags}
            onToggleTag={onToggleTag}
            height={240}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common:common.cancel')}
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            {t('common:common.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
