/**
 * TagFilterDropdown - 标签筛选下拉菜单组件
 * 支持多选标签
 */
import { useState, useMemo } from 'react';
import { Tag, Check, Search, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  cn,
} from '@hamhome/ui';
import { useContentUI } from '@/utils/ContentUIContext';

export interface TagFilterDropdownProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags?: () => void;
  children: React.ReactNode;
}

export function TagFilterDropdown({
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  children,
}: TagFilterDropdownProps) {
  const { container: portalContainer } = useContentUI();
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤标签
  const filteredTags = useMemo(() => {
    if (!searchQuery) return allTags;
    const query = searchQuery.toLowerCase();
    return allTags.filter((tag) => tag.toLowerCase().includes(query));
  }, [allTags, searchQuery]);

  const handleToggleTag = (tag: string) => {
    onToggleTag(tag);
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent container={portalContainer} align="end" className="w-64">
        {/* 搜索框 */}
        <div className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="pl-7 pr-6 h-8 text-xs"
            />
            {searchQuery && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* 已选标签 */}
        {selectedTags.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              已选标签
            </DropdownMenuLabel>
            <div className="px-2 pb-1">
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTag(tag);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 标签列表 */}
        {filteredTags.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <div className="max-h-[200px] overflow-y-auto">
              {filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className="gap-2"
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
                    <span className="flex-1 truncate">{tag}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Tag className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">
                {searchQuery ? '未找到匹配的标签' : '暂无标签'}
              </p>
            </div>
          </>
        )}

        {/* 清除按钮 */}
        {selectedTags.length > 0 && onClearTags && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onClearTags();
              }}
              className="text-destructive focus:text-destructive"
            >
              <X className="h-4 w-4" />
              <span>清除所有标签</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
