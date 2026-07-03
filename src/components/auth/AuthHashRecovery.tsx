'use client';

import { useEffect } from 'react';

import { createClient } from '@/lib/supabase/client';
import { markSessionActive } from '@/hooks/useSessionPresence';

// =========================================================================
// Filet de sécurité pour les liens email Supabase égarés sur la landing.
// -------------------------------------------------------------------------
// SYMPTÔME : quand le `redirect_to` d'un email (invitation, reset mdp,
// portail consultant) n'est pas dans la liste blanche Supabase (Dashboard
// → Auth → URL Configuration → Redirect URLs), GoTrue retombe SILENCIEUSE-
// MENT sur la Site URL — l'utilisateur atterrit sur `/` (page d'accueil
// marketing) avec ses tokens dans le hash (#access_token=…&type=invite)
// ou son code PKCE en query (?code=…), et rien ne les consomme : le lien
// « ne marche pas ».
//
// Ce composant (monté dans le RootLayout, no-op partout sauf `/`) :
//   1. détecte ?code=… → rejoue le flow normal via /auth/callback
//   2. détecte #access_token → établit la session (setSession) puis route
//      selon le type : recovery/invite/magiclink → /auth/set-password
//
// La VRAIE correction reste la config Dashboard (Site URL + Redirect URLs
// en https://centrium-platform.com/**) — ce filet garantit simplement que
// plus aucun lien email ne meurt sur la landing en attendant / en cas de
// régression de config.
// =========================================================================

function destinationFor(type: string | null): string {
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

export function AuthHashRecovery() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/') return;

    // Cas 1 : code PKCE égaré sur / → on le renvoie au callback officiel.
    const search = new URLSearchParams(window.location.search);
    const code = search.get('code');
    if (code) {
      const next = destinationFor(search.get('type'));
      window.location.replace(
        `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
      );
      return;
    }

    // Cas 2 : tokens implicites dans le hash.
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!rawHash) return;
    const hash = new URLSearchParams(rawHash);
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (!accessToken || !refreshToken) return;

    const type = hash.get('type');
    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          window.location.replace('/login?error=session_expired');
          return;
        }
        // Sans ce flag, SessionPresenceGate force un re-logout au premier
        // chargement d'une page protégée (protection "navigateur restauré").
        markSessionActive();
        window.location.replace(destinationFor(type));
      });
  }, []);

  return null;
}
