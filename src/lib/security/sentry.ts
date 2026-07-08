/**
 * Wrapper Sentry pour les événements sécurité critiques.
 *
 * Utilise le SDK @sentry/nextjs officiel quand il est configuré
 * (SENTRY_DSN défini en env). Fallback console.error sinon — utile
 * en local et garantit qu'on perd jamais un event critique.
 *
 * Tous les événements sécurité passent par reportSecurityEvent() pour
 * être traçables uniformément et alimenter le dashboard Sentry.
 */

import * as Sentry from '@sentry/nextjs';

import { logger } from '@/lib/logger';

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

const SEVERITY_TO_LEVEL: Record<SecurityEvent['severity'], Sentry.SeverityLevel> = {
  critical: 'fatal',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

export function reportSecurityEvent(event: SecurityEvent): void {
  const enriched = {
    type: event.type,
    severity: event.severity,
    organization_id: event.organizationId,
    ip: event.ip,
    ...event.metadata,
  };

  // Log structuré toujours (visible dans Vercel Logs même sans Sentry)
  logger.error(
    `[SECURITY] ${event.severity.toUpperCase()} ${event.type}: ${event.message}`,
    enriched,
  );

  // Si Sentry est configuré (DSN posé), capture l'event avec contexte enrichi
  Sentry.withScope((scope) => {
    scope.setLevel(SEVERITY_TO_LEVEL[event.severity]);
    scope.setTag('security_event', event.type);
    scope.setTag('severity', event.severity);
    if (event.userId) {
      scope.setUser({ id: event.userId, ip_address: event.ip });
    }
    if (event.organizationId) {
      scope.setTag('organization_id', event.organizationId);
    }
    if (event.metadata) {
      scope.setContext('security_metadata', event.metadata);
    }
    Sentry.captureMessage(event.message, SEVERITY_TO_LEVEL[event.severity]);
  });
}

/**
 * Helper pour capturer manuellement une exception côté code applicatif
 * avec contexte org/user — utile dans les routes API et services métier.
 */
export function captureException(
  error: unknown,
  context?: {
    userId?: string;
    organizationId?: string;
    extra?: Record<string, unknown>;
  },
): void {
  Sentry.withScope((scope) => {
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.organizationId) {
      scope.setTag('organization_id', context.organizationId);
    }
    if (context?.extra) {
      scope.setContext('extra', context.extra);
    }
    Sentry.captureException(error);
  });
}
