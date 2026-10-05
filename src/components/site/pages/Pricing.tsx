'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { PLAN_CATALOG, PUBLIC_PLAN_IDS, type BillingInterval, type PublicPlanId } from '@/lib/billing/plans';
import { cn } from '@/lib/utils';

import { Faq } from '../Faq';
import { Appear, Kicker, Lead, Section, Title, Wide } from '../kit';

const FOR_WHOM: Record<PublicPlanId, string> = {
  v2_starter: 'Pour démarrer : un dirigeant, un commercial, une première équipe.',
  v2_team: 'Pour l’ESN qui structure son commerce et son staffing.',
  v2_growth: 'Pour plusieurs business managers et une centaine de consultants.',
  v2_scale: 'Au-delà : volumes, conditions et accompagnement définis ensemble.',
};

const INCLUDED = [
  'CRM : contacts, sociétés, opportunités, devis',
  'Staffing et matching explicable',
  'Missions, CRA et préfacturation',
  'Portails client et consultant, sans licence',
  'Automatisations et analytics',
  'Permissions par rôle',
];

const FAQ = [
  { q: 'Qui compte comme manager ?', a: 'Tout membre interne de votre organisation : dirigeants, business managers, recruteurs, finance. Les consultants et les clients connectés à leur portail ne sont pas comptés.' },
  { q: 'Que se passe-t-il si je dépasse la limite de consultants ?', a: 'Centrium vous prévient au moment d’ajouter un consultant au-delà de votre offre et vous propose l’offre supérieure. Vos données restent intactes.' },
  { q: 'Comment fonctionne l’annuel ?', a: 'Vous payez 10 mois pour 12, en une fois. Vous pouvez passer du mensuel à l’annuel depuis la page Abonnement.' },
  { q: 'L’essai est-il gratuit ?', a: 'Oui : 7 jours d’essai. À la fin, l’abonnement choisi démarre ; vous pouvez l’annuler avant.' },
  { q: 'Comment se passe Scale ?', a: 'Pour les organisations au-delà de 10 managers ou 100 consultants : le tarif démarre à 299 € HT par mois et se définit avec vous selon vos volumes.' },
];

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

function IntervalSwitch({ value, onChange }: { value: BillingInterval; onChange: (v: BillingInterval) => void }) {
  return (
    <div role="radiogroup" aria-label="Périodicité" className="inline-flex rounded-full border border-ink/15 p-1 text-[12.5px] font-semibold uppercase tracking-[0.12em]">
      {(['month', 'year'] as const).map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(i)}
          className={cn('rounded-full px-4 py-2 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra', value === i ? 'bg-ink text-ivory' : 'text-ink/60 hover:text-ink')}
        >
          {i === 'month' ? 'Mensuel' : 'Annuel · 2 mois offerts'}
        </button>
      ))}
    </div>
  );
}

/** Page Tarifs : colonne gauche collante, offres en lignes éditoriales. */
export function Pricing() {
  const [interval, setBillingInterval] = useState<BillingInterval>('month');

  return (
    <>
      <Section tone="ivory" aria-label="Offres" className="pb-24 pt-32 md:pb-36 md:pt-40">
        <Wide className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div>
            <div className="lg:sticky lg:top-28">
              <Kicker>Tarifs</Kicker>
              <Title as="h1" size="lg" immediate className="mt-6 text-[clamp(2.6rem,5.6vw,6.4rem)]" lines={[['Choisissez'], ['votre ', { em: 'échelle.' }]]} />
              <Lead className="mt-6">Tous les modules dans chaque offre. Seuls changent le nombre de managers et de consultants. Les portails client et consultant ne comptent jamais comme licences.</Lead>
              <div className="mt-8">
                <IntervalSwitch value={interval} onChange={setBillingInterval} />
              </div>
              <p className="mt-4 text-[13px] text-taupe">Prix hors taxes. Essai de 7 jours. Résiliation en ligne, effective à la fin de la période payée.</p>
            </div>
          </div>

          <ol className="border-t border-ink/15">
            {PUBLIC_PLAN_IDS.map((id, i) => {
              const p = PLAN_CATALOG[id];
              const yearly = interval === 'year' && p.yearlyEur != null;
              const price = yearly ? p.yearlyEur! : p.monthlyEur;
              return (
                <li key={id} className={cn('relative border-b border-ink/15 py-10', p.highlighted && 'md:-mx-6 md:rounded-[28px] md:border-transparent md:bg-terra md:px-6 md:text-ivory')}>
                  <Appear delay={i * 0.05} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-[clamp(2rem,3.6vw,3.4rem)] font-extrabold uppercase leading-none tracking-[-0.045em]">{p.name}</h2>
                        {p.highlighted && <span className="rounded-full bg-terra px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white md:bg-ivory md:text-terra-deep">Recommandé</span>}
                      </div>
                      <p className={cn('mt-3 max-w-md text-[15.5px] leading-[1.5]', p.highlighted ? 'text-ink-soft/75 md:text-ivory/80' : 'text-ink-soft/75')}>{FOR_WHOM[id]}</p>
                      <p className="mt-4 text-[14px] font-semibold">
                        {p.managers ? `Jusqu’à ${p.managers} managers` : 'Au-delà de 10 managers'} · {p.consultants ? `jusqu’à ${p.consultants} consultants` : 'au-delà de 100 consultants'}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <div className="flex items-baseline gap-2 md:justify-end">
                        {!p.selfService && <span className="text-[14px] font-medium opacity-70">dès</span>}
                        <span className="text-[clamp(2.8rem,5vw,4.6rem)] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{fmt(price)} €</span>
                      </div>
                      <div className="mt-1 text-[13px] opacity-70">HT / {yearly ? 'an' : 'mois'}{yearly ? ` · soit ${fmt(Math.round(price / 12))} € / mois` : ''}</div>
                      <Link
                        href={p.selfService ? `/essai?plan=${id}${yearly ? '&interval=year' : ''}` : `/demo?plan=${id}`}
                        data-cursor="Ouvrir"
                        className={cn(
                          'group mt-5 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[12.5px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2',
                          p.highlighted ? 'bg-terra text-white hover:bg-terra-deep md:bg-ivory md:text-ink md:hover:bg-white' : 'border border-ink/20 hover:border-ink hover:bg-ink hover:text-ivory',
                        )}
                      >
                        {p.selfService ? 'Essayer 7 jours' : 'Parler à l’équipe'}
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </Appear>
                </li>
              );
            })}
          </ol>
        </Wide>
      </Section>

      <Section tone="deep" aria-label="Inclus dans chaque offre" className="py-24 md:py-32">
        <Wide className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div>
            <Kicker>Inclus partout</Kicker>
            <Title size="md" className="mt-6" lines={[['Pas de module'], ['en ', { em: 'option.' }]]} />
          </div>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {INCLUDED.map((it) => (
              <li key={it} className="flex gap-3 border-b border-ivory/15 py-4 text-[16px]">
                <Check className="mt-1 h-4 w-4 shrink-0 text-terra-peach" /> {it}
              </li>
            ))}
          </ul>
        </Wide>
      </Section>

      <Section tone="warm" aria-label="Questions sur les tarifs" className="py-24 md:py-32">
        <Wide className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div>
            <Kicker>Questions</Kicker>
            <Title size="md" className="mt-6" lines={[['Avant de vous'], ['', { em: 'lancer.' }]]} />
            <p className="mt-6 text-[15px] text-ink-soft/75">
              Une autre question ?{' '}
              <Link href="/demo" className="font-semibold text-terra-deep underline-offset-4 hover:underline">
                Parlons-en
              </Link>
              .
            </p>
          </div>
          <Faq items={FAQ} />
        </Wide>
      </Section>
    </>
  );
}
