// =========================================================================
// Domaine de cookie partagé apex ↔ www
// -------------------------------------------------------------------------
// SYMPTÔME corrigé : les liens email pointent vers centrium-platform.com
// (SiteURL / NEXT_PUBLIC_APP_URL) alors que Vercel sert le site sur
// www.centrium-platform.com. Les cookies de session Supabase sont
// host-only par défaut : posés sur l'apex pendant /auth/callback, ils
// étaient INVISIBLES après le rebond vers www → getUser() vide →
// redirection /login juste après une vérification pourtant réussie
// (confirmé par les logs GoTrue : /verify 200, puis session perdue).
//
// Fix : en production, on force Domain=.centrium-platform.com (dérivé de
// NEXT_PUBLIC_APP_URL, www strippé) → les cookies valent pour l'apex ET
// tous ses sous-domaines. En local (localhost), on n'ajoute rien.
//
// PAS de 'server-only' ici : importé aussi par le middleware (edge).
// =========================================================================

export function sharedAuthCookieDomain(): string | undefined {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_APP_URL ?? '').hostname;
    if (!host || host === 'localhost' || host.endsWith('.localhost')) {
      return undefined;
    }
    const root = host.replace(/^www\./, '');
    if (!root.includes('.')) return undefined;
    return `.${root}`;
  } catch {
    return undefined;
  }
}

// =========================================================================
// Marqueur "entrée légitime par lien email"
// -------------------------------------------------------------------------
// Le garde anti-restauration (script inline du RootLayout +
// useSessionPresence) déconnecte toute page protégée chargée sans le flag
// sessionStorage `centrium-session-active` — flag posé uniquement par le
// FORMULAIRE de login. Une session créée côté serveur par un lien email
// (invite, recovery, magic link → /auth/callback ou /api/auth/session)
// n'a jamais ce flag : l'invité était déconnecté ~1 s après un /verify
// pourtant réussi (logs GoTrue : verify 200 → login → logout 204).
//
// Fix : les routes serveur qui établissent une session posent ce cookie
// court (5 min, NON httpOnly). Le garde le consomme : cookie présent →
// pose le flag sessionStorage, supprime le cookie, laisse passer.
// Il n'accorde AUCUN droit — il empêche seulement l'auto-logout.
// =========================================================================

export const FRESH_AUTH_COOKIE = 'centrium-fresh-auth';

export function freshAuthCookieOptions() {
  const domain = sharedAuthCookieDomain();
  return {
    name: FRESH_AUTH_COOKIE,
    value: '1',
    maxAge: 300,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    ...(domain ? { domain } : {}),
  };
}
