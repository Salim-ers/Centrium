import { NextResponse } from 'next/server';

import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/billing/stripe';
import { isStripeLiveMode } from '@/lib/billing/config';
import { SELF_SERVICE_PLAN_IDS } from '@/lib/billing/plans';

// =========================================================================
// POST /api/admin/stripe-setup-prices — Crée les prix Stripe en LIVE.
// -------------------------------------------------------------------------
// Fondateur only. Pour chaque offre V2 souscriptible (Starter, Team,
// Growth) : un Produit, un Prix mensuel (plans.price_monthly_eur) et un
// Prix annuel (plans.price_yearly_eur), écrits dans plans.stripe_price_id
// et plans.stripe_price_yearly_id. Un prix déjà live au bon montant n'est
// pas recréé (idempotent).
//
// Le checkout résout le prix depuis la table plans (resolve-price.ts) :
// aucune variable Vercel à changer, aucun redéploiement.
//
// Garde-fou : refuse si la clé secrète est en mode TEST.
// =========================================================================

export const runtime = 'nodejs';

type Result = { status: string; priceId?: string; amount?: number; message?: string };

export async function POST() {
  const ctx = await getSuperAdminContext();
  if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (!isStripeLiveMode()) {
    return NextResponse.json(
      {
        error: 'not_live',
        message:
          "La clé secrète du serveur est en TEST. Mets d'abord STRIPE_SECRET_KEY = sk_live_… sur Vercel et redéploie, puis relance la création des prix.",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');
  const stripe = getStripe();

  const { data: plans } = await admin
    .from('plans')
    .select('id, name, price_monthly_eur, price_yearly_eur, stripe_price_id, stripe_price_yearly_id')
    .in('id', [...SELF_SERVICE_PLAN_IDS]);

  const byId = new Map((plans ?? []).map((p) => [p.id as string, p]));
  const results: Record<string, { month: Result; year: Result }> = {};

  /** Prix live existant au bon montant et à la bonne périodicité ? */
  async function reusable(priceId: string | null, cents: number, interval: 'month' | 'year') {
    if (!priceId) return null;
    try {
      const p = await stripe.prices.retrieve(priceId);
      if (p.livemode && p.unit_amount === cents && p.recurring?.interval === interval) return p;
    } catch {
      /* introuvable (prix test avec clé live) → recréé */
    }
    return null;
  }

  for (const planId of SELF_SERVICE_PLAN_IDS) {
    const plan = byId.get(planId);
    if (!plan) {
      results[planId] = { month: { status: 'plan_missing' }, year: { status: 'plan_missing' } };
      continue;
    }
    const out: { month: Result; year: Result } = { month: { status: 'pending' }, year: { status: 'pending' } };
    let productId: string | null = null;

    for (const interval of ['month', 'year'] as const) {
      const eur = interval === 'month' ? Number(plan.price_monthly_eur) : Number(plan.price_yearly_eur);
      const cents = Math.round(eur * 100);
      if (!cents || cents < 0) {
        out[interval] = { status: interval === 'year' ? 'no_yearly_price' : 'invalid_amount' };
        continue;
      }
      const column = interval === 'month' ? 'stripe_price_id' : 'stripe_price_yearly_id';
      const existing = await reusable((plan[column] as string | null) ?? null, cents, interval);
      if (existing) {
        productId = productId ?? (typeof existing.product === 'string' ? existing.product : existing.product.id);
        out[interval] = { status: 'already_live', priceId: existing.id };
        continue;
      }
      try {
        const price = await stripe.prices.create({
          currency: 'eur',
          unit_amount: cents,
          recurring: { interval },
          ...(productId ? { product: productId } : { product_data: { name: `Centrium ${plan.name}` } }),
          metadata: { plan_id: planId, interval },
        });
        productId = productId ?? (typeof price.product === 'string' ? price.product : price.product.id);
        await admin.from('plans').update({ [column]: price.id }).eq('id', planId);
        out[interval] = { status: 'created', priceId: price.id, amount: cents / 100 };
      } catch (e) {
        out[interval] = { status: 'error', message: e instanceof Error ? e.message : 'create_failed' };
      }
    }
    results[planId] = out;
  }

  const ok = Object.values(results).every((r) =>
    (['month', 'year'] as const).every((i) => ['created', 'already_live', 'no_yearly_price'].includes(r[i].status)),
  );

  return NextResponse.json({
    data: {
      ok,
      results,
      message: ok ? 'Prix LIVE en place (mensuels et annuels). Les vrais paiements sont opérationnels.' : 'Certains prix n\'ont pas pu être créés — voir le détail.',
    },
  });
}
