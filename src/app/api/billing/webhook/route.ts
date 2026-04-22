import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// POST /api/billing/webhook — Source de vérité côté serveur
// -------------------------------------------------------------------------
// Stripe envoie tous les événements liés aux subscriptions. On met à jour
// la table `subscriptions` en conséquence.
//
// En local :
//   stripe listen --forward-to localhost:3000/api/billing/webhook
//   copie le `whsec_...` dans STRIPE_WEBHOOK_SECRET
//
// En prod : configure le endpoint dans Stripe Dashboard → Webhooks
// =========================================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'webhook_secret_missing', message: 'STRIPE_WEBHOOK_SECRET non configuré.' },
      { status: 500 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] invalid signature', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Le user a fini le checkout. On récupère la subscription associée.
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription(admin, sub);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(admin, sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from('subscriptions')
          .update({
            status: 'canceled',
            plan_id: 'free',
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.payment_failed': {
        // Stripe SDK types changent : on lit le champ en safe-cast.
        const inv = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subRef = inv.subscription;
        if (subRef) {
          const subId = typeof subRef === 'string' ? subRef : subRef.id;
          await admin
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId);
        }
        break;
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error', err);
    // On return 200 pour éviter que Stripe retente à l'infini sur une erreur idempotente ;
    // mais on log tout.
  }

  return NextResponse.json({ received: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function upsertSubscription(admin: AdminClient, sub: Stripe.Subscription) {
  const organizationId = sub.metadata?.organization_id;
  if (!organizationId) {
    console.warn('[stripe/webhook] subscription without organization_id metadata', sub.id);
    return;
  }

  // Trouve le plan correspondant au price Stripe
  const priceId = sub.items.data[0]?.price.id;
  let planId = sub.metadata?.plan_id ?? 'free';
  if (priceId) {
    const { data: plan } = await admin
      .from('plans')
      .select('id')
      .or(`stripe_price_id.eq.${priceId},stripe_price_yearly_id.eq.${priceId}`)
      .maybeSingle();
    if (plan) planId = plan.id;
  }

  // Stripe SDK types peuvent varier : on cast pour accéder aux timestamps.
  const s = sub as Stripe.Subscription & {
    current_period_end?: number;
    trial_end?: number | null;
  };

  await admin.from('subscriptions').upsert(
    {
      organization_id: organizationId,
      plan_id: planId,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_end: s.current_period_end
        ? new Date(s.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      trial_end: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  );
}
