import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { StripeConfigError, requireStripePriceId, type StripePlanId } from './config';
import type { BillingInterval } from './plans';

// =========================================================================
// Résolution du Stripe Price ID d'un plan — SOURCE PILOTABLE SANS REDEPLOY.
// -------------------------------------------------------------------------
// Priorité :
//   1. plans.stripe_price_id en base (écrit par /api/admin/stripe-setup-prices
//      lors du passage en live) → permet de changer les prix sans toucher
//      aux variables Vercel.
//   2. Variable d'environnement STRIPE_*_PRICE_ID (compat historique).
//
// Le mode (test/live) du prix DOIT correspondre à celui de la clé secrète —
// sinon Stripe renvoie « No such price » (cf. diagnostic stripe-status).
// =========================================================================

const PRICE_ID_RE = /^price_[A-Za-z0-9]+$/;

export async function resolveStripePriceId(planId: StripePlanId, interval: BillingInterval = 'month'): Promise<string> {
  try {
    const admin = createAdminClient('cross-org-query');
    const { data } = await admin
      .from('plans')
      .select('stripe_price_id, stripe_price_yearly_id')
      .eq('id', planId)
      .maybeSingle();
    const id = (interval === 'year' ? data?.stripe_price_yearly_id : data?.stripe_price_id) as string | null | undefined;
    if (id && PRICE_ID_RE.test(id)) return id;
  } catch {
    /* DB indisponible → fallback env */
  }
  // Pas de variable d'environnement pour l'annuel : prix créé en base uniquement.
  if (interval === 'year') throw new StripeConfigError(`plans.stripe_price_yearly_id (${planId})`, 'missing');
  return requireStripePriceId(planId);
}
