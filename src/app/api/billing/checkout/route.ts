import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/billing/stripe';
import {
  requireStripePriceId,
  StripeConfigError,
  type StripePlanId,
} from '@/lib/billing/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// POST /api/billing/checkout — Crée une Stripe Checkout Session
// -------------------------------------------------------------------------
// Body : { planId: 'starter' | 'growth' | 'enterprise' }
//
// Plans acceptés pour checkout self-service :
//   'starter'    → STRIPE_STARTER_PRICE_ID    (74,99 EUR HT/mois)
//   'growth'     → STRIPE_MEDIUM_PRICE_ID     (149,99 EUR HT/mois, "Medium")
//   'enterprise' → STRIPE_ENTERPRISE_PRICE_ID (299,99 EUR HT/mois, "Illimité")
//
// Plans REFUSÉS :
//   autres       → 400 unknown_plan
//   déjà exempt  → 403 exempt
//   non-admin    → 403 forbidden
//
// Les Price IDs sont lus depuis les env vars via requireStripePriceId(),
// avec validation de format. Erreur claire si manquant ou mal formé.
// =========================================================================

export const runtime = 'nodejs';

const CHECKOUTABLE_PLANS = new Set<StripePlanId>(['starter', 'growth', 'enterprise']);

export async function POST(req: NextRequest) {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Seul un admin peut souscrire.' },
      { status: 403 },
    );
  }

  const { planId } = (await req.json().catch(() => ({}))) as {
    planId?: string;
  };

  if (!planId) {
    return NextResponse.json({ error: 'missing_plan' }, { status: 400 });
  }

  // 1) Plans supportés pour checkout self-service ?
  if (!CHECKOUTABLE_PLANS.has(planId as StripePlanId)) {
    return NextResponse.json(
      {
        error: 'unknown_plan',
        message: `Plan "${planId}" non éligible au checkout self-service.`,
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');

  // 3) Orgs exemptes (fondateurs/partenaires) : jamais de checkout.
  const { data: exemptCheck } = await admin
    .from('subscriptions')
    .select('is_exempt_from_billing')
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (exemptCheck?.is_exempt_from_billing) {
    return NextResponse.json(
      {
        error: 'exempt',
        message: 'Cette organisation n\'est pas soumise à facturation.',
      },
      { status: 403 },
    );
  }

  // 4) Résout le Price ID depuis env vars. Erreur claire si absent/mal formé.
  let priceId: string;
  try {
    priceId = requireStripePriceId(planId as StripePlanId);
  } catch (e) {
    if (e instanceof StripeConfigError) {
      // Log côté serveur pour l'ops, réponse générique côté client
      // (on ne fuit pas le nom d'env manquante à l'utilisateur final,
      // mais on la garde dans les logs Vercel).
      console.error(
        `[billing/checkout] ${e.envVar} ${e.kind} — plan=${planId}`,
      );
      return NextResponse.json(
        {
          error: 'stripe_not_configured',
          message:
            'Le paiement n\'est pas encore configuré côté serveur. Écris à contact@centrium-platform.com — on te débloque en quelques minutes.',
        },
        { status: 503 },
      );
    }
    throw e;
  }

  // 5) Récupère / crée le customer Stripe.
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = sub?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.user.email || undefined,
      metadata: { organization_id: ctx.organizationId },
    });
    customerId = customer.id;
    await admin.from('subscriptions').upsert(
      {
        organization_id: ctx.organizationId,
        plan_id: 'free',
        status: 'incomplete',
        stripe_customer_id: customerId,
      },
      { onConflict: 'organization_id' },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    subscription_data: {
      metadata: { organization_id: ctx.organizationId, plan_id: planId },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return NextResponse.json({ url: session.url });
}
