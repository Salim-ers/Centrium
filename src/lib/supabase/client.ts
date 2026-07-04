import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

import { sharedAuthCookieDomain } from './cookie-domain';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let singleton: BrowserClient | null = null;

/**
 * Strip maxAge / expires pour rendre TOUS les cookies session-only,
 * y compris les cookies d'auth Supabase (`sb-*`).
 *
 * Comportement attendu : à la fermeture du navigateur, les cookies
 * sont purgés → l'utilisateur n'est plus connecté au prochain démarrage
 * et doit ressaisir son mot de passe (email pré-rempli via "Se souvenir
 * de moi" si coché).
 *
 * F5 ne casse rien : un cookie de session survit aux rafraîchissements
 * tant que le PROCESSUS navigateur reste vivant.
 */
function sessionOnly(_name: string, options: CookieOptions): CookieOptions {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options;
  return rest;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  // En cas de DOUBLON (ancien cookie host-only + nouveau cookie
  // Domain=.centrium-platform.com portant le même nom), le navigateur
  // liste le plus ancien en premier. On prend la DERNIÈRE occurrence :
  // c'est le cookie de domaine posé après la migration — le plus frais.
  const matches = document.cookie
    .split('; ')
    .filter((row) => row.startsWith(`${encodeURIComponent(name)}=`));
  const last = matches.at(-1);
  return last ? decodeURIComponent(last.split('=')[1]) : undefined;
}

function writeCookie(name: string, value: string, options: CookieOptions) {
  if (typeof document === 'undefined') return;
  const opts = sessionOnly(name, options);
  // Domaine partagé apex ↔ www : sans lui, les refreshs de token côté
  // client reposeraient des cookies host-only → doublons avec ceux posés
  // par le serveur (Domain=…) et sessions fantômes selon l'hôte.
  const domain = opts.domain ?? sharedAuthCookieDomain();
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (opts.path) cookie += `; Path=${opts.path}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.secure) cookie += `; Secure`;
  // Pas de Max-Age / Expires : le cookie meurt avec la session navigateur.
  document.cookie = cookie;
}

function deleteCookie(name: string, options: CookieOptions) {
  if (typeof document === 'undefined') return;
  const domain = options.domain ?? sharedAuthCookieDomain();
  // Pour supprimer : Max-Age=0 (forcé même en session-only). On supprime
  // les DEUX variantes (host-only ET domaine) pour couvrir la migration.
  let base = `${encodeURIComponent(name)}=; Max-Age=0`;
  if (options.path) base += `; Path=${options.path}`;
  document.cookie = base; // variante host-only
  if (domain) document.cookie = `${base}; Domain=${domain}`; // variante domaine
}

/**
 * Purge one-shot des doublons hérités : avant la migration
 * Domain=.centrium-platform.com, les cookies sb-* étaient host-only.
 * Après, serveur et client posent des cookies de domaine — si les deux
 * variantes coexistent (même nom), les lecteurs "premier match" tombaient
 * sur le token PÉRIMÉ. On supprime la variante host-only, la variante
 * domaine (la fraîche) reste.
 */
function purgeLegacyHostOnlyDuplicates() {
  if (typeof document === 'undefined') return;
  if (!sharedAuthCookieDomain()) return;
  const names = document.cookie.split('; ').map((row) => row.split('=')[0]);
  const dupes = names.filter(
    (n, i) => n.startsWith('sb-') && names.indexOf(n) !== i,
  );
  for (const name of new Set(dupes)) {
    document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

export function createClient(): BrowserClient {
  if (singleton) return singleton;
  purgeLegacyHostOnlyDuplicates();
  singleton = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: readCookie,
        set: writeCookie,
        remove: deleteCookie,
      },
      auth: {
        // navigator.locks sérialise TOUTES les opérations auth entre
        // onglets ; un onglet zombie (spinner pendu, page figée) gardait
        // le verrou → chaque requête de données de chaque onglet pendait
        // indéfiniment (dashboard en skeletons infinis). Lock pass-through :
        // on préfère un rare double-refresh de token (géré par GoTrue)
        // à un deadlock global.
        lock: async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) =>
          await fn(),
      },
    },
  );
  return singleton;
}
