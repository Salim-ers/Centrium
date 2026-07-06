import { NextResponse } from 'next/server';

import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/billing/stripe';
import { isStripeLiveMode, type StripePlanId } from '@/lib/billing/config';

// =========================================================================
// POST /api/admin/stripe-setup-prices — Crée les prix Stripe en LIVE.
// -------------------------------------------------------------------------
// Fondateur only. Pour chaque plan (starter/growth/enterprise) :
//   - si plans.stripe_price_id est DÉJÀ un prix live du bon montant → skip
//   - sinon crée un Produit + Prix récurrent mensuel LIVE (montant lu dans
//     plans.price_monthly_eur) et écrit l'ID dans plans.stripe_price_id
//
// Le checkout résout le prix depuis plans.stripe_price_id (resolve-price.ts)
// → aucune variable Vercel à changer, aucun redéploiement. Idempotent.
//
// Garde-fou : refuse si la clé secrète est en mode TEST (créer des prix test
// n'aiderait pas à passer en réel).
// =========================================================================

export const runtime = 'nodejs';

const PLANS: StripePlanId[] = ['starter', 'growth', 'enterprise'];

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
    .select('id, name, price_monthly_eur, stripe_price_id')
    .in('id', PLANS);

  const byId = new Map((plans ?? []).map((p) => [p.id as string, p]));
  const results: Record<string, unknown> = {};

  for (const planId of PLANS) {
    const plan = byId.get(planId);
    if (!plan) {
      results[planId] = { status: 'plan_missing' };
      continue;
    }
    const amountCents = Math.round(Number(plan.price_monthly_eur) * 100);
    if (!amountCents || amountCents < 0) {
      results[planId] = { status: 'invalid_amount' };
      continue;
    }

    // Déjà un prix live du bon montant ? → on ne recrée pas.
    const currentId = plan.stripe_price_id as string | null;
    if (currentId) {
      try {
        const existing = await stripe.prices.retrieve(currentId);
        if (existing.livemode && existing.unit_amount === amountCents && existing.recurring) {
          results[planId] = { status: 'already_live', priceId: currentId };
          continue;
        }
      } catch {
        /* introuvable (prix test avec clé live) → on crée un prix live */
      }
    }

    try {
      // Produit + prix récurrent mensuel en une fois.
      const price = await stripe.prices.create({
        currency: 'eur',
        unit_amount: amountCents,
        recurring: { interval: 'month' },
        product_data: { name: `Centrium ${plan.name}` },
        metadata: { plan_id: planId },
      });
      await admin.from('plans').update({ stripe_price_id: price.id }).eq('id', planId);
      results[planId] = {
        status: 'created',
        priceId: price.id,
        amount: amountCents / 100,
      };
    } catch (e) {
      results[planId] = {
        status: 'error',
        message: e instanceof Error ? e.message : 'create_failed',
      };
    }
  }

  const createdOrOk = Object.values(results).every(
    (r) => ['created', 'already_live'].includes((r as { status: string }).status),
  );

  return NextResponse.json({
    data: {
      ok: createdOrOk,
      results,
      message: createdOrOk
        ? 'Prix LIVE en place. Les vrais paiements sont opérationnels.'
        : 'Certains prix n\'ont pas pu être créés — voir le détail.',
    },
  });
}
