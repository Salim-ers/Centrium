'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { markSessionActive } from '@/hooks/useSessionPresence';

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
      return '/auth/set-password?welcome=recovery';
    case 'invite':
    case 'signup':
    case 'magiclink':
      return '/auth/set-password?welcome=invited';
    default:
      return '/dashboard';
  }
}

function CompleteInner() {
  const router = useRouter();
  const search = useSearchParams();

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

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace('/login?error=session_expired');
          return;
        }
        // Sans ce flag, SessionPresenceGate forcerait un re-logout au
        // premier chargement d'une page protégée.
        markSessionActive();
        // Nettoie le fragment (tokens) de l'historique avant de router.
        window.history.replaceState(null, '', '/auth/complete');
        window.location.replace(next);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Connexion en cours…</p>
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
