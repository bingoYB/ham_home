/**
 * BookmarkHeader - 书签面板头部组件
 * 包含搜索框、筛选器和设置入口
 */
import { useState } from 'react';
import { Search, X, Bookmark, Tag, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Button, cn } from '@hamhome/ui';
import { TagFilterDropdown } from './TagFilterDropdown';
import { FilterDropdownMenu } from './FilterPopover';
import { CustomFilterDialog } from './CustomFilterDialog';
import { QuickActions } from '@/components/common/QuickActions';
import { useContentUI } from '@/utils/ContentUIContext';
import type { TimeRange } from '@/hooks/useBookmarkSearch';
import type { FilterCondition, CustomFilter } from '@/types';

export interface BookmarkHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  bookmarkCount: number;
  filteredCount: number;
  // 标签筛选
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTagFilter: () => void;
  // 时间筛选
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onClearTimeFilter: () => void;
  // 自定义筛选器
  customFilters: CustomFilter[];
  selectedCustomFilterId?: string;
  onSelectCustomFilter?: (filterId: string | null) => void;
  onSaveCustomFilter?: (name: string, conditions: FilterCondition[]) => void;
  className?: string;
}

export function BookmarkHeader({
  searchQuery,
  onSearchChange,
  bookmarkCount,
  filteredCount,
  allTags,
  selectedTags,
  onToggleTag,
  onClearTagFilter,
  timeRange,
  onTimeRangeChange,
  onClearTimeFilter,
  customFilters,
  selectedCustomFilterId,
  onSelectCustomFilter,
  onSaveCustomFilter,
  className,
}: BookmarkHeaderProps) {
  const { t } = useTranslation('bookmark');
  const [customFilterDialogOpen, setCustomFilterDialogOpen] = useState(false);
  const { container: portalContainer } = useContentUI();

  const showFilteredCount = filteredCount !== bookmarkCount;
  const hasTagFilter = selectedTags.length > 0;
  const hasFilter = timeRange.type !== 'all' || !!selectedCustomFilterId; // 是否有筛选器（时间筛选或自定义筛选器）

  const handleSaveCustomFilter = (name: string, conditions: FilterCondition[]) => {
    onSaveCustomFilter?.(name, conditions);
  };

  const handleClearFilter = () => {
    // 清除时间筛选
    onClearTimeFilter();
    // 清除自定义筛选器
    onSelectCustomFilter?.(null);
  };

  return (
    <div className={cn('px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{t('bookmark:bookmark.title')}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {showFilteredCount ? `${filteredCount}/${bookmarkCount}` : bookmarkCount}
          </span>
        </div>
        <QuickActions portalContainer={portalContainer} />
      </div>

      {/* 搜索框和筛选器 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('bookmark:contentPanel.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 bg-muted/50 border-border/50 focus:bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={t('bookmark:contentPanel.clearSearch')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-1">
          {/* 标签筛选下拉菜单 */}
          <TagFilterDropdown
            allTags={allTags}
            selectedTags={selectedTags}
            onToggleTag={onToggleTag}
            onClearTags={onClearTagFilter}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                hasTagFilter && 'text-primary bg-primary/10'
              )}
              title={t('bookmark:contentPanel.tagFilter')}
            >
              <Tag className="h-4 w-4" />
            </Button>
          </TagFilterDropdown>
          
          {/* 筛选器下拉菜单 */}
          <FilterDropdownMenu
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            customFilters={customFilters}
            selectedCustomFilterId={selectedCustomFilterId}
            onSelectCustomFilter={onSelectCustomFilter}
            onOpenCustomFilterDialog={() => setCustomFilterDialogOpen(true)}
            onClearFilter={handleClearFilter}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                hasFilter && 'text-primary bg-primary/10'
              )}
              title={t('bookmark:contentPanel.filter')}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </FilterDropdownMenu>
        </div>
      </div>

      {/* 自定义筛选器弹窗 */}
      <CustomFilterDialog
        open={customFilterDialogOpen}
        onOpenChange={setCustomFilterDialogOpen}
        onSave={handleSaveCustomFilter}
      />
    </div>
  );
}
