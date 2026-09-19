/**
 * CustomDateRangeDialog - custom date range dialog
 * Lets the filter dropdown pick an arbitrary start/end date instead of only the quick presets
 */
import { useContext, useEffect, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@hamhome/ui';
import { ContentUIContext } from '@/utils/ContentUIContext';
import type { TimeRange } from '@/hooks/useBookmarkSearch';

export interface CustomDateRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeRange: TimeRange;
  onApply: (range: TimeRange) => void;
}

function timestampToDateStr(timestamp?: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toISOString().split('T')[0];
}

function dateStrToTimestamp(dateStr: string, isEndOfDay = false): number {
  const date = new Date(dateStr);
  if (isEndOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date.getTime();
}

export function CustomDateRangeDialog({
  open,
  onOpenChange,
  timeRange,
  onApply,
}: CustomDateRangeDialogProps) {
  const { t } = useTranslation('bookmark');
  // Falls back to undefined (renders into document.body) outside a ContentUIProvider
  const contentUIContext = useContext(ContentUIContext);
  const portalContainer = contentUIContext?.container;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // On each open, prefill from the currently active range if it's a custom one
  useEffect(() => {
    if (open) {
      const isCustom = timeRange.type === 'custom';
      setStartDate(isCustom ? timestampToDateStr(timeRange.startDate) : '');
      setEndDate(isCustom ? timestampToDateStr(timeRange.endDate) : '');
    }
  }, [open, timeRange]);

  const isValidRange = Boolean(startDate) && Boolean(endDate) && startDate <= endDate;

  const handleApply = () => {
    if (!isValidRange) return;
    onApply({
      type: 'custom',
      startDate: dateStrToTimestamp(startDate),
      endDate: dateStrToTimestamp(endDate, true),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={portalContainer} className="sm:max-w-[320px] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" />
            {t('bookmark:contentPanel.customDateRangeTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('bookmark:contentPanel.startDate')}
            </Label>
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('bookmark:contentPanel.endDate')}
            </Label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!isValidRange}
            onClick={handleApply}
          >
            {t('bookmark:contentPanel.applyDateRange')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
