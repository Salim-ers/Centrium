import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';

/** Vérifie que les entités liées appartiennent à l'organisation. */
export async function assertQuoteLinks(
  admin: ReturnType<typeof createAdminClient>,
  org: string,
  links: { company_id?: string | null; contact_id?: string | null; opportunity_id?: string | null; template_id?: string | null; consultants?: Array<string | null | undefined> },
): Promise<string | null> {
  const checks: Array<[string, string | null | undefined]> = [
    ['companies', links.company_id],
    ['contacts', links.contact_id],
    ['opportunities', links.opportunity_id],
    ['document_templates', links.template_id],
    ...(links.consultants ?? []).map((id) => ['consultants', id] as [string, string | null | undefined]),
  ];
  for (const [table, id] of checks) {
    if (!id) continue;
    const { data } = await admin.from(table).select('organization_id').eq('id', id).maybeSingle();
    if (!data || data.organization_id !== org) return table;
  }
  return null;
}
