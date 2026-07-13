import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { MfaChallengeCard } from './MfaChallengeCard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Validation MFA — Centrium',
  description: 'Saisissez le code à 6 chiffres de votre application authenticator pour continuer.',
};

type SearchParams = { next?: string };

export default async function MfaChallengePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Si déjà aal2 (déjà validé MFA dans cette session) → continuer direct
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') {
    redirect(safeNext(searchParams.next));
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedFactors = factors?.all?.filter((f) => f.status === 'verified') ?? [];

  // Aucun facteur enrôlé alors qu'on est redirigé ici = inconsistance → on envoie sur enroll
  if (verifiedFactors.length === 0) {
    const next = searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : '';
    redirect(`/auth/mfa-enroll${next}`);
  }

  const primary = verifiedFactors[0];

  return <MfaChallengeCard factorId={primary.id} next={safeNext(searchParams.next)} />;
}

function safeNext(next?: string): string {
  if (!next) return '/dashboard';
  // Doit commencer par "/" mais pas "//" (= protocol-relative URL → open redirect)
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  // Bloque path traversal et injection de headers HTTP via CR/LF
  if (next.includes('..') || /[\r\n\t]/.test(next)) return '/dashboard';
  // Bloque les schemes connus (javascript:, data:, vbscript:, file:)
  if (/^\/[^/]*:/.test(next)) return '/dashboard';
  return next;
}
