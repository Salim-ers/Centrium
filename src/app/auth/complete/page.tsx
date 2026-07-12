'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';

import { markSessionActive } from '@/hooks/useSessionPresence';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// =========================================================================
// /auth/complete — consommation CLIENT des tokens de fragment (#access_token)
// -------------------------------------------------------------------------
// POURQUOI : les liens email Supabase basés sur {{ .ConfirmationURL }}
// (invite, confirmation) passent par GoTrue /verify qui redirige vers
// redirect_to avec la session dans le FRAGMENT d'URL — invisible pour une
// route serveur comme /auth/callback (les fragments ne quittent jamais le
// navigateur). Résultat historique : « missing_code » → /login, aucun
// set-password ne s'affichait.
//
// /auth/callback redirige désormais ici quand il ne voit ni code ni
// token_hash : le fragment SURVIT aux redirections 3xx, cette page le lit
// côté client, établit la session (setSession) et route vers `?next=` ou,
// à défaut, selon le type du lien (invite/recovery → set-password).
// Gère aussi les fragments d'erreur GoTrue (#error_code=otp_expired…).
// =========================================================================

function destinationForType(type: string | null): string {
  switch (type) {
    case 'recovery':
      return '/auth/reset-password';
    case 'invite':
    case 'signup':
    case 'magiclink':
      return '/auth/first-password?welcome=invited';
    default:
      return '/dashboard';
  }
}

function CompleteInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hash = new URLSearchParams(rawHash);

    // Fragment d'erreur GoTrue (lien expiré / déjà utilisé / révoqué)
    const errCode = hash.get('error_code') ?? hash.get('error');
    if (errCode) {
      const mapped = /expired/i.test(errCode) ? 'otp_expired' : 'access_denied';
      router.replace(`/login?error=${mapped}`);
      return;
    }

    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (!accessToken || !refreshToken) {
      router.replace('/login?error=missing_code');
      return;
    }

    const type = hash.get('type');
    const nextParam = search?.get('next');
    const next =
      nextParam && nextParam.startsWith('/') ? nextParam : destinationForType(type);

    // Session établie CÔTÉ SERVEUR (POST /api/auth/session) : setSession()
    // client passe par navigator.locks (verrou partagé entre onglets) et
    // pouvait rester pendant indéfiniment avec plusieurs onglets Centrium
    // ouverts — spinner infini. Le serveur n'a pas ce problème et pose les
    // cookies dans la réponse. Watchdog 12 s → écran d'erreur avec retry.
    let done = false;
    const watchdog = setTimeout(() => {
      if (!done) setFailed(true);
    }, 12_000);

    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    })
      .then(async (res) => {
        done = true;
        clearTimeout(watchdog);
        if (!res.ok) {
          router.replace('/login?error=session_expired');
          return;
        }
        // Sans ce flag, SessionPresenceGate forcerait un re-logout au
        // premier chargement d'une page protégée.
        markSessionActive();
        // Nettoie le fragment (tokens) de l'historique avant de router.
        window.history.replaceState(null, '', '/auth/complete');
        window.location.replace(next);
      })
      .catch(() => {
        done = true;
        clearTimeout(watchdog);
        setFailed(true);
      });

    return () => clearTimeout(watchdog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isEn ? (
              <>
                Sign-in didn&apos;t complete (network or altered link). Try again —
                if the problem persists, request a new link.
              </>
            ) : (
              <>
                La connexion n&apos;a pas abouti (réseau ou lien altéré). Réessaie —
                si le problème persiste, demande un nouveau lien.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-sm hover-surface transition"
          >
            <RefreshCw className="h-4 w-4" />
            {isEn ? 'Try again' : 'Réessayer'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">{isEn ? 'Signing in…' : 'Connexion en cours…'}</p>
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <CompleteInner />
    </Suspense>
  );
}
