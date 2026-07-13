import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { MfaEnrollCard } from './MfaEnrollCard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Activer le MFA — Centrium',
  description: 'Votre organisation requiert l’activation du MFA pour les administrateurs.',
};

type SearchParams = { next?: string };

export default async function MfaEnrollPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Si déjà aal2 → continuer
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') {
    redirect(safeNext(searchParams.next));
  }

  // Si déjà un facteur enrolled → c'est juste un challenge à faire, pas un enroll
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedFactors = factors?.all?.filter((f) => f.status === 'verified') ?? [];
  if (verifiedFactors.length > 0) {
    const next = searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : '';
    redirect(`/auth/mfa-challenge${next}`);
  }

  return <MfaEnrollCard next={safeNext(searchParams.next)} />;
}

function safeNext(next?: string): string {
  if (!next) return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  if (next.includes('..') || /[\r\n\t]/.test(next)) return '/dashboard';
  if (/^\/[^/]*:/.test(next)) return '/dashboard';
  return next;
}
