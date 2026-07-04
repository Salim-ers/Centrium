import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { freshAuthCookieOptions } from '@/lib/supabase/cookie-domain';

// =========================================================================
// GET /auth/callback?code=...&next=...          (PKCE flow — invite native)
// GET /auth/callback?token_hash=...&type=...&next=...   (token_hash / OTP)
// -------------------------------------------------------------------------
// Endpoint unique d'établissement de session pour TOUS les liens email
// Supabase Auth (invite, magic_link, recovery, email_change, confirmation).
//
// SUPPORTE 2 flows en parallèle pour être robuste cross-device :
//
//   1. PKCE (?code=…) — flow standard depuis @supabase/ssr. Nécessite le
//      code_verifier stocké côté client dans un cookie session-only. CASSE
//      quand l'user demande le reset sur son desktop mais clique le lien
//      sur son téléphone : le verifier n'existe pas dans l'autre browser.
//
//   2. token_hash (?token_hash=…&type=…) — flow stateless. Supabase génère
//      un TokenHash côté serveur et l'envoie dans le lien email. On appelle
//      verifyOtp() qui vérifie le hash sans dépendre d'aucun cookie
//      pré-existant. Cross-device OK.
//
// Nos templates recovery/magic_link/email_change utilisent explicitement le
// token_hash pattern (voir supabase/templates/*.html) pour éviter la casse
// cross-device. Le PKCE branch reste pour l'invite flow qui a besoin de
// préserver le org_invite_token via `redirect_to`.
// =========================================================================

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  let next = url.searchParams.get('next') ?? '';

  // `rt` = le redirectTo ORIGINAL de l'invitation, injecté par les templates
  // token_hash ({{ .RedirectTo }}). Il pointe généralement vers ce même
  // callback avec son propre ?next=… (ex: /invite/accept?token=X) — on en
  // extrait le next pour préserver la destination métier. Même origine
  // exigée (anti open-redirect).
  if (!next) {
    const rt = url.searchParams.get('rt');
    if (rt) {
      try {
        const rtUrl = new URL(rt);
        const innerNext = rtUrl.searchParams.get('next');
        if (innerNext) next = innerNext;
        else if (rtUrl.pathname !== '/auth/callback') {
          next = `${rtUrl.pathname}${rtUrl.search}`;
        }
      } catch {
        /* rt illisible → défauts par type ci-dessous */
      }
    }
  }
  // Défaut par type de lien : un invite/recovery sans next explicite doit
  // atterrir sur la création de mot de passe, jamais sur le dashboard.
  if (!next) {
    next =
      type === 'recovery'
        ? '/auth/set-password?welcome=recovery'
        : type === 'invite' || type === 'signup' || type === 'magiclink'
          ? '/auth/set-password?welcome=invited'
          : '/dashboard';
  }

  // Sécurité : ne suit que les chemins relatifs (pas d'open redirect).
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  const supabase = createClient();

  // Branch 1 — token_hash / OTP flow. Cross-device safe.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    const res = NextResponse.redirect(new URL(safeNext, url.origin));
    // Session créée par lien email : marque l'entrée comme légitime pour
    // le garde anti-restauration (sinon logout automatique ~1 s après).
    res.cookies.set(freshAuthCookieOptions());
    return res;
  }

  // Branch 2 — PKCE (?code=…). Requiert le code_verifier cookie.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    const res = NextResponse.redirect(new URL(safeNext, url.origin));
    res.cookies.set(freshAuthCookieOptions());
    return res;
  }

  // Ni code ni token_hash : très probablement un lien {{ .ConfirmationURL }}
  // dont la session est dans le FRAGMENT (#access_token=…) — invisible ici
  // (les fragments n'atteignent jamais le serveur) mais PRÉSERVÉ par le
  // navigateur à travers cette redirection 3xx. /auth/complete (page client)
  // le consomme et termine le parcours. Fini le dead-end /login.
  return NextResponse.redirect(
    new URL(`/auth/complete?next=${encodeURIComponent(safeNext)}`, url.origin),
  );
}
