import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supprime maxAge / expires des options de cookie pour en faire des
 * "session cookies" : le navigateur les détruit à la fermeture. C'est la
 * sécurité demandée pour éviter qu'un autre utilisateur tombe sur la
 * session précédente après une fermeture/réouverture du navigateur.
 */
function sessionOnly(options: CookieOptions): CookieOptions {
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
            cookieStore.set({ name, value, ...sessionOnly(options) });
          } catch {
            // Server Component — setting cookies impossible, ignoré
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...sessionOnly(options) });
          } catch {
            // idem
          }
        },
      },
    }
  );
}
