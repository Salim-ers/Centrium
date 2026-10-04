import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthorization } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

const bodySchema = z.object({ user_id: z.string().uuid() });

/**
 * POST /api/team/owner — transfert de propriété. Exécuté avec la session de
 * l'utilisateur : la fonction SQL vérifie elle-même que l'appelant est le
 * propriétaire actuel et que la cible est un membre interne.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthorization({ skipSubscriptionGate: true });
  if (!auth.isOwner) return NextResponse.json({ error: 'forbidden', message: 'Réservé au propriétaire.' }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if (parsed.data.user_id === auth.user.id) return NextResponse.json({ error: 'same_user' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.rpc('transfer_org_ownership', { p_org: auth.organizationId, p_new_owner: parsed.data.user_id });
  if (error) return NextResponse.json({ error: 'transfer_failed', message: error.message }, { status: 409 });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'organization',
    entityId: auth.organizationId,
    action: 'ownership_transferred',
    details: { to: parsed.data.user_id },
  });
  const res = NextResponse.json({ data: { owner: parsed.data.user_id } });
  res.cookies.set({ name: 'qc_profile', value: '', path: '/', maxAge: 0 });
  return res;
}
