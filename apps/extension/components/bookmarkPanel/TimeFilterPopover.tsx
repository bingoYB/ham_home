/**
 * TimeFilterPopover - 时间筛选弹窗组件
 * 支持预设时间范围和自定义范围
 */
import { useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  cn,
} from '@hamhome/ui';
import { useContentUI } from '@/utils/ContentUIContext';
import type { TimeRange, TimeRangeType } from '@/hooks/useBookmarkSearch';

export interface TimeFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

interface PresetOption {
  type: TimeRangeType;
  label: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  { type: 'all', label: '全部时间' },
  { type: 'today', label: '今天' },
  { type: 'week', label: '最近一周' },
  { type: 'month', label: '最近一月' },
  { type: 'year', label: '最近一年' },
  { type: 'custom', label: '自定义范围' },
];

/**
 * 时间戳转日期字符串 (YYYY-MM-DD)
 */
function timestampToDateStr(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

/**
 * 日期字符串转时间戳
 */
function dateStrToTimestamp(dateStr: string, isEndOfDay = false): number {
  const date = new Date(dateStr);
  if (isEndOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date.getTime();
}

export function TimeFilterPopover({
  open,
  onOpenChange,
  timeRange,
  onTimeRangeChange,
}: TimeFilterPopoverProps) {
  const { container: portalContainer } = useContentUI();
  
  // 本地状态用于自定义日期
  const [customStartDate, setCustomStartDate] = useState(
    timestampToDateStr(timeRange.startDate)
  );
  const [customEndDate, setCustomEndDate] = useState(
    timestampToDateStr(timeRange.endDate)
  );
  const [selectedType, setSelectedType] = useState<TimeRangeType>(timeRange.type);

  const handleSelectPreset = (type: TimeRangeType) => {
    setSelectedType(type);
    if (type !== 'custom') {
      onTimeRangeChange({ type });
      onOpenChange(false);
    }
  };

  const handleConfirmCustom = () => {
    if (!customStartDate || !customEndDate) return;

    onTimeRangeChange({
      type: 'custom',
      startDate: dateStrToTimestamp(customStartDate),
      endDate: dateStrToTimestamp(customEndDate, true),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={portalContainer} className="sm:max-w-[320px] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            时间筛选
          </DialogTitle>
        </DialogHeader>

        {/* 预设选项 */}
        <div className="px-2 pb-2">
          <div className="space-y-0.5">
            {PRESET_OPTIONS.map((option) => {
              const isSelected = timeRange.type === option.type;
              return (
                <button
                  key={option.type}
                  onClick={() => handleSelectPreset(option.type)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm',
                    'hover:bg-muted/60 transition-colors',
                    isSelected && 'bg-primary/10 text-primary'
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && option.type !== 'custom' && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 自定义日期范围 */}
        {selectedType === 'custom' && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">开始日期</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">结束日期</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!customStartDate || !customEndDate}
              onClick={handleConfirmCustom}
            >
              应用
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
