/**
 * TagFilterDropdown - 标签筛选下拉
 *
 * 只负责下拉外壳：触发器、已选标签回显、清除入口；
 * 搜索框和标签列表统一交给 TagFilterList（内置虚拟滚动）。
 *
 * 用 Popover 而不是 DropdownMenu：DropdownMenu 会在列表项之间做 roving focus 和
 * 首字母跳转，和内嵌的搜索框、虚拟列表互相打架（打开时焦点会被列表项抢走）。
 */
import { useContext } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@hamhome/ui';
import { ContentUIContext } from '@/utils/ContentUIContext';
import { TagFilterList } from '@/components/common/TagFilterList';

export interface TagFilterDropdownProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags?: () => void;
  /** 在列表上方回显已选标签；上层已经单独展示时可关掉 */
  showSelectedTags?: boolean;
  /** 弹层相对触发器的对齐方式 */
  align?: 'start' | 'center' | 'end';
  /** 触发器 */
  children: React.ReactNode;
}

export function TagFilterDropdown({
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  showSelectedTags = true,
  align = 'end',
  children,
}: TagFilterDropdownProps) {
  const { t } = useTranslation('bookmark');
  // Falls back to undefined (renders into document.body) outside a ContentUIProvider,
  // which is the case on the extension app page
  const portalContainer = useContext(ContentUIContext)?.container;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent container={portalContainer} align={align} className="w-64 p-2">
        {/* 已选标签 */}
        {showSelectedTags && selectedTags.length > 0 && (
          <div className="mb-2 pb-2 border-b border-border space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {t('bookmark:contentPanel.selectedTags')}
            </p>
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

        <TagFilterList
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={onToggleTag}
        />

        {/* 清除按钮 */}
        {selectedTags.length > 0 && onClearTags && (
          <div className="border-t border-border mt-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={onClearTags}
            >
              <X className="h-4 w-4" />
              {t('bookmark:contentPanel.clearAllTags')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
