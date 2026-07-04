import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { freshAuthCookieOptions } from '@/lib/supabase/cookie-domain';

// =========================================================================
// GET /auth/callback — endpoint unique d'établissement de session pour
// TOUS les liens email Supabase Auth (invite, magic_link, recovery,
// email_change, confirmation).
// -------------------------------------------------------------------------
// Formes supportées :
//   ?token_hash=…&type=…            flow stateless (nos templates) —
//                                    verifyOtp(), cross-device safe
//   ?code=…                          flow PKCE (@supabase/ssr)
//   ?it=<uuid>                       token d'invitation d'ORGANISATION,
//                                    injecté par invite.html via
//                                    {{ .Data.invitation_token }} — route
//                                    directe vers /invite/accept sans
//                                    dépendre de redirect_to
//   ?next=… / ?rt=…                  destination métier explicite
//
// RÈGLES DE DESTINATION (jamais la vitrine, jamais '/') :
//   1. next explicite (chemin relatif)             → next
//   2. it (invitation org)                          → /invite/accept?token=it
//   3. rt (redirectTo original) SEULEMENT si son    → inner next
//      ?next= interne est présent — un rt sans next
//      (fallback SiteURL de GoTrue) est IGNORÉ :
//      l'ancien fallback sur rt.pathname envoyait
//      les invités sur '/' (vitrine) → onboarding
//      fantôme.
//   4. défaut par type + état du compte :
//        recovery                    → /auth/reset-password
//        invite/signup/magiclink     → password déjà posé ? espace (rôle)
//                                      : /auth/first-password (welcome
//                                        selon rôle consultant/membre)
//        autre                       → /dashboard
//
// ERREURS verifyOtp / exchange (lien expiré, déjà utilisé, altéré) :
//   → la PAGE DÉDIÉE avec ?error=link_expired (elle affiche la carte
//     d'erreur + action de renvoi), pas un /login sec.
// =========================================================================

export const runtime = 'nodejs';

// Token d'invitation d'org : opaque URL-safe (64 hex aujourd'hui — on
// tolère uuid/base64url pour ne pas coupler au générateur SQL).
const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

function errorDestination(type: EmailOtpType | null): string {
  if (type === 'recovery') return '/auth/reset-password?error=link_expired';
  if (type === 'invite' || type === 'signup' || type === 'magiclink') {
    return '/auth/first-password?error=link_expired';
  }
  return '/login?error=otp_expired';
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  let next = url.searchParams.get('next') ?? '';

  // 2. Token d'invitation d'organisation — voie directe, insensible aux
  //    caprices de redirect_to (allow-list, encodage, réécriture email).
  if (!next) {
    const it = url.searchParams.get('it');
    if (it && INVITE_TOKEN_RE.test(it)) next = `/invite/accept?token=${it}`;
  }

  // 3. rt = redirectTo original ({{ .RedirectTo }} des templates). On n'en
  //    extrait QUE le ?next= interne. Sans next interne → ignoré (c'est le
  //    fallback SiteURL de GoTrue, il pointe sur la vitrine).
  if (!next) {
    const rt = url.searchParams.get('rt');
    if (rt) {
      try {
        const innerNext = new URL(rt).searchParams.get('next');
        if (innerNext) next = innerNext;
      } catch {
        /* rt illisible → défauts par type */
      }
    }
  }

  // Sécurité : chemins relatifs uniquement (anti open-redirect), et jamais
  // la racine vitrine.
  const explicitNext = next.startsWith('/') && next !== '/' ? next : '';

  const supabase = createClient();

  // Défaut post-session selon le type de lien et l'état du compte.
  // Appelé APRÈS l'établissement de la session (on lit le profil).
  async function defaultDestination(): Promise<string> {
    if (type === 'recovery') return '/auth/reset-password';
    if (type === 'invite' || type === 'signup' || type === 'magiclink') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return '/auth/first-password?welcome=invited';
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, password_set')
        .eq('id', user.id)
        .maybeSingle();
      const isConsultant = profile?.role === 'consultant';
      if (profile?.password_set) {
        return isConsultant ? '/portal/dashboard' : '/dashboard';
      }
      return isConsultant
        ? '/auth/first-password?welcome=portal'
        : '/auth/first-password?welcome=invited';
    }
    return '/dashboard';
  }

  // Branch 1 — token_hash / OTP flow. Cross-device safe.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return NextResponse.redirect(new URL(errorDestination(type), url.origin));
    }
    const dest = explicitNext || (await defaultDestination());
    const res = NextResponse.redirect(new URL(dest, url.origin));
    // Session créée par lien email : marque l'entrée comme légitime pour
    // le garde anti-restauration (sinon logout automatique ~1 s après).
    res.cookies.set(freshAuthCookieOptions());
    return res;
  }

  // Branch 2 — PKCE (?code=…). Requiert le code_verifier cookie.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(errorDestination(type), url.origin));
    }
    const dest = explicitNext || (await defaultDestination());
    const res = NextResponse.redirect(new URL(dest, url.origin));
    res.cookies.set(freshAuthCookieOptions());
    return res;
  }

  // Ni code ni token_hash : très probablement un lien {{ .ConfirmationURL }}
  // dont la session est dans le FRAGMENT (#access_token=…) — invisible ici
  // (les fragments n'atteignent jamais le serveur) mais PRÉSERVÉ par le
  // navigateur à travers cette redirection 3xx. /auth/complete (page client)
  // le consomme et termine le parcours. Fini le dead-end /login.
  const completeNext = explicitNext
    ? `?next=${encodeURIComponent(explicitNext)}`
    : '';
  return NextResponse.redirect(new URL(`/auth/complete${completeNext}`, url.origin));
}
