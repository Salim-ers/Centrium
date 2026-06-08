import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

/**
 * Désactive un facteur MFA. L'admin org peut interdire ça si la policy
 * org demande MFA obligatoire pour les admins (cf. org_security_settings).
 */
const bodySchema = z.object({ factor_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const supabase = createClient();

  // Vérif policy org : si MFA requis pour admin, on bloque le désenrôlement
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'admin' && profile.organization_id) {
    const { data: settings } = await supabase
      .from('org_security_settings')
      .select('mfa_required_for_admin')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    if (settings?.mfa_required_for_admin) {
      return NextResponse.json(
        {
          error: 'mfa_required',
          message:
            'Le MFA est obligatoire pour les administrateurs de cette organisation. Demande à un autre admin de modifier la politique de sécurité.',
        },
        { status: 403 },
      );
    }
  }

  const { error } = await supabase.auth.mfa.unenroll({
    factorId: parsed.data.factor_id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (profile?.organization_id) {
    await logAudit({
      organizationId: profile.organization_id,
      userId: user.id,
      entityType: 'mfa_factor',
      entityId: parsed.data.factor_id,
      action: 'mfa.disabled',
    });
  }

  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
