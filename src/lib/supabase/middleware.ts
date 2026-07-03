import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { evaluateSubscriptionAccess } from '@/lib/billing/access';

// Paths accessibles sans session (devis public, login, invitations, pricing, landing).
// /signup reste public mais redirige côté serveur vers /devis pour les bookmarks
// externes (cf. src/app/(auth)/signup/page.tsx).
const PUBLIC_PATHS = ['/login', '/signup', '/register', '/forgot-password', '/pricing', '/', '/devis', '/security', '/plateforme', '/manifesto', '/engagements'];
const PUBLIC_PREFIXES = ['/invite/', '/auth/', '/legal/']; // /invite/accept?token=…, /auth/callback?code=…, pages légales

// Cookie cache pour role + organization_id : évite une query profile à chaque navigation.
// Le RLS applique toujours la vraie sécurité côté DB, le cookie ne guide que le routing.
const PROFILE_COOKIE = 'qc_profile';
const PROFILE_COOKIE_TTL_SEC = 300; // 5 min

/**
 * Strip maxAge / expires pour rendre TOUS les cookies session-only,
 * y compris les cookies d'auth Supabase (`sb-*`).
 *
 * Comportement attendu :
 *   - L'utilisateur ferme son navigateur (tous onglets fermés) → cookies
 *     purgés → re-login obligatoire au prochain démarrage.
 *   - F5 / changement d'onglet / fermeture d'un onglet seul → la session
 *     navigateur est toujours vivante → cookies préservés.
 *
 * Utile pour les machines partagées et pour respecter une attente
 * "je ferme, je suis déco" sans dépendre d'un bouton logout.
 */
function sessionOnly(_name: string, options: CookieOptions): CookieOptions {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options;
  return rest;
}

type ProfileCache = { role: string | null; orgId: string | null; ts: number };

function readProfileCookie(req: NextRequest): ProfileCache | null {
  const raw = req.cookies.get(PROFILE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProfileCache;
    if (Date.now() - parsed.ts > PROFILE_COOKIE_TTL_SEC * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProfileCookie(res: NextResponse, data: Omit<ProfileCache, 'ts'>) {
  // Pas de maxAge → cookie de session, meurt à la fermeture du navigateur.
  // Le timestamp interne (ts) sert quand même de TTL "soft" via la lecture.
  res.cookies.set({
    name: PROFILE_COOKIE,
    value: JSON.stringify({ ...data, ts: Date.now() }),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

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
          const opts = sessionOnly(name, options);
          request.cookies.set({ name, value, ...opts });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...opts });
        },
        remove(name: string, options: CookieOptions) {
          const opts = sessionOnly(name, options);
          request.cookies.set({ name, value: '', ...opts });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...opts });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isPortal = pathname.startsWith('/portal');
  const isOnboarding = pathname === '/onboarding';

  // Utilisateur non connecté : tout sauf les paths publics → login
  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Utilisateur connecté : on doit connaître son rôle + org
  // Lecture depuis le cookie cache (0 DB call). On ne cache QUE si orgId est
  // renseigné, sinon on boucle /dashboard → /onboarding le temps du TTL.
  const cached = readProfileCookie(request);
  let role: string | null;
  let orgId: string | null;
  if (cached && cached.orgId) {
    role = cached.role;
    orgId = cached.orgId;
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle();
    role = (profile?.role as string | undefined) ?? null;
    orgId = (profile?.organization_id as string | undefined) ?? null;
    if (orgId) writeProfileCookie(response, { role, orgId });
  }

  const isConsultant = role === 'consultant';
  const isSuperAdmin = role === 'super_admin';
  const isAdminRoute = pathname.startsWith('/admin');
  const hasOrg = !!orgId;

  // Le super_admin n'a pas d'org rattachée et opère sur /admin/*. Il
  // n'est PAS redirigé vers /onboarding, et c'est le seul rôle autorisé
  // sur les routes /admin.
  if (isSuperAdmin) {
    if (isAdminRoute || pathname.startsWith('/auth/')) return response;
    // Toute autre URL → on l'envoie sur sa home admin.
    const url = request.nextUrl.clone();
    url.pathname = '/admin/clients';
    return NextResponse.redirect(url);
  }
  if (isAdminRoute && !isSuperAdmin) {
    // Tentative d'accès /admin sans le rôle → 404 logique
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Pas d'org active (vient de signer up) → onboarding obligatoire
  //   Exceptions : l'onboarding lui-même, l'acceptation d'invitation,
  //   et le callback OAuth/PKCE (qui pose les cookies puis redirige).
  if (
    !hasOrg &&
    !isOnboarding &&
    !pathname.startsWith('/invite/') &&
    !pathname.startsWith('/auth/')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  // User avec org active qui arrive sur une page publique → home appropriée
  if (hasOrg && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = isConsultant ? '/portal/dashboard' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // -----------------------------------------------------------------------
  // Access-control abonnement — source unique de vérité pour "cet org
  // peut-il utiliser l'app maintenant ?".
  //
  // MATRICE (source : Stripe subscription status + notre trial_end)
  //
  //   is_exempt_from_billing = true         → ACCESS
  //   status = 'active'                     → ACCESS
  //   status = 'trialing' AND trial_end>now → ACCESS
  //   status = 'trialing' AND trial_end<now → DENY (trial_expired)
  //   status = 'canceled' AND period_end>now → ACCESS (grace jusqu'à la fin
  //                                                    de la période payée)
  //   status = 'canceled' AND period_end<now → DENY (subscription_expired)
  //   status = 'past_due'                   → DENY (payment_failed)
  //   status = 'unpaid'                     → DENY (payment_failed)
  //   status = 'incomplete'                 → DENY (checkout_incomplete)
  //   status = 'incomplete_expired'         → DENY (checkout_incomplete)
  //   status = 'paused'                     → DENY (paused)
  //   no subscription row                   → DENY (no_subscription)
  //
  // Whitelist (accès garanti même en denied) — /billing (pour resubscribe),
  // /settings (mes données, logout, profil), /auth/*, /logout.
  //
  // Consultants (role='consultant') : bypass total — ils ne paient pas le
  // plan de l'org.
  // -----------------------------------------------------------------------
  if (hasOrg && !isConsultant) {
    const billingAllowed =
      pathname.startsWith('/billing') ||
      pathname.startsWith('/settings') ||
      pathname === '/logout';
    if (!billingAllowed) {
      // 1 row DB par navigation admin — négligeable.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_end, current_period_end, is_exempt_from_billing')
        .eq('organization_id', orgId!)
        .maybeSingle();

      // Matrice partagée avec requireOrg() (API) — cf. lib/billing/access.ts
      const access = evaluateSubscriptionAccess(sub ?? null);
      if (!access.allowed) {
        const url = request.nextUrl.clone();
        url.pathname = '/billing';
        url.search = `?error=${encodeURIComponent(access.reason)}`;
        return NextResponse.redirect(url);
      }
    }
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

  // -----------------------------------------------------------------------
  // MFA enforcement pour admins quand org.mfa_required_for_admin = true.
  //
  // Logique :
  //   - Si user.role === 'admin' AND org.mfa_required_for_admin = true
  //     AND la session n'est PAS aal2 (= MFA validé),
  //     → redirect vers /auth/mfa-challenge (si enrolled) ou /auth/mfa-enroll (sinon)
  //
  // Routes whitelistées (sinon boucle infinie) :
  //   - tout /auth/* (déjà dans PUBLIC_PREFIXES, donc isPublic true plus haut)
  //   - /api/auth/* (les routes serveur qui gèrent l'enrôlement)
  //
  // Super_admin : exempté (retourné plus haut).
  // -----------------------------------------------------------------------
  if (role === 'admin' && hasOrg && !pathname.startsWith('/api/auth/') && !isPublic) {
    const enforced = await enforceMfaForAdmin(supabase, orgId!, request);
    if (enforced) return enforced;
  }

  return response;
}

/**
 * Vérifie si l'admin doit passer un challenge MFA avant de continuer.
 *
 * Renvoie une `NextResponse.redirect` si la session ne respecte pas la
 * politique MFA de l'org, sinon `null` pour laisser passer.
 *
 * 3 API calls dans le pire cas (settings + assurance level + listFactors)
 * — uniquement pour les admins (= minorité des users), uniquement sur
 * les vraies pages (le matcher Next.js exclut déjà assets/static).
 */
async function enforceMfaForAdmin(
  supabase: ReturnType<typeof createServerClient>,
  orgId: string,
  request: NextRequest
): Promise<NextResponse | null> {
  // 1) Politique de l'org : MFA obligatoire pour admins ?
  const { data: settings } = await supabase
    .from('org_security_settings')
    .select('mfa_required_for_admin')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!settings?.mfa_required_for_admin) return null;

  // 2) Niveau d'assurance de la session courante
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') return null; // déjà MFA-validé

  // 3) L'admin a-t-il au moins un facteur enrôlé ?
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedFactors = factors?.all?.filter((f) => f.status === 'verified') ?? [];

  const url = request.nextUrl.clone();
  url.pathname = verifiedFactors.length === 0 ? '/auth/mfa-enroll' : '/auth/mfa-challenge';
  // Ne pas inclure request.nextUrl.search : on évite de fuir des query params
  // sensibles à travers le flux MFA. Le user perd ses filtres d'URL, OK pour la
  // session courante — pas un sacrifice fonctionnel.
  url.search = '';
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}
