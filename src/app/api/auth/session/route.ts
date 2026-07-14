import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { freshAuthCookieOptions } from '@/lib/supabase/cookie-domain';

// =========================================================================
// POST /api/auth/session — établit la session côté SERVEUR à partir des
// tokens récupérés dans un fragment d'URL (#access_token=…).
// -------------------------------------------------------------------------
// POURQUOI : /auth/complete faisait supabase.auth.setSession() côté client,
// or supabase-js sérialise ses opérations auth via navigator.locks — avec
// plusieurs onglets Centrium ouverts, le verrou peut ne jamais être acquis
// et la promesse reste pendante ("Connexion en cours…" infini). Côté
// serveur : pas de verrou navigateur, et les cookies de session partent
// dans la réponse via l'adaptateur @supabase/ssr (même mécanique que
// exchangeCodeForSession dans /auth/callback).
//
// Sécurité : les tokens fournis SONT l'authentification — setSession les
// valide cryptographiquement auprès de GoTrue ; des tokens forgés/expirés
// → 401. Aucun autre input n'est accepté.
// =========================================================================

export const runtime = 'nodejs';

const schema = z.object({
  access_token: z.string().min(20).max(4096),
  refresh_token: z.string().min(10).max(1024),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.setSession(parsed.data);
  if (error) {
    return NextResponse.json(
      { error: 'invalid_tokens', message: error.message },
      { status: 401 },
    );
  }
  const res = NextResponse.json({ data: { ok: true } });
  // Session établie par lien email (fragment) : marque l'entrée comme
  // légitime pour le garde anti-restauration (cf. cookie-domain.ts).
  res.cookies.set(freshAuthCookieOptions(req.nextUrl.hostname));
  return res;
}

/**
 * GET — la session de l'appelant est-elle valide ? Vérification CÔTÉ
 * SERVEUR (cookies) : getUser() client passe par navigator.locks et peut
 * pendre indéfiniment avec plusieurs onglets ouverts (spinner infini sur
 * set-password). Ici : zéro verrou, réponse immédiate.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({ data: { authenticated: !!user } });
}
