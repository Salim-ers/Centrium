import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Helper d'audit serveur.
 *
 * Toutes les actions sensibles (create/update/delete sur entités métier,
 * actions IA, accès aux données protégées) doivent être loggées via
 * `logAudit()` depuis une route handler ou une edge function.
 *
 * Stockage : table `activities` (migration 001) avec :
 *   - organization_id  (obligatoire — multi-tenant)
 *   - entity_type      (ex: 'consultant', 'invoice', 'ai_cv_optimize')
 *   - entity_id        (uuid de l'entité)
 *   - action           ('created', 'updated', 'deleted', 'viewed', ...)
 *   - user_id          (auteur)
 *   - details          (jsonb — payload before/after, raisons, etc.)
 *
 * Erreur silencieuse : l'audit ne doit JAMAIS faire échouer l'action métier.
 * On log l'échec côté serveur pour investigation.
 */
export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'viewed'
  | 'exported'
  | 'invited'
  | 'login'
  | 'logout'
  | 'ai.requested'
  | 'ai.completed'
  | 'ai.flagged'
  | 'data.exported'
  | 'data.deletion_requested';

export type AuditInput = {
  organizationId: string;
  userId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: AuditAction | string;
  details?: Record<string, unknown> | null;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const admin = createAdminClient('audit-log-write');
    const { error } = await admin.from('activities').insert({
      organization_id: input.organizationId,
      user_id: input.userId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      action: input.action,
      details: input.details ?? null,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[audit] insert failed', error.message);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[audit] unexpected error', (e as Error).message);
  }
}

/**
 * Diff helper : limite la profondeur et la taille pour éviter de stocker
 * des payloads massifs (CV de 50 ko en JSON par ex).
 */
export function diff(before: unknown, after: unknown, maxLen = 4000): Record<string, unknown> {
  const safe = (v: unknown) => {
    try {
      const s = JSON.stringify(v);
      return s.length > maxLen ? s.slice(0, maxLen) + '…' : JSON.parse(s);
    } catch {
      return null;
    }
  };
  return { before: safe(before), after: safe(after) };
}
