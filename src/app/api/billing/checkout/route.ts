import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// POST /api/billing/checkout — Crée une Stripe Checkout Session
// -------------------------------------------------------------------------
// Body : { planId: 'starter' | 'pro' }
// - Vérifie que le plan existe et a un stripe_price_id
// - Récupère ou crée le customer Stripe pour l'org
// - Retourne { url } (redirect vers Stripe Checkout)
// =========================================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { planId, cycle } = (await req.json().catch(() => ({}))) as {
    planId?: string;
    cycle?: 'monthly' | 'yearly';
  };

  if (!planId) {
    return NextResponse.json({ error: 'missing_plan' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Les orgs fondateurs / partenaires sont exemptées — aucun checkout possible.
  const { data: exemptCheck } = await admin
    .from('subscriptions')
    .select('is_exempt_from_billing')
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (exemptCheck?.is_exempt_from_billing) {
    return NextResponse.json(
      { error: 'exempt', message: 'Cette organisation n\'est pas soumise à facturation.' },
      { status: 403 },
    );
  }

  // Récupère le plan + price_id
  const { data: plan } = await admin
    .from('plans')
    .select('id, name, stripe_price_id, stripe_price_yearly_id')
    .eq('id', planId)
    .single();

  if (!plan) {
    return NextResponse.json({ error: 'plan_not_found' }, { status: 404 });
  }

  const priceId = cycle === 'yearly' ? plan.stripe_price_yearly_id : plan.stripe_price_id;
  if (!priceId) {
    return NextResponse.json(
      {
        error: 'plan_not_configured',
        message: `Plan "${plan.name}" non lié à Stripe. Ajoute stripe_price_id dans la table plans.`,
      },
      { status: 400 },
    );
  }

  // Récupère / crée le customer Stripe de l'org
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
    await admin
      .from('subscriptions')
      .upsert(
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
    // metadata sur la subscription → retrouvé dans le webhook
    subscription_data: {
      metadata: { organization_id: ctx.organizationId, plan_id: plan.id },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return NextResponse.json({ url: session.url });
}
