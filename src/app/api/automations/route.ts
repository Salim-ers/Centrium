import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { AUTOMATION_RULE_IDS, resolveAutomations } from '@/lib/automations/rules';

export const runtime = 'nodejs';

async function readSettings(organizationId: string) {
  const admin = createAdminClient('cross-org-query');
  const { data } = await admin.from('org_notification_settings').select('settings').eq('organization_id', organizationId).maybeSingle();
  return { admin, settings: ((data?.settings ?? {}) as Record<string, unknown>) };
}

/** GET /api/automations — réglages effectifs des automatisations. */
export async function GET() {
  const auth = await apiPermission('automations.manage');
  if (auth instanceof NextResponse) return auth;
  const { settings } = await readSettings(auth.organizationId);
  return NextResponse.json({ data: resolveAutomations(settings.automations) });
}

const patchSchema = z.object({ rule: z.enum(AUTOMATION_RULE_IDS), enabled: z.boolean() });

/** PATCH /api/automations — active / désactive une règle. */
export async function PATCH(req: NextRequest) {
  const auth = await apiPermission('automations.manage');
  if (auth instanceof NextResponse) return auth;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const { admin, settings } = await readSettings(auth.organizationId);
  const current = resolveAutomations(settings.automations);
  const next = { ...current, [parsed.data.rule]: { enabled: parsed.data.enabled } };
  const { error } = await admin.from('org_notification_settings').upsert(
    { organization_id: auth.organizationId, settings: { ...settings, automations: next }, updated_by: auth.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'organization_id' },
  );
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'automation',
    action: parsed.data.enabled ? 'automation_enabled' : 'automation_disabled',
    details: { rule: parsed.data.rule },
  });
  return NextResponse.json({ data: next });
}
