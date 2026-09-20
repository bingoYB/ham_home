'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
// Import the locales through their own subpaths: the `date-fns/locale` barrel
// would drag every locale into the bundle.
import { enUS } from 'date-fns/locale/en-US'
import { zhCN } from 'date-fns/locale/zh-CN'

import { cn } from '@ui/lib/utils'
import { Button } from '@ui/components/button'
import { Calendar } from '@ui/components/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/popover'

/**
 * react-day-picker localizes through a date-fns locale while `Intl` wants a
 * language tag. Resolve both from the app language so weekday names, the month
 * dropdown and the trigger label never end up in different languages.
 * Callers only know the app language tag, so keep date-fns an implementation
 * detail of this package.
 */
function resolveLocale(language?: string): { dateFns: typeof enUS; intl: string } {
  return language?.toLowerCase().startsWith('zh')
    ? { dateFns: zhCN, intl: 'zh-CN' }
    : { dateFns: enUS, intl: 'en-US' }
}

export interface DatePickerProps {
  /** Selected date; `undefined` renders the placeholder */
  value?: Date
  /** Fired with the picked date, or `undefined` when the selection is cleared */
  onChange?: (date: Date | undefined) => void
  /** Trigger text while nothing is selected */
  placeholder?: string
  disabled?: boolean
  /** Earliest selectable date (inclusive) */
  min?: Date
  /** Latest selectable date (inclusive) */
  max?: Date
  /** First month reachable through navigation; defaults to `min` */
  startMonth?: Date
  /** Last month reachable through navigation; defaults to `max` */
  endMonth?: Date
  /** BCP-47 language tag, e.g. `zh-CN` / `en`. Drives month, weekday and trigger labels */
  language?: string
  /** Month / year caption style; `dropdown` allows jumping across years quickly */
  captionLayout?: React.ComponentProps<typeof Calendar>['captionLayout']
  /** Portal container, required when rendering inside a shadow root */
  container?: HTMLElement
  /** Class names for the trigger button */
  className?: string
  id?: string
  'aria-label'?: string
}

/**
 * DatePicker - trigger button plus a calendar popover (shadcn/ui date picker pattern).
 * Replaces `<input type="date">` so the calendar is themed and consistent across browsers.
 */
function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  min,
  max,
  startMonth,
  endMonth,
  language,
  captionLayout = 'dropdown',
  container,
  className,
  id,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Out-of-range days: an array is OR-matched, while `{ before, after }` in a
  // single object would be AND-matched and disable the wrong days.
  const disabledDays = React.useMemo(
    () => [
      ...(min ? [{ before: min }] : []),
      ...(max ? [{ after: max }] : []),
    ],
    [min, max],
  )

  const locale = resolveLocale(language)

  const label = value
    ? value.toLocaleDateString(locale.intl, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          data-slot="date-picker-trigger"
          data-empty={!value}
          className={cn(
            'w-full justify-between font-normal data-[empty=true]:text-muted-foreground',
            // Read as a form field, not an action: drop the outline variant's
            // accent-colored hover and mirror `SelectTrigger` instead.
            'border-input hover:bg-background hover:text-foreground dark:bg-input/30 dark:hover:bg-input/50',
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent container={container} className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value ?? max}
          captionLayout={captionLayout}
          locale={locale.dateFns}
          formatters={{
            // The shadcn default formats months with the browser locale, which
            // would disagree with the weekday names coming from `locale`.
            formatMonthDropdown: (date) =>
              date.toLocaleString(locale.intl, { month: 'short' }),
          }}
          startMonth={startMonth ?? min}
          endMonth={endMonth ?? max}
          disabled={disabledDays}
          autoFocus
          onSelect={(date) => {
            onChange?.(date)
            if (date) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
