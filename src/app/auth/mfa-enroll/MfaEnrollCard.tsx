'use client';

import { Suspense } from 'react';
import { ShieldAlert } from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { MfaEnrollForm } from './MfaEnrollForm';

/**
 * Carte visuelle de l'enrôlement MFA (client) — extraite de la page serveur
 * (qui garde l'auth + metadata) pour permettre la bilinguisation via useLocale.
 */
export function MfaEnrollCard({ next }: { next: string }) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-warning/20 bg-card/40 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {isEn ? 'MFA activation required' : 'Activation MFA requise'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? 'Your organization requires MFA for administrators'
                  : 'Votre organisation impose le MFA pour les administrateurs'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 mb-6">
            <p className="text-sm leading-relaxed text-foreground/85">
              {isEn ? (
                <>
                  For security reasons, you must enable two-factor authentication before continuing.
                  This takes <span className="font-semibold">2 minutes</span> and is done{' '}
                  <span className="font-semibold">only once</span> per device.
                </>
              ) : (
                <>
                  Pour des raisons de sécurité, vous devez activer la double authentification avant
                  de continuer. Cette opération prend <span className="font-semibold">2 minutes</span>{' '}
                  et ne se fait <span className="font-semibold">qu&apos;une seule fois</span> par
                  appareil.
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              {isEn
                ? 'Prerequisite: an installed authenticator app — Google Authenticator, 1Password, Bitwarden, Microsoft Authenticator, etc.'
                : 'Pré-requis : une application authenticator installée — Google Authenticator, 1Password, Bitwarden, Microsoft Authenticator, etc.'}
            </p>
          </div>

          <Suspense>
            <MfaEnrollForm next={next} />
          </Suspense>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            {isEn ? 'Need help?' : 'Besoin d\'aide ?'}{' '}
            <a href="mailto:security@centrium-platform.com" className="underline">
              security@centrium-platform.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
