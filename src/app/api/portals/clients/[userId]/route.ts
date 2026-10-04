import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

const bodySchema = z.object({ action: z.enum(['revoke', 'restore']) });

/**
 * PATCH /api/portals/clients/:userId — révoque ou rétablit un accès client.
 * La révocation est immédiate : chaque page et route du portail vérifie
 * l'accès actif côté serveur.
 */
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await apiPermission('portals.manage');
  if (auth instanceof NextResponse) return auth;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const admin = createAdminClient('portal-access');
  const { data: access } = await admin
    .from('client_portal_users')
    .select('user_id, organization_id')
    .eq('user_id', params.userId)
    .maybeSingle();
  if (!access || access.organization_id !== auth.organizationId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const revoke = parsed.data.action === 'revoke';
  const { error } = await admin
    .from('client_portal_users')
    .update({ revoked_at: revoke ? new Date().toISOString() : null })
    .eq('user_id', access.user_id);
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'client_portal_user',
    entityId: access.user_id,
    action: revoke ? 'revoked' : 'restored',
  });
  return NextResponse.json({ data: { revoked: revoke } });
}
