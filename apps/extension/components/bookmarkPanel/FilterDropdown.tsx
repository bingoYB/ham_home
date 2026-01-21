/**
 * FilterDropdown - 筛选操作按钮组件
 * 提供标签筛选和筛选器（时间筛选、自定义筛选器）两个图标按钮
 */
import { Tag, Filter } from 'lucide-react';
import { Button, cn } from '@hamhome/ui';

export interface FilterDropdownProps {
  hasTagFilter: boolean;
  hasFilter: boolean; // 是否有筛选器（时间筛选或自定义筛选器）
  onTagFilterClick: () => void;
  onFilterClick: () => void;
  className?: string;
}

export function FilterDropdown({
  hasTagFilter,
  hasFilter,
  onTagFilterClick,
  onFilterClick,
  className,
}: FilterDropdownProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* 标签筛选按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8',
          hasTagFilter && 'text-primary bg-primary/10'
        )}
        onClick={onTagFilterClick}
        title="标签筛选"
      >
        <Tag className="h-4 w-4" />
      </Button>

      {/* 筛选器按钮（时间筛选、自定义筛选器） */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8',
          hasFilter && 'text-primary bg-primary/10'
        )}
        onClick={onFilterClick}
        title="筛选器"
      >
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  );
}
