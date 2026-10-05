import { NextRequest, NextResponse } from 'next/server';

import { apiPermission, getAuthorization } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { marginPolicySchema, resolveMarginPolicy } from '@/lib/finance/margin-policy';
import type { Permission } from '@/lib/auth/permissions';

export const runtime = 'nodejs';

// La politique de marge vit dans les réglages de l'organisation
// (org_notification_settings.settings.margins), à côté des automatisations.
async function readSettings(organizationId: string) {
  const admin = createAdminClient('cross-org-query');
  const { data } = await admin.from('org_notification_settings').select('settings').eq('organization_id', organizationId).maybeSingle();
  return { admin, settings: ((data?.settings ?? {}) as Record<string, unknown>) };
}

const READERS: Permission[] = ['opportunities.view', 'missions.view', 'finance.view', 'settings.manage'];

/** GET /api/organizations/margin-policy — objectif et seuil de bonne marge. */
export async function GET() {
  const auth = await getAuthorization();
  if (!READERS.some((p) => auth.permissions.has(p))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { settings } = await readSettings(auth.organizationId);
  return NextResponse.json({ data: resolveMarginPolicy(settings.margins) });
}

/** PUT /api/organizations/margin-policy — réservé au paramétrage de l'organisation. */
export async function PUT(req: NextRequest) {
  const auth = await apiPermission('settings.manage');
  if (auth instanceof NextResponse) return auth;
  const parsed = marginPolicySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });

  const { admin, settings } = await readSettings(auth.organizationId);
  const { error } = await admin.from('org_notification_settings').upsert(
    { organization_id: auth.organizationId, settings: { ...settings, margins: parsed.data }, updated_by: auth.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'organization_id' },
  );
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'organization',
    action: 'margin_policy_updated',
    details: parsed.data,
  });
  return NextResponse.json({ data: parsed.data });
}
