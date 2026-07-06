import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireStripePriceId, type StripePlanId } from './config';

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

export async function resolveStripePriceId(planId: StripePlanId): Promise<string> {
  try {
    const admin = createAdminClient('cross-org-query');
    const { data } = await admin
      .from('plans')
      .select('stripe_price_id')
      .eq('id', planId)
      .maybeSingle();
    const id = data?.stripe_price_id as string | null | undefined;
    if (id && PRICE_ID_RE.test(id)) return id;
  } catch {
    /* DB indisponible → fallback env */
  }
  return requireStripePriceId(planId);
}
