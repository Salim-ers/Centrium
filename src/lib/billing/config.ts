import 'server-only';

import type { LegacyPlanId, SelfServicePlanId } from './plans';

// =========================================================================
// Configuration Stripe — source unique de vérité pour les env vars
// -------------------------------------------------------------------------
// Toutes les clés / secrets Stripe passent par ce module. Objectifs :
//
//   1. Un seul endroit où lire process.env.STRIPE_* → moins de refactor
//      quand on change les noms de variables.
//   2. Validation stricte au CALL, pas au module load : évite qu'un
//      manque de secret casse le build Next.js entier (server-only).
//   3. Format des Price IDs validé (^price_[a-zA-Z0-9]{16,}$) — attrape
//      les erreurs type "price_75€" ou "price_medium" avant qu'elles
//      atteignent l'API Stripe (qui répondrait avec une erreur cryptique).
//   4. Les valeurs des secrets ne sont JAMAIS loggées, même en cas d'erreur.
//      Seul le NOM de la variable manquante apparaît dans les messages.
//
// VARIABLES ATTENDUES DANS .env.local
//   STRIPE_SECRET_KEY                      obligatoire (sk_test_ ou sk_live_)
//   STRIPE_WEBHOOK_SECRET                  obligatoire (whsec_...)
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY     recommandé (pk_test_ ou pk_live_)
//   STRIPE_STARTER_PRICE_ID                obligatoire pour souscrire Starter
//   STRIPE_MEDIUM_PRICE_ID                 obligatoire pour souscrire Medium
//   STRIPE_ENTERPRISE_PRICE_ID             obligatoire pour souscrire Illimité
//
// Les 3 plans sont désormais en self-service via Stripe Checkout :
//   Starter 74,99 € · Medium 149,99 € · Illimité (id 'enterprise') 299,99 €.
// =========================================================================

/**
 * Format des Price IDs Stripe : commencent par `price_` suivi d'au moins
 * 16 caractères alphanumériques. En pratique Stripe génère des IDs de 24
 * caractères mais on reste tolérant sur la longueur.
 *
 * Rejette : "price_75€", "price_medium", "prod_...", chaînes vides, undefined.
 * Accepte : "price_1AbCdEfGhIjKlMnOpQrStUv"
 */
const STRIPE_PRICE_ID_REGEX = /^price_[a-zA-Z0-9]{16,}$/;

const STRIPE_SECRET_KEY_PREFIX = /^sk_(test|live)_/;

/**
 * Erreur levée quand une env var Stripe est manquante ou mal formée.
 * Le message ne contient JAMAIS la valeur du secret.
 */
export class StripeConfigError extends Error {
  constructor(
    public readonly envVar: string,
    public readonly kind: 'missing' | 'invalid_format' | 'wrong_prefix',
    detail?: string,
  ) {
    const hints: Record<typeof kind, string> = {
      missing: `définis-la dans .env.local puis redémarre le dev server`,
      invalid_format: `doit matcher ${STRIPE_PRICE_ID_REGEX} (ex: price_1AbCd... — 24 caractères Stripe)`,
      wrong_prefix: `doit commencer par le bon préfixe (sk_test_/sk_live_ pour secret, pk_test_/pk_live_ pour publishable, whsec_ pour webhook)`,
    };
    super(
      `Stripe config: ${envVar} ${kind === 'missing' ? 'manquante' : 'invalide'} — ${detail ?? hints[kind]}`,
    );
    this.name = 'StripeConfigError';
  }
}

// -------- Secret key -----------------------------------------------------

export function requireStripeSecretKey(): string {
  const v = process.env.STRIPE_SECRET_KEY;
  if (!v) throw new StripeConfigError('STRIPE_SECRET_KEY', 'missing');
  if (!STRIPE_SECRET_KEY_PREFIX.test(v)) {
    throw new StripeConfigError(
      'STRIPE_SECRET_KEY',
      'wrong_prefix',
      'doit commencer par sk_test_ (test) ou sk_live_ (prod)',
    );
  }
  return v;
}

export function isStripeLiveMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_');
}

// -------- Webhook secret --------------------------------------------------

export function requireStripeWebhookSecret(): string {
  const v = process.env.STRIPE_WEBHOOK_SECRET;
  if (!v) throw new StripeConfigError('STRIPE_WEBHOOK_SECRET', 'missing');
  if (!v.startsWith('whsec_')) {
    throw new StripeConfigError(
      'STRIPE_WEBHOOK_SECRET',
      'wrong_prefix',
      'doit commencer par whsec_ (obtenu via `stripe listen` ou Dashboard)',
    );
  }
  return v;
}

// -------- Publishable key (client-safe) ----------------------------------

/**
 * Optionnelle pour le flow Checkout Session (server-side redirect).
 * Utile pour Payment Element côté client. Retourne null si absente.
 */
export function getStripePublishableKey(): string | null {
  const v = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!v) return null;
  if (!/^pk_(test|live)_/.test(v)) {
    throw new StripeConfigError(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'wrong_prefix',
      'doit commencer par pk_test_ ou pk_live_',
    );
  }
  return v;
}

// -------- Price IDs par plan ---------------------------------------------

/**
 * Plans avec souscription self-service via Stripe Checkout.
 *
 * Mapping planId (interne DB) → env var :
 *   'starter'    → STRIPE_STARTER_PRICE_ID
 *   'growth'     → STRIPE_MEDIUM_PRICE_ID     (id 'growth' conservé pour
 *                                              compat DB + Stripe metadata,
 *                                              display name UI = "Medium")
 *   'enterprise' → STRIPE_ENTERPRISE_PRICE_ID (display name UI = "Illimité",
 *                                              id conservé pour compat)
 */
export type StripePlanId = LegacyPlanId | SelfServicePlanId;

/**
 * Variables d'environnement historiques (offres starter / growth /
 * enterprise). Les offres V2 n'en ont pas : leurs Price IDs (mensuel et
 * annuel) sont créés depuis la super-console et lus dans la table plans.
 */
const PLAN_ENV_VAR: Partial<Record<StripePlanId, string>> = {
  starter: 'STRIPE_STARTER_PRICE_ID',
  growth: 'STRIPE_MEDIUM_PRICE_ID',
  enterprise: 'STRIPE_ENTERPRISE_PRICE_ID',
};

/**
 * Retourne le Price ID Stripe pour le plan donné. Throw StripeConfigError
 * si manquant ou format inattendu. Ne log jamais la valeur.
 */
export function requireStripePriceId(planId: StripePlanId): string {
  const envVar = PLAN_ENV_VAR[planId];
  if (!envVar) throw new StripeConfigError(`plans.stripe_price_id (${planId})`, 'missing', 'créez les prix depuis la super-console');
  const value = process.env[envVar];
  if (!value) throw new StripeConfigError(envVar, 'missing');
  if (!STRIPE_PRICE_ID_REGEX.test(value)) {
    throw new StripeConfigError(envVar, 'invalid_format');
  }
  return value;
}

/**
 * Reverse-map : Price ID (reçu du webhook) → planId interne.
 * Retourne null si le Price ID n'est associé à aucun plan actif
 * (le webhook fera alors un fallback via `plans.stripe_price_id`
 * pour absorber les anciens Prices d'abonnés legacy).
 */
export function priceIdToPlanId(priceId: string): StripePlanId | null {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter';
  if (priceId === process.env.STRIPE_MEDIUM_PRICE_ID) return 'growth';
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return 'enterprise';
  return null;
}

/**
 * Diagnostic runtime — état de chaque config sans exposer les valeurs.
 * Utile pour un health check admin.
 */
export function getStripeConfigStatus(): {
  secretKey: 'ok' | 'missing' | 'invalid';
  webhookSecret: 'ok' | 'missing' | 'invalid';
  publishableKey: 'ok' | 'missing' | 'invalid';
  starterPriceId: 'ok' | 'missing' | 'invalid';
  mediumPriceId: 'ok' | 'missing' | 'invalid';
  enterprisePriceId: 'ok' | 'missing' | 'invalid';
  mode: 'test' | 'live' | 'unknown';
} {
  const check = (
    v: string | undefined,
    validator: (v: string) => boolean,
  ): 'ok' | 'missing' | 'invalid' => {
    if (!v) return 'missing';
    return validator(v) ? 'ok' : 'invalid';
  };
  return {
    secretKey: check(process.env.STRIPE_SECRET_KEY, (v) => STRIPE_SECRET_KEY_PREFIX.test(v)),
    webhookSecret: check(process.env.STRIPE_WEBHOOK_SECRET, (v) => v.startsWith('whsec_')),
    publishableKey: check(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      (v) => /^pk_(test|live)_/.test(v),
    ),
    starterPriceId: check(process.env.STRIPE_STARTER_PRICE_ID, (v) =>
      STRIPE_PRICE_ID_REGEX.test(v),
    ),
    mediumPriceId: check(process.env.STRIPE_MEDIUM_PRICE_ID, (v) =>
      STRIPE_PRICE_ID_REGEX.test(v),
    ),
    enterprisePriceId: check(process.env.STRIPE_ENTERPRISE_PRICE_ID, (v) =>
      STRIPE_PRICE_ID_REGEX.test(v),
    ),
    mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
      ? 'live'
      : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
        ? 'test'
        : 'unknown',
  };
}
