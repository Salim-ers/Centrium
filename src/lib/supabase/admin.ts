import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

/**
 * Client Supabase admin (service_role).
 *
 * ⚠️ BYPASS TOUTE RLS. À utiliser UNIQUEMENT :
 *   • dans Route Handlers serveur (src/app/api/**\/route.ts)
 *   • dans Edge Functions Supabase
 *   • dans les webhooks (Stripe, etc.)
 *
 * JAMAIS dans un Server Component, jamais côté client, jamais dans une page.
 *
 * Depuis le hardening sécurité : chaque appel DOIT déclarer un `reason`
 * libre qui décrit POURQUOI on contourne la RLS. Ce reason est inscrit
 * dans les logs serveur (et Sentry, s'il est branché) — ça force le dev
 * à expliciter l'intention et ça donne une piste d'audit.
 */
type AdminReason =
  | 'webhook' // ex: Stripe webhook
  | 'cross-org-query' // ex: super_admin dashboard
  | 'audit-log-write' // logAudit() qui doit traverser RLS
  | 'rgpd-export' // export RGPD utilisateur self-service
  | 'rgpd-deletion' // demande de suppression de compte (art. 17)
  | 'invitation' // création membership cross-org
  | 'onboarding' // création initiale org + first member
  | 'system-cron' // jobs planifiés
  | 'data-migration' // migration de données one-shot
  | 'billing-cancel' // POST /api/billing/cancel
  | 'billing-reactivate' // POST /api/billing/reactivate
  | 'billing-subscription' // GET /api/billing/subscription state snapshot
  | 'password-set' // POST /api/auth/update-password → profiles.password_set
  | 'team-management' // liste / suppression membres + invitations (settings/team)
  | 'org-deletion'; // suppression d'une organisation depuis la super-console

export function createAdminClient(reason: AdminReason): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquante. Ajoute-la dans .env.local (serveur uniquement).',
    );
  }

  // Trace systématique pour faciliter l'audit ex-post.
  // En prod, ces logs partent dans Vercel Logs / Sentry (à brancher).
  if (process.env.NODE_ENV !== 'test') {
    logger.info(
      `[supabase.admin] service_role used — reason=${reason} ts=${new Date().toISOString()}`,
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        // Aide à pister côté Supabase logs quel call provient d'un admin client
        'x-centrium-admin-reason': reason,
      },
    },
  });
}
