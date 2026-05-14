import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let singleton: BrowserClient | null = null;

/**
 * Strip maxAge / expires pour les cookies internes uniquement.
 *
 * ⚠️ EXCEPTION : on PRÉSERVE l'expiration des cookies `sb-*` (auth
 * Supabase). Sans ça, le refresh token devenait session-only et
 * expirait dès la moindre interruption d'onglet — F5 tardif → data
 * vide → l'utilisateur devait se reconnecter pour récupérer son état.
 */
function sessionOnly(name: string, options: CookieOptions): CookieOptions {
  if (name.startsWith('sb-')) {
    return options;
  }
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
  // Préserve l'expiration native pour les cookies d'auth Supabase
  // (sinon le refresh token devient session-only et casse le F5).
  if (opts.maxAge != null) cookie += `; Max-Age=${opts.maxAge}`;
  if (opts.expires) {
    const exp = opts.expires instanceof Date ? opts.expires : new Date(opts.expires);
    cookie += `; Expires=${exp.toUTCString()}`;
  }
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
