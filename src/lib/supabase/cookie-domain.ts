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
