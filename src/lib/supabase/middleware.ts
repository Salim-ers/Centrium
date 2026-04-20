import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/'];

/**
 * Routing basé sur le rôle du user.
 *
 *   consultant              → /portal/*    uniquement
 *   admin / BM / recruteur  → routes admin (/dashboard, /consultants, …)
 *   finance / viewer        → routes admin
 *
 *   Redirection login par défaut selon le rôle.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);
  const isPortal = pathname.startsWith('/portal');

  // Utilisateur non connecté : tout sauf les paths publics → login
  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Utilisateur connecté : on doit connaître son rôle
  // (evite de requêter à chaque tick ? pour l'instant on requête — c'est léger)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role as string | undefined) ?? null;
  const isConsultant = role === 'consultant';

  // Redirection au login
  if (pathname === '/login' || pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = isConsultant ? '/portal/dashboard' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Consultant tentant d'accéder à une route admin → renvoyer vers son portail
  if (isConsultant && !isPortal) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal/dashboard';
    return NextResponse.redirect(url);
  }

  // Non-consultant tentant d'accéder à /portal → renvoyer vers le dashboard admin
  if (!isConsultant && isPortal) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
