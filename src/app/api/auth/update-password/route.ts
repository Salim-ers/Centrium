import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// POST /api/auth/update-password — définit le mot de passe de la session
// courante, CÔTÉ SERVEUR.
// -------------------------------------------------------------------------
// Remplace le supabase.auth.updateUser() client de /auth/set-password :
// comme tous les appels auth client, il sérialise via navigator.locks et
// peut rester pendu avec plusieurs onglets ouverts. Côté serveur : pas de
// verrou, session lue dans les cookies, erreurs explicites.
// =========================================================================

export const runtime = 'nodejs';

const schema = z.object({
  password: z.string().min(8, '8 caractères minimum').max(256),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'no_session', message: 'Session expirée — réouvre le lien reçu par email.' },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return NextResponse.json(
      { error: 'update_failed', message: error.message },
      { status: 400 },
    );
  }

  // Marque le compte comme "mot de passe défini" — /auth/callback et
  // /invite/accept s'en servent pour router les liens email : tant que
  // false, direction /auth/first-password. Service role : la colonne n'est
  // pas exposée en écriture par les policies RLS user.
  try {
    await createAdminClient('password-set')
      .from('profiles')
      .update({ password_set: true })
      .eq('id', user.id);
  } catch {
    /* best-effort — le flag sera reposé à la prochaine définition */
  }

  return NextResponse.json({ data: { ok: true } });
}
