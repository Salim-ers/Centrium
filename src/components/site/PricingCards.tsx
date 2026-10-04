'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

import { PLAN_CATALOG, PUBLIC_PLAN_IDS, type BillingInterval, type PublicPlanId } from '@/lib/billing/plans';
import { cn } from '@/lib/utils';

type Lang = 'fr' | 'en';

const FOR_WHOM: Record<PublicPlanId, { fr: string; en: string }> = {
  v2_starter: { fr: 'Pour démarrer : un dirigeant, un commercial, une première équipe.', en: 'To get started: a founder, a salesperson, a first team.' },
  v2_team: { fr: 'Pour l’ESN qui structure son commerce et son staffing.', en: 'For firms structuring sales and staffing.' },
  v2_growth: { fr: 'Pour plusieurs business managers et une centaine de consultants.', en: 'For several business managers and up to a hundred consultants.' },
  v2_scale: { fr: 'Au-delà : volumes, conditions et accompagnement définis ensemble.', en: 'Beyond that: volumes, terms and support agreed together.' },
};

const fmt = (n: number, lang: Lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 }).format(n);

export function IntervalToggle({ value, onChange, lang }: { value: BillingInterval; onChange: (v: BillingInterval) => void; lang: Lang }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1 text-[14px]" role="radiogroup" aria-label={lang === 'fr' ? 'Périodicité' : 'Billing period'}>
      {(['month', 'year'] as const).map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(i)}
          className={cn('rounded-md px-3.5 py-1.5 transition-colors', value === i ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
        >
          {i === 'month' ? (lang === 'fr' ? 'Mensuel' : 'Monthly') : lang === 'fr' ? 'Annuel · 2 mois offerts' : 'Yearly · 2 months free'}
        </button>
      ))}
    </div>
  );
}

/** Offres publiques : prix réels, mêmes montants que Stripe (lib/billing/plans). */
export function PricingCards({ lang, interval: controlled, onIntervalChange, showToggle = true }: { lang: Lang; interval?: BillingInterval; onIntervalChange?: (v: BillingInterval) => void; showToggle?: boolean }) {
  const [own, setOwn] = useState<BillingInterval>('month');
  const interval = controlled ?? own;
  const setInterval_ = onIntervalChange ?? setOwn;
  const fr = lang === 'fr';
  const common = fr
    ? ['Tous les modules : CRM, staffing, missions, CRA, préfacturation, devis', 'Portails client et consultant sans licence supplémentaire']
    : ['Every module: CRM, staffing, missions, timesheets, pre-invoicing, quotes', 'Client and consultant portals at no extra licence'];

  return (
    <div>
      {showToggle && (
        <div className="mb-8 flex justify-center">
          <IntervalToggle value={interval} onChange={setInterval_} lang={lang} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PUBLIC_PLAN_IDS.map((id) => {
          const p = PLAN_CATALOG[id];
          const yearly = interval === 'year' && p.yearlyEur != null;
          const price = yearly ? p.yearlyEur! : p.monthlyEur;
          return (
            <div key={id} className={cn('relative flex flex-col rounded-2xl border bg-card p-6', p.highlighted ? 'border-primary shadow-[0_16px_32px_-20px_rgba(198,95,70,0.45)]' : 'border-border')}>
              {p.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[12px] font-medium text-white">{fr ? 'Recommandé' : 'Recommended'}</span>
              )}
              <h3 className="text-[18px] font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1 min-h-[44px] text-[13.5px] leading-snug text-muted-foreground">{FOR_WHOM[id][lang]}</p>
              <div className="mt-5">
                {!p.selfService && <span className="text-[14px] text-muted-foreground">{fr ? 'à partir de ' : 'from '}</span>}
                <span className="num text-[34px] font-semibold tracking-tight">{fmt(price, lang)} €</span>
                <span className="text-[14px] text-muted-foreground"> {fr ? 'HT' : 'excl. VAT'} / {yearly ? (fr ? 'an' : 'year') : fr ? 'mois' : 'month'}</span>
                {yearly && <div className="text-[13px] text-muted-foreground">{fr ? `soit ${fmt(Math.round(price / 12), lang)} € / mois` : `i.e. €${fmt(Math.round(price / 12), lang)} / month`}</div>}
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-[14px]">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {p.managers ? (fr ? `Jusqu’à ${p.managers} managers` : `Up to ${p.managers} managers`) : fr ? 'Au-delà de 10 managers' : 'More than 10 managers'}
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {p.consultants ? (fr ? `Jusqu’à ${p.consultants} consultants` : `Up to ${p.consultants} consultants`) : fr ? 'Au-delà de 100 consultants' : 'More than 100 consultants'}
                </li>
                {common.map((c) => (
                  <li key={c} className="flex gap-2 text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {c}
                  </li>
                ))}
              </ul>
              <Link
                href={p.selfService ? `/essai?plan=${id}${yearly ? '&interval=year' : ''}` : `/demo?plan=${id}`}
                className={cn(
                  'mt-6 inline-flex h-10 items-center justify-center rounded-lg text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-focus',
                  p.highlighted ? 'bg-primary text-white hover:bg-primary-deep' : 'border border-border hover:bg-muted',
                )}
              >
                {p.selfService ? (fr ? 'Essayer 7 jours' : 'Try for 7 days') : fr ? 'Parler à l’équipe' : 'Talk to us'}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
