'use client';

import { HeartPulse, Home, MinusCircle, Palmtree, Sparkles } from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import type { MonthTotals } from '@/lib/timesheets/month';

/**
 * Récapitulatif d'un mois de CRA : jours travaillés face aux jours ouvrés
 * attendus sur la mission, puis télétravail et absences. Un écart se lit
 * avant même d'ouvrir le calendrier.
 */
export function MonthSummary({ totals, expected, className }: { totals: MonthTotals; expected: number; className?: string }) {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const fmt = (n: number) => n.toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 });
  const d = (n: number) => `${fmt(n)} ${fr ? 'j' : 'd'}`;
  const chips = [
    { show: totals.remote > 0, icon: Home, tone: 'text-primary', label: fr ? `${d(totals.remote)} en télétravail` : `${d(totals.remote)} remote` },
    { show: totals.paid_leave > 0, icon: Palmtree, tone: 'text-warning', label: fr ? `${d(totals.paid_leave)} de congés` : `${d(totals.paid_leave)} paid leave` },
    { show: totals.sick_leave > 0, icon: HeartPulse, tone: 'text-destructive', label: fr ? `${d(totals.sick_leave)} maladie` : `${d(totals.sick_leave)} sick leave` },
    { show: totals.unpaid_leave > 0, icon: MinusCircle, tone: 'text-muted-foreground', label: fr ? `${d(totals.unpaid_leave)} sans solde` : `${d(totals.unpaid_leave)} unpaid` },
    {
      show: totals.holiday > 0,
      icon: Sparkles,
      tone: 'text-warning',
      label: fr ? `${totals.holiday} jour${totals.holiday > 1 ? 's' : ''} férié${totals.holiday > 1 ? 's' : ''}` : `${totals.holiday} public holiday${totals.holiday > 1 ? 's' : ''}`,
    },
  ].filter((c) => c.show);

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-4', className)} aria-label={fr ? 'Récapitulatif du mois' : 'Month summary'}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="num text-[28px] font-semibold leading-none tracking-tight">
            {fmt(totals.worked)}
            <span className="ml-1 text-[15px] font-medium text-muted-foreground">{fr ? 'j' : 'd'}</span>
          </div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">{fr ? 'travaillés' : 'worked'}</div>
        </div>
        <div className="text-right text-[12.5px] leading-snug text-muted-foreground">
          {fr ? (
            <>
              sur <span className="num font-medium text-foreground">{expected}</span> jour{expected > 1 ? 's' : ''} ouvré{expected > 1 ? 's' : ''}
              <br />
              de mission
            </>
          ) : (
            <>
              of <span className="num font-medium text-foreground">{expected}</span> working day{expected > 1 ? 's' : ''}
              <br />
              on the mission
            </>
          )}
        </div>
      </div>
      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[12px]">
                <Icon className={cn('h-3.5 w-3.5', c.tone)} />
                {c.label}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
