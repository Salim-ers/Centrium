import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// =========================================================================
// Helper partagé d'envoi d'invitation Supabase Auth.
// -------------------------------------------------------------------------
// Pourquoi : 4+ routes envoient des invitations (consultants/create,
// consultants/[id]/portal-access, invitations, admin/organizations).
// Chacune ré-implémentait inline la cascade inviteUserByEmail → fallback.
// Bug récurrent : un seul SMTP hiccup (rate-limit Supabase built-in 4/h,
// bounce, redirect non whitelisté) faisait remonter "Error sending invite
// email" à l'UI et rollbackait silencieusement les inserts en amont.
//
// SÉCURITÉ — points clés :
//   1. On NE déclenche JAMAIS generateLink magiclink sur un user qui
//      pourrait appartenir à une autre org. La détection est faite via
//      pré-check listUsers déterministe AVANT tout appel auth ; si l'email
//      existe déjà → already_registered=true, le helper retourne SANS
//      muter user_metadata ni envoyer d'email. Le caller décide (en
//      général : 409 refuse).
//   2. Le fallback generateLink({type:'invite'}) ne tourne QUE si l'email
//      n'est pas pré-existant — il crée l'user + retourne l'action_link
//      sans envoyer (utilisable pour copie clipboard).
//   3. Chaque appel admin est try/catché — un throw réseau n'interrompt
//      pas la cascade en laissant des inserts orphelins en amont.
// =========================================================================

export type InviteResult = {
  /** L'utilisateur auth créé (ou retrouvé). null = échec total. */
  user_id: string | null;
  /** A-t-on appelé inviteUserByEmail sans erreur — note : Supabase queue
   *  l'email de façon fire-and-forget, donc true = "queued sans error API",
   *  PAS "delivered". Une defaillance asynchrone SMTP n'est visible que dans
   *  les Auth logs Supabase. */
  email_sent: boolean;
  /** Code d'erreur coarse pour l'UI (jamais le message Supabase brut). */
  email_error_code: EmailErrorCode | null;
  /** ⚠️ Message d'erreur Supabase brut — RÉSERVÉ aux logs serveur.
   *  NE JAMAIS inclure dans la réponse HTTP : leak des détails infra
   *  + risque XSS / phishing si le message contient des URLs. */
  email_error_raw: string | null;
  /** Lien d'invitation utilisable manuellement (copier-coller) si email_sent=false. */
  invite_url: string | null;
  /** True si l'email avait DÉJÀ un compte auth (cas refuse cross-org). */
  already_registered: boolean;
};

export type EmailErrorCode =
  | 'rate_limited'
  | 'smtp_failed'
  | 'recipient_invalid'
  | 'redirect_not_allowed'
  | 'auth_failed'
  | 'unknown';

export type SendInviteOptions = {
  email: string;
  /** URL absolue où Supabase redirige après vérification email. */
  redirectTo: string;
  /** Metadata stocké sur l'user (user_metadata). Apparaît dans le JWT. */
  data?: Record<string, unknown>;
  /** Admin client réutilisable. Sinon on en crée un. */
  admin?: SupabaseClient;
  /** Reason pour audit log si on crée le client. */
  reason?: Parameters<typeof createAdminClient>[0];
};

const ALREADY_REGISTERED_REGEX =
  /already (been )?registered|already exists|user already|email.*already/i;

/** Classifie un message d'erreur Supabase brut en code coarse pour l'UI.
 *  Les patterns matchent les wordings RÉELS observés sur Supabase GoTrue v2 :
 *  - "Error sending invite email" / "Error sending confirmation mail" /
 *    "Error sending magic link email" / "Error sending recovery email"
 *    → c'est l'erreur générique SMTP, le cas #1 pour lequel ce helper existe
 *  - "Email rate limit exceeded" → built-in SMTP throttle (4/h)
 *  - "For security purposes, you can only request this after X seconds" → rate
 */
function classifyError(msg: string | undefined): EmailErrorCode {
  if (!msg) return 'unknown';
  if (/rate.?limit|too many|429|email .*(rate|limit)|for security purposes/i.test(msg))
    return 'rate_limited';
  if (
    /smtp|email.*service|provider|error sending .*(invite|confirmation|magic|recovery|signup).*(email|mail)/i.test(
      msg,
    )
  )
    return 'smtp_failed';
  if (/invalid.*email|bounce|recipient|undeliverable/i.test(msg))
    return 'recipient_invalid';
  if (/redirect.*not.*allowed|invalid.*redirect|not.*allow.?listed|redirect.*url.*invalid/i.test(msg))
    return 'redirect_not_allowed';
  return 'auth_failed';
}

/**
 * Pré-check déterministe : l'email est-il déjà connu dans auth.users ?
 * Paginate listUsers (sans filtre natif disponible) jusqu'à matcher ou
 * épuiser. À petite échelle (< 5k auth users) coût négligeable.
 *
 * CRITIQUE pour la sécurité : on doit DISTINGUER "absent" de "lookup
 * failed". Si listUsers échoue (rate-limit Supabase admin API, réseau),
 * traiter ça comme "absent" reviendrait à passer à inviteUserByEmail
 * puis generateLink — qui peut alors muter le user_metadata d'un user
 * existant dans une autre org (cross-org takeover).
 *
 * Retourne un tagged union pour forcer le caller à gérer le 3e cas.
 */
type LookupResult =
  | { status: 'found'; userId: string }
  | { status: 'absent' }
  | { status: 'error'; message: string };

async function findExistingUserId(
  admin: SupabaseClient,
  email: string,
): Promise<LookupResult> {
  const emailLower = email.toLowerCase();
  const PER_PAGE = 1000;
  let page = 1;
  // Hard cap : 50 pages × 1000 = 50k users max.
  for (let i = 0; i < 50; i += 1) {
    try {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (error) {
        return { status: 'error', message: error.message };
      }
      if (!data?.users?.length) return { status: 'absent' };
      const found = data.users.find((u) => u.email?.toLowerCase() === emailLower);
      if (found) return { status: 'found', userId: found.id };
      if (data.users.length < PER_PAGE) return { status: 'absent' }; // dernière page
      page += 1;
    } catch (e) {
      const message = (e as Error).message ?? 'listUsers_threw';
      logger.error('[sendPortalInvite] findExistingUserId threw', { message });
      return { status: 'error', message };
    }
  }
  // Atteindre la limite des 50 pages = on n'a pas pu vérifier — fail safe.
  return { status: 'error', message: 'listUsers_page_cap_reached' };
}

export async function sendPortalInvite(
  opts: SendInviteOptions,
): Promise<InviteResult> {
  const admin = opts.admin ?? createAdminClient(opts.reason ?? 'invitation');
  const emailLower = opts.email.toLowerCase();

  // === 0. Pré-check déterministe : email déjà connu dans auth.users ? ===
  // CRITIQUE pour la sécurité cross-org : on ne doit JAMAIS appeler
  // generateLink ni inviteUserByEmail sur un email qui appartient
  // potentiellement à un user d'une autre org — ça muterait son
  // user_metadata et lui enverrait un lien d'accès vers NOTRE org.
  //
  // 3 issues du lookup :
  //   - found    → on retourne already_registered=true sans side-effect
  //   - absent   → on peut continuer la cascade safely
  //   - error    → on REFUSE de continuer (fail-safe) — un faux négatif
  //                ouvrirait le vecteur cross-org takeover
  const lookup = await findExistingUserId(admin, emailLower);
  if (lookup.status === 'found') {
    return {
      user_id: lookup.userId,
      email_sent: false,
      email_error_code: null,
      email_error_raw: null,
      invite_url: null,
      already_registered: true,
    };
  }
  if (lookup.status === 'error') {
    logger.error('[sendPortalInvite] pre-check failed, refusing to continue', {
      emailDomain: emailLower.split('@')[1] ?? 'unknown',
      msg: lookup.message,
    });
    return {
      user_id: null,
      email_sent: false,
      email_error_code: 'auth_failed',
      email_error_raw: `pre_check_failed: ${lookup.message}`,
      invite_url: null,
      already_registered: false,
    };
  }

  // === 1. Try inviteUserByEmail — happy path ===
  let inviteErr: { message: string; status?: number } | null = null;
  let inviteUserId: string | null = null;
  try {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(emailLower, {
      redirectTo: opts.redirectTo,
      data: opts.data,
    });
    if (error) {
      inviteErr = { message: error.message, status: error.status };
    } else if (data?.user) {
      inviteUserId = data.user.id;
    }
  } catch (e) {
    inviteErr = { message: (e as Error).message ?? 'network_error' };
  }

  if (!inviteErr && inviteUserId) {
    return {
      user_id: inviteUserId,
      email_sent: true,
      email_error_code: null,
      email_error_raw: null,
      invite_url: null,
      already_registered: false,
    };
  }

  // Race condition : entre notre pré-check et l'inviteUserByEmail, un autre
  // process peut avoir créé l'user. On respecte la même politique : refuse.
  if (inviteErr && ALREADY_REGISTERED_REGEX.test(inviteErr.message)) {
    logger.error('[sendPortalInvite] race detected: user created between pre-check and invite', {
      emailDomain: emailLower.split('@')[1] ?? 'unknown',
    });
    return {
      user_id: null,
      email_sent: false,
      email_error_code: null,
      email_error_raw: null,
      invite_url: null,
      already_registered: true,
    };
  }

  // === 2. Other error (SMTP rate-limit, redirect non whitelisté, bounce,
  //         network) → generateLink invite pour récupérer le lien utilisable
  //         manuellement. Crée l'user (qui n'existe pas — pré-check fait). ===
  logger.error('[sendPortalInvite] invite failed, falling back to generateLink', {
    emailDomain: emailLower.split('@')[1] ?? 'unknown',
    status: inviteErr?.status,
    msg: inviteErr?.message,
  });

  let linkErr: { message: string } | null = null;
  let linkUserId: string | null = null;
  let actionLink: string | null = null;
  try {
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: emailLower,
      options: { redirectTo: opts.redirectTo, data: opts.data },
    });
    if (error) {
      linkErr = { message: error.message };
    } else if (linkData?.user) {
      linkUserId = linkData.user.id;
      actionLink = linkData.properties?.action_link ?? null;
    }
  } catch (e) {
    linkErr = { message: (e as Error).message ?? 'network_error' };
  }

  if (linkErr || !linkUserId) {
    return {
      user_id: null,
      email_sent: false,
      email_error_code: classifyError(linkErr?.message ?? inviteErr?.message),
      email_error_raw: linkErr?.message ?? inviteErr?.message ?? 'auth_failed',
      invite_url: null,
      already_registered: false,
    };
  }

  return {
    user_id: linkUserId,
    email_sent: false,
    email_error_code: classifyError(inviteErr?.message),
    email_error_raw: inviteErr?.message ?? 'email_send_failed',
    invite_url: actionLink,
    already_registered: false,
  };
}

// =========================================================================
// Helper utilitaire : construit l'URL `redirectTo` pour les emails
// Supabase Auth. En prod, on FORCE le domaine canonique pour éviter de
// pointer vers une URL Vercel *.vercel.app non whitelistée OU vers un
// host attaquant via header Host injection.
// =========================================================================

const PROD_APP_URL = 'https://centrium-platform.com';

function isLocalhost(host: string): boolean {
  // Couvre : localhost, IPv4 loopback, IPv6 loopback (bracket form parsé par
  // l'URL constructor + bare form vu sur certains setups WSL2/Docker IPv6-first)
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)(:\d+)?$/i.test(host);
}

export function buildRedirectTo(
  reqUrl: URL | string,
  nextPath: string,
): string {
  const url = typeof reqUrl === 'string' ? new URL(reqUrl) : reqUrl;
  const isProd = process.env.NODE_ENV === 'production';
  // 1. Var d'env explicite → priorité absolue
  let appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  // 2. En prod, fallback au domaine canonique (NEVER req.host : header Host
  //    est attaquant-contrôlable et Vercel preview yields *.vercel.app non
  //    whitelisté côté Supabase Auth)
  if (!appUrl && isProd) {
    appUrl = PROD_APP_URL;
    logger.warn(
      '[sendInvite] NEXT_PUBLIC_APP_URL manquant en prod — fallback sur ' +
        PROD_APP_URL +
        '. Configure-la dans Vercel pour éviter ce log.',
    );
  }
  // 3. En dev local seulement, fallback au host de la requête SI ET SEULEMENT
  //    SI on est sur localhost (sinon : refuse, c'est suspect).
  if (!appUrl) {
    if (isLocalhost(url.host)) {
      appUrl = `${url.protocol}//${url.host}`;
    } else {
      throw new Error(
        '[sendInvite] NEXT_PUBLIC_APP_URL must be set when not running on localhost. ' +
          'Refusing to use Host header as fallback (attacker-controllable).',
      );
    }
  }
  return `${appUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
