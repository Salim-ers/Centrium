'use client';

import * as React from 'react';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar, fromIsoDate, toIsoDate } from './calendar';
import { fieldBase } from './field-styles';

type Props = {
  /** Date ISO (YYYY-MM-DD) ou vide. */
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  /** Affiche la croix d'effacement (défaut : true). */
  clearable?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
};

/**
 * Sélecteur de date : champ cliquable + calendrier en popover.
 * La valeur reste une chaîne ISO, compatible avec les colonnes DATE.
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  id,
  min,
  max,
  disabled,
  clearable = true,
  className,
  ...rest
}: Props) {
  const { locale } = useLocale();
  const [open, setOpen] = React.useState(false);
  const date = fromIsoDate(value ?? null);
  const label = date
    ? date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : (placeholder ?? (locale === 'fr' ? 'Choisir une date' : 'Pick a date'));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-invalid={rest['aria-invalid']}
            className={cn(
              'flex h-9 items-center gap-2 px-3 text-left',
              fieldBase,
              !date && 'text-muted-foreground/80',
              clearable && date && 'pr-8',
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </button>
        </PopoverTrigger>
        {clearable && date && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={locale === 'fr' ? 'Effacer la date' : 'Clear date'}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-3">
        <Calendar
          value={value ?? null}
          locale={locale === 'en' ? 'en' : 'fr'}
          min={min}
          max={max}
          onChange={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-brand-50"
            onClick={() => {
              onChange(toIsoDate(new Date()));
              setOpen(false);
            }}
          >
            {locale === 'fr' ? "Aujourd'hui" : 'Today'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
