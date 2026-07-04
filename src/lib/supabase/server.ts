import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { sharedAuthCookieDomain } from './cookie-domain';

/**
 * Strip maxAge / expires pour rendre TOUS les cookies session-only,
 * y compris les cookies d'auth Supabase.
 *
 * Effet : à la fermeture du navigateur (tous onglets fermés), les
 * cookies sont purgés et l'utilisateur doit se reconnecter au prochain
 * démarrage. F5 ne casse pas la session (le processus navigateur reste
 * en vie).
 *
 * Ajoute aussi Domain=.centrium-platform.com en prod pour que la session
 * survive aux rebonds apex ↔ www (cf. lib/supabase/cookie-domain.ts).
 */
function sessionOnly(_name: string, options: CookieOptions): CookieOptions {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options;
  const domain = sharedAuthCookieDomain();
  return domain ? { ...rest, domain } : rest;
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
