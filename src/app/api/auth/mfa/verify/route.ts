import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

/**
 * Étape 2 du MFA TOTP : l'utilisateur a scanné le QR code, il entre le code
 * à 6 chiffres affiché par son app authenticator. On vérifie + on active
 * le facteur définitivement.
 */
const bodySchema = z.object({
  factor_id: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres attendu'),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createClient();

  // 1) Création d'un challenge pour le facteur
  const challenge = await supabase.auth.mfa.challenge({
    factorId: parsed.data.factor_id,
  });
  if (challenge.error) {
    return NextResponse.json({ error: challenge.error.message }, { status: 400 });
  }

  // 2) Vérification du code
  const verify = await supabase.auth.mfa.verify({
    factorId: parsed.data.factor_id,
    challengeId: challenge.data.id,
    code: parsed.data.code,
  });
  if (verify.error) {
    return NextResponse.json(
      { error: 'invalid_code', message: verify.error.message },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.organization_id) {
    await logAudit({
      organizationId: profile.organization_id,
      userId: user.id,
      entityType: 'mfa_factor',
      entityId: parsed.data.factor_id,
      action: 'mfa.enabled',
    });
  }

  return NextResponse.json(
    {
      data: { ok: true, message: 'MFA activé avec succès.' },
    },
    { status: 200 },
  );
}
