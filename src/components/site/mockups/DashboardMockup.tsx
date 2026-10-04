'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CalendarClock, ClipboardCheck, FileText, Sparkles, UserCheck } from 'lucide-react';

import { CountUp, useVisible } from '../Motion';
import { MockPill, ProductFrame } from '../ProductFrame';

type Lang = 'fr' | 'en';

const eur = (n: number, lang: Lang) =>
  new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: n >= 100000 ? 'compact' : 'standard' }).format(n);

const BARS = [42, 48, 46, 55, 58, 63, 61, 68, 72, 70, 78, 84];
const MONTHS = { fr: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], en: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] };

/** Reproduction du Command Center (données d'exemple). */
export function DashboardMockup({ lang, compact = false }: { lang: Lang; compact?: boolean }) {
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const { ref, visible } = useVisible<HTMLDivElement>('-40px');

  const kpis = [
    { label: fr ? 'CA signé' : 'Signed revenue', value: 486000, fmt: (n: number) => eur(n, lang) },
    { label: fr ? 'CA prévisionnel' : 'Forecast revenue', value: 612000, fmt: (n: number) => eur(n, lang) },
    { label: fr ? 'Marge moyenne' : 'Average margin', value: 31.4, fmt: (n: number) => `${n.toFixed(1).replace('.', fr ? ',' : '.')} %` },
    { label: fr ? 'Taux d’occupation' : 'Utilisation', value: 87, fmt: (n: number) => `${Math.round(n)} %` },
  ];
  const actions = [
    { icon: ClipboardCheck, text: fr ? '3 CRA attendent votre validation' : '3 timesheets awaiting approval', tone: 'brand' as const },
    { icon: CalendarClock, text: fr ? '2 missions se terminent dans moins de 30 jours' : '2 missions end within 30 days', tone: 'warning' as const },
    { icon: UserCheck, text: fr ? '4 consultants bientôt disponibles' : '4 consultants available soon', tone: 'info' as const },
    { icon: FileText, text: fr ? 'Un devis expire vendredi' : 'A quote expires on Friday', tone: 'warning' as const },
    { icon: Sparkles, text: fr ? 'Camille M. correspond à « Lead data » (92 %)' : 'Camille M. matches “Data lead” (92%)', tone: 'success' as const },
  ];
  const nav = fr
    ? ['Dashboard', 'CRM', 'Clients', 'Opportunités', 'Consultants', 'Staffing', 'Missions', 'CRA', 'Finance']
    : ['Dashboard', 'CRM', 'Clients', 'Opportunities', 'Consultants', 'Staffing', 'Missions', 'Timesheets', 'Finance'];

  return (
    <ProductFrame caption={fr ? 'Données d’exemple' : 'Sample data'}>
      <div ref={ref} className="flex min-h-[340px] bg-background text-left">
        {!compact && (
          <aside className="hidden w-40 shrink-0 border-r border-border bg-sidebar p-3 md:block" aria-hidden>
            <div className="mb-4 flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-md bg-primary" />
              <span className="text-[12px] font-semibold">Centrium</span>
            </div>
            <ul className="space-y-0.5 text-[11px]">
              {nav.map((n, i) => (
                <li key={n} className={i === 0 ? 'rounded-md bg-card px-2 py-1 font-medium shadow-xs ring-1 ring-border' : 'px-2 py-1 text-muted-foreground'}>
                  {n}
                </li>
              ))}
            </ul>
          </aside>
        )}
        <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{fr ? 'Pilotage' : 'Overview'}</div>
              <div className="text-[15px] font-semibold tracking-tight">{fr ? 'Bonjour Claire' : 'Hello Claire'}</div>
            </div>
            <MockPill tone="success">{fr ? '24 consultants actifs' : '24 active consultants'}</MockPill>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-lg border border-border bg-card p-2.5">
                <div className="truncate text-[10px] text-muted-foreground">{k.label}</div>
                <div className="mt-0.5 text-[15px] font-semibold tracking-tight">
                  <CountUp value={k.value} format={k.fmt} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 lg:grid-cols-5">
            <div className="rounded-lg border border-border bg-card p-3 lg:col-span-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-medium">{fr ? 'CA mensuel' : 'Monthly revenue'}</span>
                <span className="text-muted-foreground">{fr ? '12 mois' : '12 months'}</span>
              </div>
              <div className="flex h-28 items-end gap-1.5" aria-hidden>
                {BARS.map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      className={i === BARS.length - 1 ? 'w-full rounded-sm bg-primary' : 'w-full rounded-sm bg-brand-200'}
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: visible || reduce ? `${h}%` : 0 }}
                      transition={{ duration: 0.7, delay: reduce ? 0 : i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <span className="text-[8px] text-muted-foreground">{MONTHS[lang][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 lg:col-span-2">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium">
                <AlertTriangle className="h-3 w-3 text-primary" />
                {fr ? 'À traiter aujourd’hui' : 'To do today'}
              </div>
              <ul className="space-y-1.5">
                {actions.slice(0, compact ? 3 : 5).map((a, i) => (
                  <motion.li
                    key={a.text}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[10.5px]"
                    initial={reduce ? false : { opacity: 0, x: 8 }}
                    animate={visible || reduce ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: reduce ? 0 : 0.5 + i * 0.12 }}
                  >
                    <a.icon className="h-3 w-3 shrink-0 text-primary-deep" />
                    <span className="min-w-0 flex-1 truncate">{a.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}
