import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { MfaChallengeForm } from './MfaChallengeForm';

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

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-violet-500/10 border border-violet-400/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Validation en deux étapes</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Votre organisation requiert le MFA pour les admins
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Ouvrez votre application authenticator (Google Authenticator, 1Password,
            Bitwarden…) et saisissez le code à 6 chiffres affiché pour{' '}
            <span className="text-foreground font-medium">Centrium</span>.
          </p>

          <Suspense>
            <MfaChallengeForm factorId={primary.id} next={safeNext(searchParams.next)} />
          </Suspense>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            Vous avez perdu votre appareil ?{' '}
            <a href="mailto:security@centrium-platform.com" className="underline">
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </main>
  );
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
