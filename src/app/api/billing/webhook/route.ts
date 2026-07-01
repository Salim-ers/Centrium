import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import {
  priceIdToPlanId,
  requireStripeWebhookSecret,
  StripeConfigError,
} from '@/lib/billing/config';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// POST /api/billing/webhook — Source de vérité pour l'état des abonnements
// -------------------------------------------------------------------------
// Stripe pousse tous les événements liés aux subscriptions ici. On maintient
// la table `subscriptions` en synchro parfaite (status, period_end,
// cancel_at_period_end, plan_id).
//
// EVENTS COUVERTS (cycle complet subscribe → renouvellement → cancel → lapse
// → optionnel resub) :
//   - checkout.session.completed              — premier paiement OK
//   - customer.subscription.created           — sub créée côté Stripe
//   - customer.subscription.updated           — plan change, cancel-at-period
//                                              -end flip, period rollover
//   - customer.subscription.deleted           — fin réelle de la sub
//   - customer.subscription.paused / .resumed — pause_collection lifecycle
//   - customer.subscription.trial_will_end    — 3j avant fin de trial
//                                              (log, TODO email)
//   - invoice.paid / invoice.payment_succeeded — renouvellement OK, on
//                                              rebasculte past_due→active
//                                              proactivement
//   - invoice.payment_failed                  — passage past_due
//
// L'access-control (middleware) lit status + current_period_end. Le webhook
// est la seule source d'écriture, jamais le client.
//
// En local :
//   stripe listen --forward-to localhost:3000/api/billing/webhook
//   copie le `whsec_...` dans STRIPE_WEBHOOK_SECRET
//
// En prod : Stripe Dashboard → Webhooks → endpoint sur /api/billing/webhook
// =========================================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let webhookSecret: string;
  try {
    webhookSecret = requireStripeWebhookSecret();
  } catch (e) {
    if (e instanceof StripeConfigError) {
      console.error(`[stripe/webhook] ${e.envVar} ${e.kind}`);
      return NextResponse.json(
        { error: 'webhook_secret_missing', message: 'Webhook non configuré.' },
        { status: 500 },
      );
    }
    throw e;
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] invalid signature', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const admin = createAdminClient('webhook');

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
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
        // Fin réelle de la subscription (soit résiliation immédiate, soit
        // arrivée au bout de la période post-cancel_at_period_end).
        // On ne slam PAS plan_id='free' : le middleware bloque déjà sur
        // status='canceled' + current_period_end<now. Garder le plan_id
        // permet à l'UI d'afficher "Ancien plan : Medium" et de proposer
        // un re-abonnement au même tier.
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from('subscriptions')
          .update({
            status: 'canceled',
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            // On ne touche PAS current_period_end : Stripe l'a laissé sur
            // la dernière période payée, ça sert au middleware pour la
            // règle "canceled+expired = deny".
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.paused': {
        // pause_collection activée. On persiste status='paused' pour que le
        // middleware bloque immédiatement (comportement voulu : pas de
        // gratuité muette pendant une pause).
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from('subscriptions')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.resumed': {
        // Reprise après pause : ressynchro complète depuis Stripe (status,
        // period_end, tout).
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(admin, sub);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Fire 3 jours avant trial_end. Pour l'instant : log seulement.
        // TODO : envoyer un email transactionnel via Resend (template
        // trial_ending.html) — cf. supabase/templates/ pour le style.
        const sub = event.data.object as Stripe.Subscription;
        console.info(
          '[stripe/webhook] trial_will_end for org',
          sub.metadata?.organization_id,
          'trial_end',
          sub.trial_end && new Date(sub.trial_end * 1000).toISOString(),
        );
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        // Renouvellement mensuel réussi. subscription.updated va suivre,
        // mais on force ici un status='active' au cas où une facture
        // arriverait après un flip past_due (rétablissement automatique).
        const inv = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subRef = inv.subscription;
        if (subRef) {
          const subId = typeof subRef === 'string' ? subRef : subRef.id;
          // Re-fetch depuis Stripe pour avoir current_period_end à jour.
          try {
            const sub = await stripe.subscriptions.retrieve(subId);
            await upsertSubscription(admin, sub);
          } catch (e) {
            console.warn('[stripe/webhook] invoice.paid retrieve failed', e);
            // Fallback : au moins on ne bloque pas past_due
            await admin
              .from('subscriptions')
              .update({ status: 'active', updated_at: new Date().toISOString() })
              .eq('stripe_subscription_id', subId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Le paiement de renouvellement a échoué. Stripe va retenter (par
        // défaut smart retries). On flag past_due dans notre DB ; middleware
        // bloque immédiatement. Si le retry passe, invoice.paid remettra
        // status='active'. Sinon Stripe finit par emit
        // customer.subscription.deleted (dunning terminal).
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
    console.error('[stripe/webhook] handler error', event.type, err);
    // On return 200 pour éviter les retries infinis Stripe sur une erreur
    // idempotente. Tout est loggé pour investigation post-mortem.
  }

  return NextResponse.json({ received: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function upsertSubscription(admin: AdminClient, sub: Stripe.Subscription) {
  const organizationId = sub.metadata?.organization_id;
  if (!organizationId) {
    console.warn(
      '[stripe/webhook] subscription without organization_id metadata',
      sub.id,
    );
    return;
  }

  // Résout notre plan_id local depuis le Price Stripe. 3 sources en ordre
  // de priorité :
  //   1. Env var mapping (STRIPE_STARTER_PRICE_ID / STRIPE_MEDIUM_PRICE_ID)
  //      — source de vérité pour les Prices courants.
  //   2. plans.stripe_price_id / plans.stripe_price_yearly_id — fallback
  //      pour les Prices legacy (anciens tarifs d'abonnés historiques).
  //   3. sub.metadata.plan_id — dernier fallback ; défini à la création
  //      via checkout.session.create.
  const priceId = sub.items.data[0]?.price.id;
  let planId = sub.metadata?.plan_id ?? 'free';
  if (priceId) {
    const envMapped = priceIdToPlanId(priceId);
    if (envMapped) {
      planId = envMapped;
    } else {
      const { data: plan } = await admin
        .from('plans')
        .select('id')
        .or(`stripe_price_id.eq.${priceId},stripe_price_yearly_id.eq.${priceId}`)
        .maybeSingle();
      if (plan) planId = plan.id;
    }
  }

  // Cast safe pour les timestamps (SDK types drift entre versions).
  const s = sub as Stripe.Subscription & {
    current_period_end?: number;
    trial_end?: number | null;
  };

  await admin.from('subscriptions').upsert(
    {
      organization_id: organizationId,
      plan_id: planId,
      stripe_customer_id:
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
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
