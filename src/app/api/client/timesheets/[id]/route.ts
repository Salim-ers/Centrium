import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalClient } from '@/lib/portal/server';
import { membersWithPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    comment: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => v.action === 'approve' || !!v.comment, { message: 'Précisez la correction attendue.', path: ['comment'] });

/**
 * POST /api/client/timesheets/:id — approbation client d'un CRA (facultative,
 * demandée par l'ESN). Le CRA doit concerner une mission de la société du
 * client. L'approbation ne valide pas le CRA à la place de l'ESN : elle
 * l'informe, la validation finale reste interne.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getPortalClient();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient('client-portal');
  const { data: ts } = await admin
    .from('timesheets')
    .select('id, organization_id, mission_id, client_approval_status, period_month, period_year')
    .eq('id', params.id)
    .maybeSingle();
  if (!ts || ts.organization_id !== me.organizationId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { data: mission } = await admin.from('missions').select('company_id, title').eq('id', ts.mission_id).maybeSingle();
  if (!mission || mission.company_id !== me.companyId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (ts.client_approval_status !== 'pending') {
    return NextResponse.json({ error: 'not_pending', message: 'Ce CRA n’attend pas votre approbation.' }, { status: 409 });
  }

  const approved = parsed.data.action === 'approve';
  const { error } = await admin
    .from('timesheets')
    .update({
      client_approval_status: approved ? 'approved' : 'rejected',
      client_approved_at: new Date().toISOString(),
      client_approved_by: me.userId,
      client_comment: parsed.data.comment || null,
    })
    .eq('id', ts.id)
    .eq('client_approval_status', 'pending');
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });

  const recipients = await membersWithPermission(admin, me.organizationId, 'timesheets.validate');
  if (recipients.length) {
    const period = `${String(ts.period_month).padStart(2, '0')}/${ts.period_year}`;
    await admin.from('notifications').insert(
      recipients.map((user_id) => ({
        organization_id: me.organizationId,
        user_id,
        kind: 'timesheet_client_decision',
        priority: approved ? 'medium' : 'high',
        title: approved ? `CRA ${period} approuvé par le client` : `CRA ${period} : correction demandée par le client`,
        body: parsed.data.comment || mission.title,
        link: '/timesheets',
      })),
    );
  }
  await logAudit({
    organizationId: me.organizationId,
    userId: me.userId,
    entityType: 'timesheet',
    entityId: ts.id,
    action: approved ? 'client_approved' : 'client_rejected',
  });
  return NextResponse.json({ data: { client_approval_status: approved ? 'approved' : 'rejected' } });
}
