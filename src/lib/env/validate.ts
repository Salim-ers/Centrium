import 'server-only';

import { logger } from '@/lib/logger';

/**
 * Validation des variables d'environnement au DÉMARRAGE du serveur.
 *
 * Objectif : rendre visible (logs Vercel au boot) toute config manquante, au
 * lieu de casser silencieusement fonctionnalité par fonctionnalité au runtime.
 *
 * - REQUIRED   : sans elles l'app ne fonctionne pas du tout → on JETTE en prod
 *                (fail-fast : un déploiement qui refuse de démarrer vaut mieux
 *                qu'un service à moitié cassé).
 * - RECOMMENDED: une fonctionnalité est dégradée si absente → WARN.
 * - OPTIONAL   : monitoring / accélérateurs → INFO.
 */

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const RECOMMENDED: Record<string, string> = {
  STRIPE_SECRET_KEY: 'paiements (checkout / webhook)',
  STRIPE_WEBHOOK_SECRET: 'synchro des abonnements Stripe',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'paiement intégré côté client',
  RESEND_API_KEY: 'emails transactionnels (invitations, purge…)',
  CRON_SECRET: 'authentification du cron de purge des archives',
  NEXT_PUBLIC_APP_URL: 'URLs absolues (emails, redirections Stripe)',
};

const OPTIONAL: Record<string, string> = {
  SENTRY_DSN: 'monitoring des erreurs serveur',
  NEXT_PUBLIC_SENTRY_DSN: 'monitoring des erreurs client',
  UPSTASH_REDIS_REST_URL: 'rate-limit distribué (sinon in-memory par instance)',
  UPSTASH_REDIS_REST_TOKEN: 'rate-limit distribué',
  ANTHROPIC_API_KEY: 'CV Optimizer / matching IA (sinon fallback heuristique)',
};

let validated = false;

/** Idempotent — ne s'exécute qu'une fois par process. */
export function validateEnv(): void {
  if (validated) return;
  validated = true;

  const present = (k: string) => !!process.env[k]?.trim();
  const missingRequired = REQUIRED.filter((k) => !present(k));
  const missingRecommended = Object.keys(RECOMMENDED).filter((k) => !present(k));
  const missingOptional = Object.keys(OPTIONAL).filter((k) => !present(k));

  if (missingOptional.length) {
    logger.info(
      `[env] Optionnelles manquantes : ${missingOptional
        .map((k) => `${k} (${OPTIONAL[k]})`)
        .join(', ')}`,
    );
  }
  if (missingRecommended.length) {
    logger.warn(
      `[env] RECOMMANDÉES manquantes (fonctionnalités dégradées) : ${missingRecommended
        .map((k) => `${k} (${RECOMMENDED[k]})`)
        .join(', ')}`,
    );
  }
  if (missingRequired.length) {
    const msg = `[env] REQUISES manquantes : ${missingRequired.join(', ')}`;
    logger.error(msg);
    // Fail-fast uniquement en production ; en dev/preview on laisse démarrer.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
  }
}
