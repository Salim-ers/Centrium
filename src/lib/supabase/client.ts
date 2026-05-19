import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

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
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${encodeURIComponent(name)}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : undefined;
}

function writeCookie(name: string, value: string, options: CookieOptions) {
  if (typeof document === 'undefined') return;
  const opts = sessionOnly(name, options);
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (opts.path) cookie += `; Path=${opts.path}`;
  if (opts.domain) cookie += `; Domain=${opts.domain}`;
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.secure) cookie += `; Secure`;
  // Pas de Max-Age / Expires : le cookie meurt avec la session navigateur.
  document.cookie = cookie;
}

function deleteCookie(name: string, options: CookieOptions) {
  if (typeof document === 'undefined') return;
  // Pour supprimer : Max-Age=0 (forcé même en session-only).
  let cookie = `${encodeURIComponent(name)}=; Max-Age=0`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  document.cookie = cookie;
}

export function createClient(): BrowserClient {
  if (singleton) return singleton;
  singleton = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: readCookie,
        set: writeCookie,
        remove: deleteCookie,
      },
    },
  );
  return singleton;
}
