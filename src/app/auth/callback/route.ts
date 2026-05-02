import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// =========================================================================
// GET /auth/callback?code=...&next=...
// -------------------------------------------------------------------------
// Endpoint d'échange code → session cookies pour le PKCE flow Supabase.
// Quand le user clique sur un lien d'email Supabase (invite, magic link,
// password recovery, email change), Supabase redirige ici avec un code
// éphémère. On l'échange pour des cookies posés sur NOTRE domaine, puis
// on redirige vers le `next` paramètre (par défaut /dashboard).
//
// Sans cet endpoint, certaines configurations laissent les cookies sur
// le domaine Supabase, l'utilisateur arrive non-authentifié sur l'app
// et finit par recréer une organisation au lieu de rejoindre la sienne.
// =========================================================================

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  // Sécurité : ne suit que les chemins relatifs (pas d'open redirect).
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  if (!code) {
    // Pas de code → on redirige avec un flag erreur, /login pourra l'afficher.
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
