import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ShieldAlert } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { MfaEnrollForm } from './MfaEnrollForm';

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

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-amber-400/20 bg-card/40 backdrop-blur p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Activation MFA requise</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Votre organisation impose le MFA pour les administrateurs
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 mb-6">
            <p className="text-sm leading-relaxed text-foreground/85">
              Pour des raisons de sécurité, vous devez activer la double
              authentification avant de continuer. Cette opération prend{' '}
              <span className="font-semibold">2 minutes</span> et ne se fait{' '}
              <span className="font-semibold">qu&apos;une seule fois</span> par
              appareil.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Pré-requis : une application authenticator installée — Google
              Authenticator, 1Password, Bitwarden, Microsoft Authenticator, etc.
            </p>
          </div>

          <Suspense>
            <MfaEnrollForm next={safeNext(searchParams.next)} />
          </Suspense>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            Besoin d&apos;aide ?{' '}
            <a href="mailto:security@centrium-platform.com" className="underline">
              security@centrium-platform.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function safeNext(next?: string): string {
  if (!next) return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  if (next.includes('..') || /[\r\n\t]/.test(next)) return '/dashboard';
  if (/^\/[^/]*:/.test(next)) return '/dashboard';
  return next;
}
