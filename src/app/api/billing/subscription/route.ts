import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// GET /api/billing/subscription
// -------------------------------------------------------------------------
// Renvoie l'état complet de la subscription pour l'org de l'user courant.
// Utilisé par /billing et /settings/subscription pour le rendu UI + les
// décisions "afficher bouton cancel vs reactivate vs souscrire".
//
// Réponse :
//   { data: {
//       planId, planName, priceMonthly, status,
//       currentPeriodEnd, cancelAtPeriodEnd,
//       trialEnd, trialExpired, isExempt,
//       hasStripeCustomer, hasStripeSubscription,
//       accessGrantedUntil,    // date jusqu'à laquelle l'accès est garanti
//       needsAction            // 'none' | 'checkout' | 'update_payment' | 'renew'
//   } }
// =========================================================================

export const runtime = 'nodejs';

export async function GET() {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  const admin = createAdminClient('billing-subscription');

  const { data: sub } = await admin
    .from('subscriptions')
    .select(
      'plan_id, status, current_period_end, cancel_at_period_end, trial_end, is_exempt_from_billing, stripe_customer_id, stripe_subscription_id, plans(id, name, price_monthly_eur)',
    )
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({
      data: {
        planId: null,
        planName: null,
        priceMonthly: null,
        status: 'no_subscription',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        trialExpired: false,
        isExempt: false,
        hasStripeCustomer: false,
        hasStripeSubscription: false,
        accessGrantedUntil: null,
        needsAction: 'checkout',
      },
    });
  }

  const plan = sub.plans as unknown as
    | { id: string; name: string; price_monthly_eur: number | null }
    | null;
  const now = new Date();
  const trialEnd = sub.trial_end ? new Date(sub.trial_end) : null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;

  const trialExpired =
    !sub.is_exempt_from_billing &&
    sub.status === 'trialing' &&
    !!trialEnd &&
    trialEnd < now;

  // Jusqu'à quand l'accès est-il garanti ?
  let accessGrantedUntil: string | null = null;
  if (sub.is_exempt_from_billing) {
    accessGrantedUntil = 'permanent';
  } else if (sub.status === 'active') {
    accessGrantedUntil = periodEnd?.toISOString() ?? null;
  } else if (sub.status === 'trialing' && trialEnd && trialEnd > now) {
    accessGrantedUntil = trialEnd.toISOString();
  } else if (sub.status === 'canceled' && periodEnd && periodEnd > now) {
    accessGrantedUntil = periodEnd.toISOString();
  }

  // Prochaine action attendue de l'user
  let needsAction: 'none' | 'checkout' | 'update_payment' | 'renew' = 'none';
  if (sub.is_exempt_from_billing) {
    needsAction = 'none';
  } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
    needsAction = 'update_payment';
  } else if (sub.status === 'trialing' && trialExpired) {
    needsAction = 'checkout';
  } else if (sub.status === 'canceled') {
    needsAction = periodEnd && periodEnd > now ? 'none' : 'renew';
  } else if (sub.status === 'incomplete' || sub.status === 'incomplete_expired') {
    needsAction = 'checkout';
  } else if (sub.status === 'paused') {
    needsAction = 'checkout';
  }

  return NextResponse.json({
    data: {
      planId: plan?.id ?? sub.plan_id,
      planName: plan?.name ?? null,
      priceMonthly: plan?.price_monthly_eur ?? null,
      status: sub.status,
      currentPeriodEnd: periodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      trialEnd: trialEnd?.toISOString() ?? null,
      trialExpired,
      isExempt: !!sub.is_exempt_from_billing,
      hasStripeCustomer: !!sub.stripe_customer_id,
      hasStripeSubscription: !!sub.stripe_subscription_id,
      accessGrantedUntil,
      needsAction,
    },
  });
}
