/**
 * FilterDropdownMenu - 筛选器下拉菜单组件
 * 提供快捷时间筛选和自定义筛选器选择
 */
import { Calendar, Plus, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@hamhome/ui';
import { useContext } from 'react';
import { ContentUIContext } from '@/utils/ContentUIContext';
import type { TimeRange, TimeRangeType } from '@/hooks/useBookmarkSearch';
import type { CustomFilter } from '@/types';

export interface FilterDropdownMenuProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  customFilters?: CustomFilter[];
  selectedCustomFilterId?: string;
  onSelectCustomFilter?: (filterId: string | null) => void;
  onOpenCustomFilterDialog: () => void;
  onClearFilter?: () => void;
  children: React.ReactNode;
}

export function FilterDropdownMenu({
  timeRange,
  onTimeRangeChange,
  customFilters = [],
  selectedCustomFilterId,
  onSelectCustomFilter,
  onOpenCustomFilterDialog,
  onClearFilter,
  children,
}: FilterDropdownMenuProps) {
  const { t } = useTranslation('bookmark');
  // 安全获取 container，如果不在 ContentUIProvider 中则使用 undefined（会回退到 document.body）
  const contentUIContext = useContext(ContentUIContext);
  const portalContainer = contentUIContext?.container;

  const PRESET_OPTIONS: { type: TimeRangeType; labelKey: string }[] = [
    { type: 'today', labelKey: 'today' },
    { type: 'week', labelKey: 'lastWeek' },
    { type: 'month', labelKey: 'lastMonth' },
    { type: 'year', labelKey: 'lastYear' },
  ];

  const handleSelectPreset = (type: TimeRangeType) => {
    onTimeRangeChange({ type });
    // 清除自定义筛选器选择
    onSelectCustomFilter?.(null);
  };

  const handleSelectCustomFilter = (filterId: string) => {
    onSelectCustomFilter?.(filterId);
    // 清除时间筛选
    onTimeRangeChange({ type: 'all' });
  };

  const handleClearFilter = () => {
    onClearFilter?.();
  };

  const isPresetSelected = timeRange.type !== 'all' && !selectedCustomFilterId;
  const hasActiveFilter = isPresetSelected || !!selectedCustomFilterId;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent container={portalContainer} align="end" className="w-56">
        {/* 快捷时间筛选 */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('bookmark:contentPanel.quickTimeFilter')}
        </DropdownMenuLabel>
        {PRESET_OPTIONS.map((option) => {
          const isSelected = timeRange.type === option.type && !selectedCustomFilterId;
          return (
            <DropdownMenuItem
              key={option.type}
              onClick={() => handleSelectPreset(option.type)}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span className="flex-1">{t(`bookmark:contentPanel.${option.labelKey}`)}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}

        {/* 自定义筛选器 */}
        {customFilters.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('bookmark:contentPanel.customFilters')}
            </DropdownMenuLabel>
            {customFilters.map((filter) => {
              const isSelected = selectedCustomFilterId === filter.id;
              return (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => handleSelectCustomFilter(filter.id)}
                  className="gap-2"
                >
                  <span className="flex-1 truncate">{filter.name}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {/* 清除筛选器 */}
        {hasActiveFilter && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleClearFilter} 
              className="gap-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span>{t('bookmark:contentPanel.clearFilter')}</span>
            </DropdownMenuItem>
          </>
        )}

        {/* 添加自定义筛选器 */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenCustomFilterDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>{t('bookmark:contentPanel.addCustomFilter')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
