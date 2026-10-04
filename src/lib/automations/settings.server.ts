import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveAutomations, type AutomationSettings } from './rules';

/** Réglages d'automatisation effectifs d'une organisation (client admin ou utilisateur). */
export async function loadAutomationSettings(client: SupabaseClient, organizationId: string): Promise<AutomationSettings> {
  const { data } = await client.from('org_notification_settings').select('settings').eq('organization_id', organizationId).maybeSingle();
  const settings = (data?.settings ?? {}) as { automations?: unknown };
  return resolveAutomations(settings.automations);
}
