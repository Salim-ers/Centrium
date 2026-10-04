import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { convertClientRequest, type ClientRequestRow } from '@/lib/portal/client-requests';

export const runtime = 'nodejs';

const bodySchema = z.object({ action: z.enum(['convert', 'in_review', 'decline']) });

/** POST /api/portals/requests/:id — traitement d'une demande client par l'ESN. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiPermission('opportunities.edit');
  if (auth instanceof NextResponse) return auth;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const admin = createAdminClient('client-portal');
  const { data: request } = await admin.from('client_requests').select('*').eq('id', params.id).maybeSingle();
  if (!request || request.organization_id !== auth.organizationId) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (parsed.data.action === 'convert') {
    const { data: access } = request.created_by
      ? await admin.from('client_portal_users').select('contact_id').eq('user_id', request.created_by).maybeSingle()
      : { data: null };
    const res = await convertClientRequest(admin, request as ClientRequestRow, { actorId: auth.user.id, contactId: access?.contact_id ?? null });
    if ('error' in res) return NextResponse.json({ error: 'convert_failed', message: res.error }, { status: 500 });
    return NextResponse.json({ data: { opportunity_id: res.opportunityId } });
  }

  if (request.status === 'converted') {
    return NextResponse.json({ error: 'already_converted', message: 'Demande déjà convertie : suivez-la dans le CRM.' }, { status: 409 });
  }
  const status = parsed.data.action === 'decline' ? 'declined' : 'in_review';
  const { error } = await admin.from('client_requests').update({ status }).eq('id', request.id);
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  await logAudit({ organizationId: auth.organizationId, userId: auth.user.id, entityType: 'client_request', entityId: request.id, action: `request_${status}` });
  return NextResponse.json({ data: { status } });
}
