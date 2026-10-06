import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DemoLauncher } from '@/components/site/pages/DemoLauncher';
import { Kicker, Lead, Section, Title, Wide } from '@/components/site/kit';
import { DEMO_ORG_ID, demoEnabled, type DemoKind } from '@/lib/demo/config';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const KINDS: Record<string, { kind: DemoKind; title: string; lead: string }> = {
  esn: {
    kind: 'esn',
    title: 'Démo ESN',
    lead: 'Le poste de pilotage d’une ESN de 22 consultants : tableau de bord, CRM, talents, staffing, missions, opérations.',
  },
  consultant: {
    kind: 'consultant',
    title: 'Démo Consultant',
    lead: 'L’espace d’une consultante en mission : sa mission, ses CRA, ses documents, son profil.',
  },
};

export function generateMetadata({ params }: { params: { kind: string } }): Metadata {
  const entry = KINDS[params.kind];
  return {
    title: entry?.title ?? 'Démo',
    description: entry?.lead,
    robots: { index: false, follow: false },
  };
}

/**
 * Lien direct d'un espace de démonstration : /demo/esn ou /demo/consultant.
 * Ouvre la session de démo (voir DemoLauncher) ; si un vrai compte est déjà
 * connecté, demande confirmation avant de le remplacer.
 */
export default async function DemoKindPage({ params }: { params: { kind: string } }) {
  const entry = KINDS[params.kind];
  if (!entry) notFound();

  let signedInAs: string | null = null;
  if (demoEnabled()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('organization_id, email').eq('id', user.id).maybeSingle();
      // Déjà dans la démo : on rouvre simplement l'espace demandé.
      if (profile?.organization_id !== DEMO_ORG_ID) signedInAs = profile?.email ?? user.email ?? 'votre compte';
    }
  }

  return (
    <Section tone="ivory" aria-label={entry.title} className="pb-32 pt-32 md:pt-40">
      <Wide>
        <div className="max-w-2xl">
          <Kicker>Démo en libre accès</Kicker>
          <Title as="h1" size="lg" immediate className="mt-6 text-[clamp(2.2rem,4.6vw,4.4rem)]" lines={[[entry.title]]} />
          <Lead className="mt-5">{entry.lead}</Lead>
          <div className="mt-10">
            {demoEnabled() ? (
              <DemoLauncher kind={entry.kind} signedInAs={signedInAs} />
            ) : (
              <div className="space-y-4 text-[16px]">
                <p>La démo en libre accès n’est pas encore ouverte.</p>
                <Link href="/demo" className="font-semibold text-terra-deep underline-offset-4 hover:underline">
                  Demander une démonstration
                </Link>
              </div>
            )}
          </div>
          <p className="mt-10 text-[13.5px] text-ink-soft/70">
            Données fictives, partagées entre visiteurs et réinitialisées régulièrement. N’y saisissez aucune information réelle.
          </p>
        </div>
      </Wide>
    </Section>
  );
}
