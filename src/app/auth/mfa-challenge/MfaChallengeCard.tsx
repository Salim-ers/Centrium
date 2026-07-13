'use client';

import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { MfaChallengeForm } from './MfaChallengeForm';

/**
 * Carte visuelle du challenge MFA (client) — extraite de la page serveur
 * (qui garde l'auth + metadata) pour permettre la bilinguisation via
 * useLocale. La page passe le factorId + next dérivés côté serveur.
 */
export function MfaChallengeCard({ factorId, next }: { factorId: string; next: string }) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-violet-500/10 border border-violet-400/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {isEn ? 'Two-step verification' : 'Validation en deux étapes'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? 'Your organization requires MFA for admins'
                  : 'Votre organisation requiert le MFA pour les admins'}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {isEn ? (
              <>
                Open your authenticator app (Google Authenticator, 1Password, Bitwarden…) and enter
                the 6-digit code shown for{' '}
                <span className="text-foreground font-medium">Centrium</span>.
              </>
            ) : (
              <>
                Ouvrez votre application authenticator (Google Authenticator, 1Password,
                Bitwarden…) et saisissez le code à 6 chiffres affiché pour{' '}
                <span className="text-foreground font-medium">Centrium</span>.
              </>
            )}
          </p>

          <Suspense>
            <MfaChallengeForm factorId={factorId} next={next} />
          </Suspense>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            {isEn ? 'Lost your device?' : 'Vous avez perdu votre appareil ?'}{' '}
            <a href="mailto:security@centrium-platform.com" className="underline">
              {isEn ? 'Contact support' : 'Contactez le support'}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
