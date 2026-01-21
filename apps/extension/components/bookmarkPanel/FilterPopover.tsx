/**
 * FilterDropdownMenu - 筛选器下拉菜单组件
 * 提供快捷时间筛选和自定义筛选器选择
 */
import { Calendar, Plus, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@hamhome/ui';
import { useContentUI } from '@/utils/ContentUIContext';
import type { TimeRange, TimeRangeType } from '@/hooks/useBookmarkSearch';
import type { CustomFilter } from '@/types';

export interface FilterDropdownMenuProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  customFilters?: CustomFilter[];
  selectedCustomFilterId?: string;
  onSelectCustomFilter?: (filterId: string | null) => void;
  onOpenCustomFilterDialog: () => void;
  children: React.ReactNode;
}

interface PresetOption {
  type: TimeRangeType;
  label: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  { type: 'today', label: '今天' },
  { type: 'week', label: '最近一周' },
  { type: 'month', label: '最近一月' },
  { type: 'year', label: '最近一年' },
];

export function FilterDropdownMenu({
  timeRange,
  onTimeRangeChange,
  customFilters = [],
  selectedCustomFilterId,
  onSelectCustomFilter,
  onOpenCustomFilterDialog,
  children,
}: FilterDropdownMenuProps) {
  const { container: portalContainer } = useContentUI();

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
          快捷时间筛选
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
              <span className="flex-1">{option.label}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}

        {/* 自定义筛选器 */}
        {customFilters.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              自定义筛选器
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

        {/* 添加自定义筛选器 */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenCustomFilterDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>添加自定义筛选器</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
