// =========================================================================
// Matrice d'accès abonnement — SOURCE UNIQUE DE VÉRITÉ
// -------------------------------------------------------------------------
// Utilisée par :
//   1. le middleware (gating des PAGES → redirect /billing?error=…)
//   2. requireOrg() dans lib/auth/guards.ts (gating des ROUTES API → même
//      redirect ; un fetch() client bloqué suit la redirection et échoue
//      proprement côté UI)
//
// Module PUR (pas de 'server-only', pas d'API Node) : il doit pouvoir
// s'exécuter dans le runtime edge du middleware.
//
// Statuts gérés (subscriptions.status, texte libre écrit par le webhook) :
//   is_exempt_from_billing               → ACCÈS (fondateurs / partenaires)
//   active                               → ACCÈS
//   trialing  + trial_end ≥ now          → ACCÈS (essai en cours)
//   trialing  + trial_end < now          → DENY trial_expired
//   canceled  + period_end ≥ now         → ACCÈS (grace jusqu'à fin payée)
//   canceled  + period_end absent/passé  → DENY subscription_expired
//   past_due / unpaid                    → DENY payment_failed
//   incomplete / incomplete_expired      → DENY checkout_incomplete
//   paused                               → DENY paused
//   aucune ligne                         → DENY no_subscription
//   statut inconnu                       → DENY unknown_status (fail-safe)
// =========================================================================

export type SubscriptionAccessRow = {
  status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  is_exempt_from_billing: boolean | null;
};

export type SubscriptionDenyReason =
  | 'no_subscription'
  | 'trial_expired'
  | 'subscription_expired'
  | 'payment_failed'
  | 'checkout_incomplete'
  | 'paused'
  | 'unknown_status';

export type SubscriptionAccess =
  | { allowed: true }
  | { allowed: false; reason: SubscriptionDenyReason };

export function evaluateSubscriptionAccess(
  sub: SubscriptionAccessRow | null,
  now: Date = new Date(),
): SubscriptionAccess {
  if (sub?.is_exempt_from_billing) return { allowed: true };

  if (!sub) return { allowed: false, reason: 'no_subscription' };

  const trialEnd = sub.trial_end ? new Date(sub.trial_end) : null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;

  switch (sub.status) {
    case 'active':
      return { allowed: true };
    case 'trialing':
      if (trialEnd && trialEnd < now) return { allowed: false, reason: 'trial_expired' };
      return { allowed: true };
    case 'canceled':
      if (!periodEnd || periodEnd < now)
        return { allowed: false, reason: 'subscription_expired' };
      return { allowed: true }; // grace period jusqu'à la fin déjà payée
    case 'past_due':
    case 'unpaid':
      return { allowed: false, reason: 'payment_failed' };
    case 'incomplete':
    case 'incomplete_expired':
      return { allowed: false, reason: 'checkout_incomplete' };
    case 'paused':
      return { allowed: false, reason: 'paused' };
    default:
      return { allowed: false, reason: 'unknown_status' };
  }
}
