import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =========================================================================
// POST /api/auth/logout
// -------------------------------------------------------------------------
// Déconnexion serveur : nettoie tous les cookies Supabase (httpOnly inclus)
// + notre cookie `qc_profile` cache du middleware, puis redirige vers /login.
//
// Nécessaire car `supabase.auth.signOut()` côté client ne peut pas toujours
// supprimer les cookies httpOnly de la session SSR.
// =========================================================================

export const runtime = 'nodejs';

async function handle(req: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const res = NextResponse.redirect(new URL('/login', req.url), { status: 303 });
  // Nettoie notre cache routing middleware
  res.cookies.set({ name: 'qc_profile', value: '', path: '/', maxAge: 0 });
  return res;
}

export const POST = handle;
export const GET = handle;
