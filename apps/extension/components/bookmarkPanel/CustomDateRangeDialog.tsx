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
  DatePicker,
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

function timestampToDate(timestamp?: number): Date | undefined {
  return timestamp ? new Date(timestamp) : undefined;
}

function startOfDay(date: Date): number {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function endOfDay(date: Date): number {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function CustomDateRangeDialog({
  open,
  onOpenChange,
  timeRange,
  onApply,
}: CustomDateRangeDialogProps) {
  const { t, i18n } = useTranslation('bookmark');
  // Falls back to undefined (renders into document.body) outside a ContentUIProvider
  const contentUIContext = useContext(ContentUIContext);
  const portalContainer = contentUIContext?.container;

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // On each open, prefill from the currently active range if it's a custom one
  useEffect(() => {
    if (open) {
      const isCustom = timeRange.type === 'custom';
      setStartDate(isCustom ? timestampToDate(timeRange.startDate) : undefined);
      setEndDate(isCustom ? timestampToDate(timeRange.endDate) : undefined);
    }
  }, [open, timeRange]);

  const isValidRange =
    Boolean(startDate) &&
    Boolean(endDate) &&
    startOfDay(startDate!) <= startOfDay(endDate!);

  const handleApply = () => {
    if (!isValidRange) return;
    onApply({
      type: 'custom',
      startDate: startOfDay(startDate!),
      endDate: endOfDay(endDate!),
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
            <Label htmlFor="custom-range-start" className="text-xs text-muted-foreground">
              {t('bookmark:contentPanel.startDate')}
            </Label>
            <DatePicker
              id="custom-range-start"
              value={startDate}
              onChange={setStartDate}
              max={endDate}
              language={i18n.language}
              container={portalContainer}
              placeholder={t('bookmark:contentPanel.startDate')}
              aria-label={t('bookmark:contentPanel.startDate')}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-range-end" className="text-xs text-muted-foreground">
              {t('bookmark:contentPanel.endDate')}
            </Label>
            <DatePicker
              id="custom-range-end"
              value={endDate}
              onChange={setEndDate}
              min={startDate}
              language={i18n.language}
              container={portalContainer}
              placeholder={t('bookmark:contentPanel.endDate')}
              aria-label={t('bookmark:contentPanel.endDate')}
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
