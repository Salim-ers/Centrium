'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { daysLabel, type CraCheck } from '@/lib/timesheets/month';
import { cn } from '@/lib/utils';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, word: string) => (n > 1 ? `${word}s` : word);

export function checkText(check: CraCheck, lang: 'fr' | 'en'): string {
  const fr = lang === 'fr';
  const n = check.days.length;
  const when = daysLabel(check.days, lang);
  switch (check.id) {
    case 'unfilled':
      if (n === 1) return fr ? `${cap(when)} : aucune saisie` : `${cap(when)}: nothing entered`;
      return fr ? `${n} jours ouvrés sans saisie (${when})` : `${n} working days with nothing entered (${when})`;
    case 'outside':
      return fr
        ? `${n} ${plural(n, 'jour')} ${plural(n, 'saisi')} hors de la mission (${when})`
        : `${n} ${plural(n, 'day')} entered outside the mission (${when})`;
    case 'holiday_worked':
      return fr
        ? `${cap(plural(n, 'jour'))} ${plural(n, 'férié')} ${plural(n, 'déclaré')} ${plural(n, 'travaillé')} (${when})`
        : `${plural(n, 'Public holiday')} entered as worked (${when})`;
  }
}

function fixLabel(check: CraCheck, lang: 'fr' | 'en'): string {
  const fr = lang === 'fr';
  const n = check.days.length;
  switch (check.id) {
    case 'unfilled':
      return fr ? `Marquer ${plural(n, 'travaillé')}` : 'Mark as worked';
    case 'outside':
      return fr ? 'Retirer' : 'Remove';
    case 'holiday_worked':
      return fr ? `Marquer ${plural(n, 'férié')}` : 'Mark as holiday';
  }
}

/**
 * Contrôles d'un mois de CRA (jours sans saisie, saisies hors mission,
 * fériés travaillés). Avec `onFix`, chaque point se corrige en un geste ;
 * sans, la liste se lit seule (validation côté agence).
 */
export function MonthChecks({
  checks,
  onFix,
  busy = false,
  okText,
  className,
}: {
  checks: CraCheck[];
  onFix?: (check: CraCheck) => void;
  busy?: boolean;
  /** Message quand tout est en ordre ; absent, rien n'est affiché. */
  okText?: string;
  className?: string;
}) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  if (!checks.length) {
    if (!okText) return null;
    return (
      <p className={cn('flex items-center gap-2 text-[13px] text-success', className)}>
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {okText}
      </p>
    );
  }
  return (
    <ul className={cn('space-y-2', className)}>
      {checks.map((c) => {
        const soft = c.id === 'holiday_worked';
        const Icon = soft ? Info : AlertTriangle;
        return (
          <li
            key={c.id}
            className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px]', soft ? 'border-info/20 bg-info-soft' : 'border-warning/30 bg-warning-soft')}
          >
            <Icon className={cn('h-4 w-4 shrink-0', soft ? 'text-info' : 'text-warning')} />
            <span className="min-w-0 flex-1">{checkText(c, lang)}</span>
            {onFix && (
              <Button size="sm" variant="outline" className="shrink-0 bg-card" disabled={busy} onClick={() => onFix(c)}>
                {fixLabel(c, lang)}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
