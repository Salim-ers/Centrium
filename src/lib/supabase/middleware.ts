import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { evaluateSubscriptionAccess, type SubscriptionAccessRow } from '@/lib/billing/access';
import { sharedAuthCookieDomain } from './cookie-domain';

// Paths accessibles sans session (devis public, login, invitations, pricing, landing).
// /signup reste public mais redirige côté serveur vers /devis pour les bookmarks
// externes (cf. src/app/(auth)/signup/page.tsx).
const PUBLIC_PATHS = ['/login', '/signup', '/register', '/forgot-password', '/pricing', '/tarifs', '/', '/devis', '/essai', '/security', '/plateforme', '/manifesto', '/engagements'];
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
function sessionOnly(
  _name: string,
  options: CookieOptions,
  currentHost?: string,
): CookieOptions {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options;
  // Domain=.centrium-platform.com en prod : la session survit aux rebonds
  // apex ↔ www (cause des "liens email qui ramènent au login").
  // currentHost = garde anti-domaine étranger (previews Vercel/staging) :
  // hôte hors du domaine dérivé de APP_URL → pas d'attribut Domain, sinon
  // le navigateur rejette le cookie et le login est cassé.
  const domain = sharedAuthCookieDomain(currentHost);
  return domain ? { ...rest, domain } : rest;
}

// On cache AUSSI la ligne d'abonnement (brute) pour éviter une requête DB
// par navigation. L'accès est RÉ-ÉVALUÉ à chaque fois avec l'heure courante
// (evaluateSubscriptionAccess) : l'expiration trial/période reste donc exacte
// même si le STATUT sous-jacent peut être périmé jusqu'au TTL (5 min) — les
// routes API (requireOrg) font de toute façon le gating live sur les mutations.
type ProfileCache = {
  uid: string;
  role: string | null;
  orgId: string | null;
  sub: SubscriptionAccessRow | null;
  ts: number;
};

function readProfileCookie(req: NextRequest, userId: string): ProfileCache | null {
  const raw = req.cookies.get(PROFILE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProfileCache;
    if (Date.now() - parsed.ts > PROFILE_COOKIE_TTL_SEC * 1000) return null;
    // CLÉ PAR UTILISATEUR : sans ça, cliquer un lien d'invitation dans un
    // navigateur où un AUTRE compte était connecté faisait hériter le
    // nouvel utilisateur du rôle/org caché du précédent pendant 5 min
    // (routing complètement faux : invité traité en admin, etc.).
    if (parsed.uid !== userId) return null;
    // Cookie d'AVANT l'ajout du champ `sub` (déploiement region/cache) : on
    // le traite comme un miss pour forcer un refetch + réécriture au nouveau
    // format. Sinon `sub=undefined` serait lu comme « pas d'abonnement » et
    // provoquerait un faux refus vers /billing le temps du TTL.
    if (!('sub' in parsed)) return null;
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

  // ---- Migration cookies host-only → Domain=.centrium-platform.com ----
  // Les navigateurs qui ont connu l'app AVANT la migration portent DEUX
  // cookies de même nom (ancien host-only + nouveau avec Domain). Next
  // collapse les doublons en prenant le PREMIER = le PÉRIMÉ → session
  // fantôme / données qui ne chargent jamais. On lit donc la DERNIÈRE
  // occurrence du header brut, et on purge la variante host-only sur la
  // réponse (Set-Cookie Max-Age=0 sans Domain — la variante domaine reste).
  const rawCookieHeader = request.headers.get('cookie') ?? '';
  const rawPairs = rawCookieHeader
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const eq = c.indexOf('=');
      return eq === -1 ? [c, ''] : [c.slice(0, eq), c.slice(eq + 1)];
    });
  const lastCookieValue = (name: string): string | undefined => {
    const matches = rawPairs.filter(([n]) => n === name);
    const last = matches.at(-1);
    return last ? decodeURIComponent(last[1]) : undefined;
  };
  const dupSbNames = new Set(
    rawPairs
      .map(([n]) => n)
      .filter((n, i, arr) => n.startsWith('sb-') && arr.indexOf(n) !== i),
  );
  for (const name of dupSbNames) {
    // Suppression de la variante host-only uniquement (pas de Domain).
    response.cookies.set({ name, value: '', maxAge: 0, path: '/' });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Dernière occurrence = cookie de domaine posé après migration.
          return lastCookieValue(name) ?? request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const opts = sessionOnly(name, options, request.nextUrl.hostname);
          request.cookies.set({ name, value, ...opts });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...opts });
        },
        remove(name: string, options: CookieOptions) {
          const opts = sessionOnly(name, options, request.nextUrl.hostname);
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
  const cached = readProfileCookie(request, user.id);
  let role: string | null;
  let orgId: string | null;
  // Ligne d'abonnement résolue (cache ou fetch) — sert au gating plus bas
  // sans re-requêter la DB à chaque navigation.
  let subRow: SubscriptionAccessRow | null = null;
  let subResolved = false;
  // Fail-open : si la lecture de l'abonnement échoue (hiccup réseau), on
  // n'a PAS le droit de bloquer l'utilisateur sur /billing ni de cacher ce
  // faux « no_subscription » pendant 5 min. false → on laisse passer ce nav.
  let subFetchOk = true;
  if (cached && cached.orgId) {
    role = cached.role;
    orgId = cached.orgId;
    subRow = cached.sub;
    subResolved = true;
  } else {
    // Cache miss (1×/5 min) : profil puis abonnement (l'org vient du profil),
    // puis on cache les deux. Coût amorti sur toute la fenêtre TTL.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle();
    role = (profile?.role as string | undefined) ?? null;
    orgId = (profile?.organization_id as string | undefined) ?? null;
    if (orgId) {
      const { data: sub, error: subErr } = await supabase
        .from('subscriptions')
        .select('status, trial_end, current_period_end, is_exempt_from_billing')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (subErr) {
        // Échec transitoire : ne rien cacher (retry au prochain nav) et
        // laisser passer ce nav (fail-open) au lieu de rediriger /billing.
        subFetchOk = false;
        subResolved = true;
      } else {
        subRow = (sub as SubscriptionAccessRow | null) ?? null;
        subResolved = true;
        writeProfileCookie(response, { uid: user.id, role, orgId, sub: subRow });
      }
    }
  }

  const isConsultant = role === 'consultant';
  const isSuperAdmin = role === 'super_admin';
  const isAdminRoute = pathname.startsWith('/admin');
  const hasOrg = !!orgId;

  // Fondateurs : comptes admin quotidiens listés dans FOUNDER_EMAILS —
  // autorisés sur /admin SANS le rôle exclusif super_admin (ils gardent
  // leur org et leur app). Routing seulement : la sécurité réelle est
  // dans le layout SSR /admin + les routes API (getSuperAdminContext).
  const founderEmails = (process.env.FOUNDER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isFounder =
    founderEmails.length > 0 &&
    !!user.email &&
    founderEmails.includes(user.email.toLowerCase());

  // Le super_admin (rôle dédié) n'a pas d'org rattachée et opère sur
  // /admin/*. Il n'est PAS redirigé vers /onboarding, et reste confiné
  // à la console.
  if (isSuperAdmin) {
    if (isAdminRoute || pathname.startsWith('/auth/')) return response;
    // Toute autre URL → home de la super-console (supervision des orgs).
    const url = request.nextUrl.clone();
    url.pathname = '/admin/organizations';
    return NextResponse.redirect(url);
  }
  if (isAdminRoute && !isSuperAdmin && !isFounder) {
    // Tentative d'accès /admin sans le rôle ni l'allowlist → 404 logique
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  if (isAdminRoute && isFounder) {
    // Fondateur sur la console : on laisse passer sans appliquer le
    // gating abonnement / onboarding plus bas (la console est cross-org).
    return response;
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
      // Abonnement déjà résolu (cookie cache ou fetch du cache-miss) — plus
      // de requête DB par navigation. Si pour une raison quelconque il ne
      // l'était pas (ex: cookie sans champ sub d'une ancienne version), on
      // refetch en filet.
      if (!subResolved) {
        const { data: sub, error: subErr } = await supabase
          .from('subscriptions')
          .select('status, trial_end, current_period_end, is_exempt_from_billing')
          .eq('organization_id', orgId!)
          .maybeSingle();
        if (subErr) subFetchOk = false;
        subRow = (sub as SubscriptionAccessRow | null) ?? null;
        subResolved = true;
      }

      // Matrice partagée avec requireOrg() (API) — cf. lib/billing/access.ts.
      // Ré-évaluée avec l'heure courante → expiration trial/période exacte.
      // FAIL-OPEN : si la lecture de l'abonnement a échoué (réseau), on
      // laisse passer — jamais bloquer une page sur une erreur transitoire
      // (les routes API restent gated par requireOrg côté serveur).
      const access = subFetchOk
        ? evaluateSubscriptionAccess(subRow)
        : ({ allowed: true } as const);
      if (!access.allowed) {
        const url = request.nextUrl.clone();
        url.pathname = '/billing';
        url.search = `?error=${encodeURIComponent(access.reason)}`;
        return NextResponse.redirect(url);
      }
    }
  }

  // Consultant tentant d'accéder à une route admin → renvoyer vers son portail
  // EXCEPTION /auth/* : un consultant fraîchement invité atterrit sur
  // /auth/set-password — le renvoyer vers le portail avant qu'il ait posé
  // son mot de passe le laissait définitivement sans mot de passe.
  if (isConsultant && !isPortal && !pathname.startsWith('/auth/')) {
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
