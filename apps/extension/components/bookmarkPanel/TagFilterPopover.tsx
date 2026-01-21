/**
 * TagFilterPopover - 标签筛选弹窗组件
 * 支持搜索标签和多选
 */
import { useState, useMemo } from 'react';
import { Search, X, Check, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
  ScrollArea,
  cn,
} from '@hamhome/ui';
import { useContentUI } from '@/utils/ContentUIContext';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { container: portalContainer } = useContentUI();

  // 过滤标签
  const filteredTags = useMemo(() => {
    if (!searchQuery) return allTags;
    const query = searchQuery.toLowerCase();
    return allTags.filter((tag) => tag.toLowerCase().includes(query));
  }, [allTags, searchQuery]);

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
            标签筛选
          </DialogTitle>
        </DialogHeader>

        {/* 搜索框 */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 已选标签 */}
        {selectedTags.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
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

        {/* 标签列表 */}
        <ScrollArea className="h-[240px] px-2">
          <div className="space-y-0.5 pb-2">
            {filteredTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Tag className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? '未找到匹配的标签' : '暂无标签'}
                </p>
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left',
                      'hover:bg-muted/60 transition-colors',
                      isSelected && 'bg-primary/10 text-primary'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="truncate">{tag}</span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
