import type { Metadata } from 'next';
import Link from 'next/link';

import { DemoForm } from '@/components/site/pages/DemoForm';
import { Kicker, Lead, MaskImage, Section, Title, Wide } from '@/components/site/kit';

export const metadata: Metadata = {
  title: 'Demander une démo',
  description: 'Voyez Centrium avec vos propres enjeux : CRM, staffing, missions, CRA et rentabilité de votre ESN.',
  alternates: { canonical: '/demo' },
  openGraph: { title: 'Demander une démo — Centrium', url: '/demo', type: 'website' },
};

const EXPECT = [
  'Une démonstration sur vos cas : pipeline, staffing, CRA, rentabilité.',
  'Vos questions sur la reprise de vos données et l’organisation des rôles.',
  'Pour Scale : un tarif établi selon vos volumes.',
];

export default function DemoPage() {
  return (
    <Section tone="ivory" aria-label="Demander une démo" className="pb-24 pt-32 md:pb-32 md:pt-40">
      <Wide className="grid gap-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-20">
        <div>
          <Kicker n="01">Démo</Kicker>
          <Title as="h1" size="lg" immediate className="mt-6 text-[clamp(2.4rem,5.4vw,6rem)]" lines={[['Voyez Centrium'], ['avec vos propres'], ['', { em: 'enjeux.' }]]} />
          <Lead className="mt-6">Trois questions, puis nous revenons vers vous pour convenir d’un créneau.</Lead>
          <ul className="mt-10 border-t border-ink/15">
            {EXPECT.map((e, i) => (
              <li key={e} className="flex gap-4 border-b border-ink/15 py-4 text-[16px]">
                <span className="text-[12px] font-semibold tabular-nums tracking-[0.2em] text-terra">0{i + 1}</span>
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[15px] text-ink-soft/75">
            Vous préférez essayer tout de suite ?{' '}
            <Link href="/essai" className="font-semibold text-terra-deep underline-offset-4 hover:underline">
              Démarrer l’essai de 7 jours
            </Link>
          </p>
          <MaskImage src="/photos/notebook-glasses.webp" alt="Carnet ouvert, stylo et lunettes posés dessus" sizes="(min-width: 1024px) 40vw, 100vw" className="mt-14 hidden aspect-[16/10] rounded-[28px] lg:block" />
        </div>
        <div className="lg:pt-6">
          <div className="rounded-[32px] bg-warm p-6 ring-1 ring-ink/[0.06] sm:p-10 lg:sticky lg:top-28">
            <DemoForm />
          </div>
        </div>
      </Wide>
    </Section>
  );
}
