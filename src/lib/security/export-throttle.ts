import 'server-only';

import { rateLimit } from './rate-limit';
import { logAudit } from '@/lib/audit/log';

/**
 * Throttle des exports massifs.
 *
 * Cas d'usage : un BM compromis ou malicieux qui essaie d'aspirer toute la
 * base consultants/contacts/factures en quelques minutes.
 *
 * Politique :
 *   - Max 5 exports / heure / user
 *   - Max 1000 lignes / export en une seule requête
 *   - Au-delà : log d'audit + erreur 429
 *
 * À appeler en début de toute route qui exporte des données :
 *   const ok = await checkExportThrottle(user, org, 'consultants', 250)
 *   if (!ok.allowed) return NextResponse.json({error:ok.reason}, {status:429})
 */

const MAX_ROWS_PER_REQUEST = 1000;
const MAX_EXPORTS_PER_HOUR = 5;

export async function checkExportThrottle(args: {
  userId: string;
  organizationId: string;
  entityType: string;
  requestedRows?: number;
}): Promise<{ allowed: boolean; reason?: string; retryAfterSec?: number }> {
  if ((args.requestedRows ?? 0) > MAX_ROWS_PER_REQUEST) {
    await logAudit({
      organizationId: args.organizationId,
      userId: args.userId,
      entityType: args.entityType,
      action: 'data.exported',
      details: {
        blocked: true,
        reason: 'too_many_rows',
        requested: args.requestedRows,
        max: MAX_ROWS_PER_REQUEST,
      },
    });
    return {
      allowed: false,
      reason: `Export limité à ${MAX_ROWS_PER_REQUEST} lignes par requête. Pagine ou filtre ton export.`,
    };
  }

  const rl = await rateLimit(
    `export:${args.userId}:${args.entityType}`,
    { limit: MAX_EXPORTS_PER_HOUR, windowSec: 3600 },
  );

  if (!rl.ok) {
    await logAudit({
      organizationId: args.organizationId,
      userId: args.userId,
      entityType: args.entityType,
      action: 'data.exported',
      details: {
        blocked: true,
        reason: 'rate_limited',
        max_per_hour: MAX_EXPORTS_PER_HOUR,
      },
    });
    return {
      allowed: false,
      reason: `Maximum ${MAX_EXPORTS_PER_HOUR} exports/h. Réessaie dans ${Math.ceil((rl.resetAt - Date.now()) / 60_000)} min.`,
      retryAfterSec: Math.ceil((rl.resetAt - Date.now()) / 1000),
    };
  }

  // Log l'export autorisé pour traçabilité
  await logAudit({
    organizationId: args.organizationId,
    userId: args.userId,
    entityType: args.entityType,
    action: 'data.exported',
    details: {
      blocked: false,
      rows: args.requestedRows ?? null,
      remaining_quota: rl.remaining,
    },
  });

  return { allowed: true };
}
