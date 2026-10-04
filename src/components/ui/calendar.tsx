'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Date ISO locale (YYYY-MM-DD) sans décalage de fuseau. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const WEEKDAYS = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

type Props = {
  value: string | null;
  onChange: (iso: string) => void;
  locale?: 'fr' | 'en';
  min?: string;
  max?: string;
  className?: string;
};

/**
 * Calendrier mensuel (semaine du lundi). Navigation clavier : flèches pour
 * changer de jour, PageUp/PageDown pour changer de mois, Entrée pour choisir.
 */
export function Calendar({ value, onChange, locale = 'fr', min, max, className }: Props) {
  const selected = fromIsoDate(value);
  const today = new Date();
  const [cursor, setCursor] = React.useState<Date>(() => selected ?? today);
  const [view, setView] = React.useState(() => new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1));
  const gridRef = React.useRef<HTMLDivElement>(null);

  const minD = fromIsoDate(min);
  const maxD = fromIsoDate(max);
  const isDisabled = (d: Date) => (minD && d < minD) || (maxD && d > maxD) || false;

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(view.getFullYear(), view.getMonth(), 1 - offset + i));
  }

  const monthLabel = view.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  });

  function moveCursor(next: Date) {
    setCursor(next);
    if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
      setView(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toIsoDate(next)}"]`)?.focus();
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in delta) {
      e.preventDefault();
      moveCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + delta[e.key]!));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const m = e.key === 'PageUp' ? -1 : 1;
      moveCursor(new Date(cursor.getFullYear(), cursor.getMonth() + m, Math.min(cursor.getDate(), 28)));
    }
  }

  return (
    <div className={cn('w-[17rem] select-none', className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={locale === 'fr' ? 'Mois précédent' : 'Previous month'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[13px] font-semibold capitalize" aria-live="polite">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={locale === 'fr' ? 'Mois suivant' : 'Next month'}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground" aria-hidden>
        {WEEKDAYS[locale].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div ref={gridRef} role="grid" className="grid grid-cols-7 gap-0.5" onKeyDown={onKeyDown}>
        {days.map((d) => {
          const iso = toIsoDate(d);
          const inMonth = d.getMonth() === view.getMonth();
          const isSel = selected && iso === toIsoDate(selected);
          const isToday = iso === toIsoDate(today);
          const isCursor = iso === toIsoDate(cursor);
          const disabled = isDisabled(d);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button
              key={iso}
              type="button"
              data-date={iso}
              tabIndex={isCursor ? 0 : -1}
              disabled={disabled}
              onClick={() => {
                setCursor(d);
                onChange(iso);
              }}
              aria-pressed={!!isSel}
              aria-label={d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              className={cn(
                'num relative h-8 rounded-md text-[13px] transition-colors focus-visible:outline-none focus-visible:shadow-focus',
                inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                weekend && inMonth && !isSel && 'text-muted-foreground',
                !isSel && 'hover:bg-muted',
                isSel && 'bg-primary font-semibold text-primary-foreground hover:bg-primary-deep',
                disabled && 'pointer-events-none opacity-30',
              )}
            >
              {d.getDate()}
              {isToday && !isSel && (
                <span aria-hidden className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
