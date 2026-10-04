'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { FadeIn } from '@/components/site/Motion';
import { PricingCards } from '@/components/site/PricingCards';
import { Faq } from '@/components/site/Faq';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { PLAN_CATALOG, PUBLIC_PLAN_IDS, type BillingInterval } from '@/lib/billing/plans';

type Lang = 'fr' | 'en';

const FAQ = {
  fr: [
    { q: 'Qui compte comme manager ?', a: 'Tout membre interne de votre organisation : dirigeants, business managers, recruteurs, finance. Les consultants et les clients connectés à leur portail ne sont pas comptés.' },
    { q: 'Que se passe-t-il si je dépasse la limite de consultants ?', a: 'Centrium vous prévient au moment d’ajouter un consultant au-delà de votre offre et vous propose l’offre supérieure. Vos données restent intactes.' },
    { q: 'Comment fonctionne l’annuel ?', a: 'Vous payez 10 mois pour 12, en une fois. Vous pouvez passer du mensuel à l’annuel depuis la page Abonnement.' },
    { q: 'L’essai est-il gratuit ?', a: 'Oui : 7 jours d’essai. À la fin, l’abonnement choisi démarre ; vous pouvez l’annuler avant.' },
    { q: 'Comment se passe Scale ?', a: 'Pour les organisations au-delà de 10 managers ou 100 consultants : le tarif démarre à 299 € HT par mois et se définit avec vous selon vos volumes.' },
  ],
  en: [
    { q: 'Who counts as a manager?', a: 'Any internal member of your organisation: leadership, business managers, recruiters, finance. Consultants and clients using their portal are not counted.' },
    { q: 'What if I exceed the consultant limit?', a: 'Centrium warns you when you add a consultant beyond your plan and suggests the next plan. Your data stays intact.' },
    { q: 'How does yearly billing work?', a: 'You pay 10 months for 12, upfront. You can switch from monthly to yearly on the Subscription page.' },
    { q: 'Is the trial free?', a: 'Yes: a 7-day trial. At the end, the chosen subscription starts; you can cancel before.' },
    { q: 'How does Scale work?', a: 'For organisations beyond 10 managers or 100 consultants: pricing starts at €299 excl. VAT per month and is set with you based on volumes.' },
  ],
};

function Compare({ lang, interval }: { lang: Lang; interval: BillingInterval }) {
  const fr = lang === 'fr';
  const rows: Array<{ label: string; values: Array<string | boolean> }> = [
    {
      label: fr ? (interval === 'year' ? 'Prix HT / an' : 'Prix HT / mois') : interval === 'year' ? 'Price excl. VAT / year' : 'Price excl. VAT / month',
      values: PUBLIC_PLAN_IDS.map((id) => {
        const p = PLAN_CATALOG[id];
        if (!p.selfService) return fr ? `dès ${p.monthlyEur} €/mois` : `from €${p.monthlyEur}/month`;
        return `${interval === 'year' ? p.yearlyEur : p.monthlyEur} €`;
      }),
    },
    { label: fr ? 'Managers (licences)' : 'Managers (licences)', values: PUBLIC_PLAN_IDS.map((id) => (PLAN_CATALOG[id].managers ? String(PLAN_CATALOG[id].managers) : fr ? 'Sur mesure' : 'Custom')) },
    { label: fr ? 'Consultants' : 'Consultants', values: PUBLIC_PLAN_IDS.map((id) => (PLAN_CATALOG[id].consultants ? String(PLAN_CATALOG[id].consultants) : fr ? 'Sur mesure' : 'Custom')) },
    { label: fr ? 'CRM, clients, opportunités, devis' : 'CRM, clients, opportunities, quotes', values: PUBLIC_PLAN_IDS.map(() => true) },
    { label: fr ? 'Staffing et matching explicable' : 'Staffing and explainable matching', values: PUBLIC_PLAN_IDS.map(() => true) },
    { label: fr ? 'Missions, CRA, préfacturation' : 'Missions, timesheets, pre-invoicing', values: PUBLIC_PLAN_IDS.map(() => true) },
    { label: fr ? 'Portails client et consultant' : 'Client and consultant portals', values: PUBLIC_PLAN_IDS.map(() => true) },
    { label: fr ? 'Automatisations et analytics' : 'Automations and analytics', values: PUBLIC_PLAN_IDS.map(() => true) },
    { label: fr ? 'Permissions par rôle' : 'Role permissions', values: PUBLIC_PLAN_IDS.map(() => true) },
    { label: fr ? 'Souscription en ligne' : 'Online subscription', values: PUBLIC_PLAN_IDS.map((id) => PLAN_CATALOG[id].selfService) },
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-[14px]">
        <caption className="sr-only">{fr ? 'Comparatif des offres' : 'Plan comparison'}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-5 py-4 text-left font-medium text-muted-foreground">
              {fr ? 'Offre' : 'Plan'}
            </th>
            {PUBLIC_PLAN_IDS.map((id) => (
              <th key={id} scope="col" className="px-3 py-4 text-center font-semibold">
                {PLAN_CATALOG[id].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0">
              <th scope="row" className="px-5 py-3 text-left font-normal">
                {r.label}
              </th>
              {r.values.map((v, i) => (
                <td key={i} className="num px-3 py-3 text-center">
                  {v === true ? <Check className="mx-auto h-4 w-4 text-success" aria-label={fr ? 'Inclus' : 'Included'} /> : v === false ? <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label={fr ? 'Non' : 'No'} /> : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TarifsContent() {
  const { locale } = useLocale();
  const lang: Lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const [interval, setInterval_] = useState<BillingInterval>('month');

  return (
    <MarketingShell>
      <main>
        <section className="bg-gradient-to-b from-sand-100 to-transparent">
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 text-center sm:px-6 md:pt-20">
            <FadeIn>
              <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-tight">
                {fr ? 'Des prix affichés.' : 'Published prices.'}
                <span className="block text-primary">{fr ? 'Tous les modules, dans chaque offre.' : 'Every module, in every plan.'}</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-[17px] text-muted-foreground">
                {fr
                  ? 'Seuls changent le nombre de managers et de consultants. Les portails client et consultant ne comptent jamais comme licences.'
                  : 'Only the number of managers and consultants changes. Client and consultant portals never count as licences.'}
              </p>
            </FadeIn>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <PricingCards lang={lang} interval={interval} onIntervalChange={setInterval_} />
          <p className="mt-4 text-center text-[13px] text-muted-foreground">
            {fr ? 'Prix hors taxes. Essai de 7 jours. Résiliation en ligne, effective à la fin de la période payée.' : 'Prices exclude VAT. 7-day trial. Cancel online, effective at the end of the paid period.'}
          </p>
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 className="mb-6 font-display text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-tight">{fr ? 'Comparer les offres' : 'Compare plans'}</h2>
          <Compare lang={lang} interval={interval} />
        </section>
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <h2 className="mb-6 text-center font-display text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-tight">{fr ? 'Questions sur les tarifs' : 'Pricing questions'}</h2>
          <Faq items={FAQ[lang]} />
          <div className="mt-10 text-center">
            <p className="text-[15px] text-muted-foreground">{fr ? 'Besoin d’en parler avant de vous lancer ?' : 'Want to talk before you start?'}</p>
            <Link href="/demo" className="mt-3 inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-[15px] font-medium hover:bg-muted">
              {fr ? 'Demander une démo' : 'Book a demo'}
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
