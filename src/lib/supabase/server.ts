import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Strip maxAge / expires pour les cookies internes uniquement.
 *
 * ⚠️ EXCEPTION : on PRÉSERVE l'expiration des cookies `sb-*-auth-token`
 * (refresh token Supabase). Sinon, le serveur les réécrit en session-only
 * à chaque round-trip et l'utilisateur perd sa session dès la moindre
 * interruption d'onglet — F5 vide tout, comme on l'a vu en prod.
 */
function sessionOnly(name: string, options: CookieOptions): CookieOptions {
  if (name.startsWith('sb-')) return options;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options;
  return rest;
}

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...sessionOnly(name, options) });
          } catch {
            // Server Component — setting cookies impossible, ignoré
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...sessionOnly(name, options) });
          } catch {
            // idem
          }
        },
      },
    }
  );
}
