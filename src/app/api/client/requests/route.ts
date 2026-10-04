import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalClient } from '@/lib/portal/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { clientRequestSchema } from '@/lib/validators/v2';
import { convertClientRequest, type ClientRequestRow } from '@/lib/portal/client-requests';
import { loadAutomationSettings } from '@/lib/automations/settings.server';
import { membersWithPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

/**
 * POST /api/client/requests — un client exprime un besoin depuis son
 * portail. L'organisation et la société viennent de son accès (jamais du
 * corps de la requête). Si l'automatisation est active, l'opportunité est
 * créée immédiatement dans le CRM.
 */
export async function POST(req: NextRequest) {
  const me = await getPortalClient();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const rl = await rateLimit(`client-request:${me.userId}`, { limit: 10, windowSec: 3600 });
  if (!rl.ok) return NextResponse.json({ error: 'too_many_requests', message: 'Trop de demandes, réessayez plus tard.' }, { status: 429 });

  const parsed = clientRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient('client-portal');
  const { data: created, error } = await admin
    .from('client_requests')
    .insert({ ...parsed.data, organization_id: me.organizationId, company_id: me.companyId, created_by: me.userId, status: 'new' })
    .select('*')
    .single();
  if (error || !created) return NextResponse.json({ error: 'create_failed' }, { status: 500 });

  await logAudit({ organizationId: me.organizationId, userId: me.userId, entityType: 'client_request', entityId: created.id, action: 'created' });

  const automations = await loadAutomationSettings(admin, me.organizationId);
  if (automations.client_request_to_opportunity.enabled) {
    await convertClientRequest(admin, created as ClientRequestRow, { actorId: me.userId, contactId: me.contactId });
  } else {
    const recipients = await membersWithPermission(admin, me.organizationId, 'opportunities.edit');
    if (recipients.length) {
      await admin.from('notifications').insert(
        recipients.map((user_id) => ({
          organization_id: me.organizationId,
          user_id,
          kind: 'client_request',
          priority: 'high',
          title: 'Nouvelle demande client',
          body: created.title,
          link: '/portals?tab=requests',
        })),
      );
    }
  }
  return NextResponse.json({ data: { id: created.id } }, { status: 201 });
}
