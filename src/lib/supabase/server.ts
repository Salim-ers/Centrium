import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

import { sharedAuthCookieDomain } from './cookie-domain';

/**
 * Lecture "dernière occurrence" depuis le header Cookie brut : pendant la
 * migration host-only → Domain=…, deux cookies de même nom coexistent et
 * l'API cookies() de Next prend le PREMIER (le périmé). La dernière
 * occurrence est le cookie de domaine, le plus frais.
 */
function lastCookieFromHeader(name: string): string | undefined {
  try {
    const raw = headers().get('cookie') ?? '';
    const matches = raw
      .split(';')
      .map((c) => c.trim())
      .filter((c) => c.startsWith(`${name}=`));
    const last = matches.at(-1);
    return last ? decodeURIComponent(last.slice(name.length + 1)) : undefined;
  } catch {
    return undefined;
  }
}

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
          return lastCookieFromHeader(name) ?? cookieStore.get(name)?.value;
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
