/**
 * Wrapper Sentry minimal sans dépendance externe.
 *
 * Sentry n'est PAS installé par défaut (pas de @sentry/nextjs en dependency).
 * Ce module fournit une interface stable pour reporter des incidents
 * sécurité critiques, qui :
 *
 *   - Si SENTRY_DSN est défini → POST raw HTTP vers Sentry (sans SDK lourd)
 *   - Sinon → log structuré dans la console (visible dans Vercel Logs)
 *
 * Pour activer Sentry en prod :
 *   1. Créer un compte sur sentry.io (gratuit jusqu'à 5k events/mois)
 *   2. Créer un projet "centrium-platform" type Next.js
 *   3. Copier le DSN dans SENTRY_DSN env var (Vercel)
 *   4. Redéployer
 *
 * Alternative : installer @sentry/nextjs pour le tracking complet (perf,
 * source maps, replay session). Coûts plus élevés au-delà du tier gratuit.
 */

type SecurityEventType =
  | 'rls.error' // erreur Postgres liée à RLS (potentiel trou)
  | 'service_role.unexpected' // appel admin client en dehors d'une raison whitelistée
  | 'export.massive' // tentative d'export massif bloquée
  | 'auth.brute_force' // pattern de brute force détecté
  | 'auth.unusual_login' // login depuis pays/horaire suspect
  | 'mfa.bypass_attempt' // tentative de désactiver MFA contre policy org
  | 'cross_tenant.attempt' // tentative d'accès cross-tenant détectée
  | 'data.bulk_modification'; // modification massive de données

export type SecurityEvent = {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  organizationId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
};

export async function reportSecurityEvent(event: SecurityEvent): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  const enriched = {
    ...event,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
  };

  // Log structuré : utile en dev + visible dans Vercel Logs même sans Sentry
  // eslint-disable-next-line no-console
  console.error(
    `[SECURITY] ${event.severity.toUpperCase()} ${event.type}: ${event.message}`,
    JSON.stringify(enriched),
  );

  if (!dsn) return;

  try {
    const parsed = parseDsn(dsn);
    if (!parsed) return;

    await fetch(
      `${parsed.host}/api/${parsed.projectId}/store/?sentry_version=7&sentry_key=${parsed.publicKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: event.message,
          level: mapSeverity(event.severity),
          tags: {
            type: event.type,
            severity: event.severity,
            org_id: event.organizationId,
          },
          user: event.userId ? { id: event.userId, ip_address: event.ip } : undefined,
          extra: event.metadata,
        }),
        signal: AbortSignal.timeout(2000),
      },
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[sentry] failed to report', (e as Error).message);
  }
}

function parseDsn(
  dsn: string,
): { host: string; projectId: string; publicKey: string } | null {
  try {
    const u = new URL(dsn);
    return {
      host: `${u.protocol}//${u.host}`,
      projectId: u.pathname.replace(/^\//, ''),
      publicKey: u.username,
    };
  } catch {
    return null;
  }
}

function mapSeverity(s: SecurityEvent['severity']): string {
  switch (s) {
    case 'critical':
      return 'fatal';
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
    default:
      return 'info';
  }
}
