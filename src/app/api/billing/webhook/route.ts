import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import {
  priceIdToPlanId,
  requireStripeWebhookSecret,
  StripeConfigError,
} from '@/lib/billing/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logger';

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
//                                              (email Resend aux admins org)
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
      logger.error(`[stripe/webhook] ${e.envVar} ${e.kind}`);
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
    logger.error('[stripe/webhook] invalid signature', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const admin = createAdminClient('webhook');

  // Idempotence : si cet event a déjà été traité, on acquitte sans rejouer
  // (Stripe peut renvoyer le même event plusieurs fois).
  const { data: already } = await admin
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();
  if (already) {
    return NextResponse.json({ received: true, duplicate: true });
  }

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
        // Fire 3 jours avant trial_end → email aux admins de l'org avec
        // CTA vers /billing (choisir un plan avant la coupure d'accès).
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organization_id;
        const trialEndIso = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;
        logger.info('[stripe/webhook] trial_will_end for org', { orgId, trialEnd: trialEndIso });
        if (orgId) {
          const [{ data: org }, { data: admins }] = await Promise.all([
            admin.from('organizations').select('name, brand_name').eq('id', orgId).maybeSingle(),
            admin
              .from('profiles')
              .select('email')
              .eq('organization_id', orgId)
              .eq('role', 'admin'),
          ]);
          const orgName = org?.brand_name ?? org?.name ?? 'ton organisation';
          const emails = (admins ?? [])
            .map((p) => p.email as string | null)
            .filter((e): e is string => !!e);
          const trialEndLabel = sub.trial_end
            ? new Date(sub.trial_end * 1000).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
              })
            : 'bientôt';
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrium-platform.com';
          if (emails.length > 0) {
            await sendEmail({
              to: emails,
              subject: `Ton essai Centrium se termine le ${trialEndLabel}`,
              paragraphs: [
                `Bonjour,`,
                `L'essai gratuit de ${orgName} sur Centrium se termine le ${trialEndLabel}. Après cette date, l'accès à la plateforme sera suspendu jusqu'au choix d'un abonnement.`,
                `Choisis ton plan en 2 minutes — tes données, consultants et documents restent intacts.`,
              ],
              cta: { label: 'Choisir mon abonnement', url: `${appUrl}/billing` },
              footnote: 'Une question ? Réponds simplement à cet email.',
            });
          }
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        // Renouvellement mensuel réussi. subscription.updated va suivre,
        // mais on force ici un status='active' au cas où une facture
        // arriverait après un flip past_due (rétablissement automatique).
        const inv = event.data.object as Stripe.Invoice;
        const subId = invoiceSubscriptionId(inv);
        if (subId) {
          // Re-fetch depuis Stripe pour avoir current_period_end à jour.
          try {
            const sub = await stripe.subscriptions.retrieve(subId);
            await upsertSubscription(admin, sub);
          } catch (e) {
            logger.warn('[stripe/webhook] invoice.paid retrieve failed', e);
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
        const inv = event.data.object as Stripe.Invoice;
        const subId = invoiceSubscriptionId(inv);
        if (subId) {
          await admin
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId);
        }
        break;
      }
    }
  } catch (err) {
    logger.error('[stripe/webhook] handler error', { eventType: event.type, err });
    // On renvoie 500 pour que Stripe RETENTE l'événement : un abonné qui a
    // payé ne doit jamais être perdu sur une erreur DB transitoire. L'event
    // n'est PAS marqué traité → le retry le rejouera (handlers idempotents).
    return NextResponse.json(
      { error: 'handler_failed', message: (err as Error).message },
      { status: 500 },
    );
  }

  // Marque l'event comme traité (idempotence des futurs retries Stripe).
  const { error: markErr } = await admin
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, type: event.type });
  if (markErr && markErr.code !== '23505') {
    logger.warn('[stripe/webhook] could not record event id', markErr.message);
  }

  return NextResponse.json({ received: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Résout l'ID de souscription d'une facture, robuste au changement d'API
 * Stripe : `invoice.subscription` (ancien) OU
 * `invoice.parent.subscription_details.subscription` (nouveau, ≥ 2025).
 */
function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const legacy = (inv as unknown as { subscription?: string | { id: string } | null })
    .subscription;
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id;
  const parent = (inv as unknown as {
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } };
  }).parent;
  const nested = parent?.subscription_details?.subscription;
  if (nested) return typeof nested === 'string' ? nested : nested.id;
  return null;
}

async function upsertSubscription(admin: AdminClient, sub: Stripe.Subscription) {
  const organizationId = sub.metadata?.organization_id;
  if (!organizationId) {
    logger.warn(
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
