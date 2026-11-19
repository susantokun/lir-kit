import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { t } from './adapters';

/** yyyy-mm-dd in local time (what the API filters expect), without timezone shifts. */
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);

  return new Date(y, m - 1, d);
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/** The weeks of a month, Monday first, padded with the days of the neighbouring months. */
function weeksOf(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - lead + i));
  const weeks = [0, 1, 2, 3, 4, 5].map((w) => days.slice(w * 7, w * 7 + 7));

  return weeks[5].every((d) => d.getMonth() !== month.getMonth()) ? weeks.slice(0, 5) : weeks;
}

function Month({
  month,
  from,
  to,
  max,
  onPick,
  nav,
}: {
  month: Date;
  from: string;
  to: string;
  max: Date;
  onPick: (day: Date) => void;
  nav?: { prev?: () => void; next?: () => void };
}) {
  const monday = new Date(2024, 0, 1);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, monday.getDate() + i).toLocaleDateString(undefined, { weekday: 'short' }),
  );

  return (
    <div className="flex w-64 flex-col gap-2 p-3">
      <div className="flex h-8 items-center justify-between">
        {nav?.prev ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Bulan sebelumnya')} onClick={nav.prev}>
            <ChevronLeftIcon />
          </Button>
        ) : (
          <span className="size-7" />
        )}
        <span className="text-sm font-medium">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        {nav?.next ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Bulan berikutnya')} onClick={nav.next}>
            <ChevronRightIcon />
          </Button>
        ) : (
          <span className="size-7" />
        )}
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {weekdays.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {weeksOf(month).map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const iso = toIso(day);
              const outside = day.getMonth() !== month.getMonth();
              const disabled = day > max;
              const isFrom = iso === from;
              const isTo = iso === (to || from);
              const inRange = from !== '' && to !== '' && iso > from && iso < to;

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled || outside}
                  onClick={() => onPick(day)}
                  className={cn(
                    'h-8 text-sm tabular-nums transition-colors',
                    outside && 'invisible',
                    disabled && 'text-muted-foreground/40',
                    !disabled && !isFrom && !isTo && 'hover:bg-accent',
                    inRange && 'bg-muted',
                    (isFrom || isTo) && 'bg-primary font-medium text-primary-foreground',
                    isFrom && to && to !== from ? 'rounded-l-lg' : isFrom ? 'rounded-lg' : '',
                    isTo && to && to !== from ? 'rounded-r-lg' : isTo ? 'rounded-lg' : '',
                    !isFrom && !isTo && !inRange && 'rounded-lg',
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One control for "from – to": a button showing the chosen period, opening a two-month calendar where two clicks
 * pick the range, with quick presets (today, last 7 / 30 days, this month). Dates are yyyy-mm-dd strings; days
 * after today cannot be picked. With `apply`, picking only edits a draft and the range is committed by "Terapkan".
 */
export function DateRangePicker({
  from: appliedFrom,
  to: appliedTo,
  onChange,
  apply,
  className,
}: {
  from: string;
  to: string;
  onChange?: (range: { from: string; to: string }) => void;
  apply?: {
    onApply: (range: { from: string; to: string }) => void;
    onReset: () => void;
    busy?: boolean;
  };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: appliedFrom, to: appliedTo });
  const [month, setMonth] = useState(() => addMonths(appliedFrom ? fromIso(appliedFrom) : new Date(), -1));
  const max = useMemo(() => startOfDay(new Date()), []);

  const from = apply ? draft.from : appliedFrom;
  const to = apply ? draft.to : appliedTo;
  const change = (range: { from: string; to: string }) => (apply ? setDraft(range) : onChange?.(range));

  useEffect(() => {
    if (open) {
      setDraft({ from: appliedFrom, to: appliedTo });
      const anchor = appliedTo ? fromIso(appliedTo) : new Date();
      setMonth(addMonths(anchor, -1));
    }
  }, [open, appliedFrom, appliedTo]);

  const fmt = (iso: string) =>
    fromIso(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const summary = from ? (to && to !== from ? `${fmt(from)} – ${fmt(to)}` : fmt(from)) : t('Pilih periode');

  const pick = (day: Date) => {
    const iso = toIso(day);

    if (!from || to) {
      change({ from: iso, to: '' });
    } else if (iso < from) {
      change({ from: iso, to: '' });
    } else {
      change({ from, to: iso });

      if (!apply && iso !== from) {
        setOpen(false);
      }
    }
  };

  const preset = (days: number | 'month') => {
    const end = new Date();
    const start =
      days === 'month'
        ? new Date(end.getFullYear(), end.getMonth(), 1)
        : new Date(end.getFullYear(), end.getMonth(), end.getDate() - days + 1);
    change({ from: toIso(start), to: toIso(end) });
    setMonth(addMonths(end, -1));

    if (!apply) {
      setOpen(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="min-w-56 flex-1 justify-start gap-2 font-normal"
              aria-label={t('Periode')}
            />
          }
        >
          <CalendarIcon className="text-muted-foreground" />
          <span className={appliedFrom ? '' : 'text-muted-foreground'}>
            {appliedFrom
              ? appliedTo && appliedTo !== appliedFrom
                ? `${fmt(appliedFrom)} – ${fmt(appliedTo)}`
                : fmt(appliedFrom)
              : t('Pilih periode')}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto gap-0 p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:flex-nowrap sm:border-r sm:border-b-0">
              {[
                { label: t('Hari ini'), value: 1 as const },
                { label: t('7 hari terakhir'), value: 7 as const },
                { label: t('30 hari terakhir'), value: 30 as const },
                { label: t('Bulan ini'), value: 'month' as const },
              ].map((p) => (
                <Button key={p.label} type="button" variant="ghost" size="sm" className="justify-start" onClick={() => preset(p.value)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row">
              <Month
                month={month}
                from={from}
                to={to}
                max={max}
                onPick={pick}
                nav={{ prev: () => setMonth(addMonths(month, -1)) }}
              />
              <div className="hidden sm:block">
                <Month
                  month={addMonths(month, 1)}
                  from={from}
                  to={to}
                  max={max}
                  onPick={pick}
                  nav={addMonths(month, 1) < addMonths(max, 0) ? { next: () => setMonth(addMonths(month, 1)) } : undefined}
                />
              </div>
            </div>
          </div>
          {apply && (
            <div className="flex items-center justify-between gap-2 border-t p-3">
              <span className="text-xs text-muted-foreground">{summary}</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    apply.onReset();
                    setOpen(false);
                  }}
                >
                  {t('Atur ulang')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!from || apply.busy}
                  onClick={() => {
                    apply.onApply({ from, to: to || from });
                    setOpen(false);
                  }}
                >
                  {t('Terapkan')}
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {!apply && appliedFrom && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('Hapus periode')}
          onClick={() => onChange?.({ from: '', to: '' })}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}
