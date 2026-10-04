import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/billing/stripe';
import {
  StripeConfigError,
  type StripePlanId,
} from '@/lib/billing/config';
import { resolveStripePriceId } from '@/lib/billing/resolve-price';
import { isSelfServicePlan, type BillingInterval } from '@/lib/billing/plans';
import { resolveTax } from '@/lib/billing/tax';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';

// =========================================================================
// POST /api/billing/checkout — Crée une Stripe Checkout Session
// -------------------------------------------------------------------------
// Body : { planId: 'v2_starter' | 'v2_team' | 'v2_growth', interval?: 'month' | 'year', ui?: 'embedded' }
//
// ui='embedded' → session ui_mode 'embedded' + redirect_on_completion
// 'never' : le formulaire de paiement Stripe s'affiche DANS l'app
// (dialog /billing) au lieu d'une redirection plein écran. Réponse :
// { client_secret }. Sans ui → flow hosted historique { url } (fallback
// si la clé publique n'est pas dispo côté client).
//
// Plans acceptés pour checkout self-service (V2, migration 099) :
//   v2_starter 49 € · v2_team 99 € · v2_growth 179 € HT/mois, ou annuel
//   (10 mois facturés). Scale et les offres historiques ne se souscrivent
//   pas en ligne ; un abonné historique peut passer sur une offre V2.
//
// Plans REFUSÉS :
//   autres       → 400 unknown_plan
//   déjà exempt  → 403 exempt
//   non-admin    → 403 forbidden
//
// Price IDs lus dans la table plans (créés depuis la super-console).
// =========================================================================

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Seul un admin peut souscrire.' },
      { status: 403 },
    );
  }

  const { planId, ui, interval: rawInterval } = (await req.json().catch(() => ({}))) as {
    planId?: string;
    ui?: string;
    interval?: string;
  };
  const interval: BillingInterval = rawInterval === 'year' ? 'year' : 'month';

  if (!planId) {
    return NextResponse.json({ error: 'missing_plan' }, { status: 400 });
  }

  // 1) Plans supportés pour checkout self-service ?
  if (!isSelfServicePlan(planId)) {
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
    priceId = await resolveStripePriceId(planId as StripePlanId, interval);
  } catch (e) {
    if (e instanceof StripeConfigError) {
      // Log côté serveur pour l'ops, réponse générique côté client
      // (on ne fuit pas le nom d'env manquante à l'utilisateur final,
      // mais on la garde dans les logs Vercel).
      logger.error(
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

  // 5) Customer + session Stripe — TOUT le bloc est gardé : une clé
  // manquante (getStripe → StripeConfigError) ou une erreur API Stripe
  // renvoyait un 500 HTML Next → res.json() côté client levait en
  // silence → « je clique sur Souscrire et rien ne se passe ».
  try {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status, plan_id')
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();

    const stripe = getStripe();

    // ── CHANGEMENT DE PLAN ────────────────────────────────────────────────
    // Une souscription Stripe active existe déjà → on la MODIFIE en place
    // (prorata) au lieu d'ouvrir un nouveau checkout. Sans ça, chaque
    // changement de plan créait une 2e souscription sur le même client =
    // DOUBLE DÉBIT mensuel (bug critique corrigé).
    const ACTIVE = new Set(['active', 'trialing', 'past_due']);
    if (sub?.stripe_subscription_id && ACTIVE.has(sub.status ?? '')) {
      const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const itemId = current.items.data[0]?.id;
      // Même prix (même plan ET même périodicité) → rien à changer.
      if (current.items.data[0]?.price?.id === priceId) {
        return NextResponse.json(
          { error: 'same_plan', message: 'Vous êtes déjà sur ce plan.' },
          { status: 400 },
        );
      }
      if (!itemId) {
        throw new Error('subscription sans item — impossible de changer de plan');
      }
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: { organization_id: ctx.organizationId, plan_id: planId, interval },
      });
      // La DB sera confirmée par le webhook customer.subscription.updated ;
      // on écrit tout de suite le plan pour un retour UI immédiat.
      await admin
        .from('subscriptions')
        .update({ plan_id: planId, updated_at: new Date().toISOString() })
        .eq('organization_id', ctx.organizationId);
      logger.info(`[billing/checkout] plan change ${sub.plan_id}→${planId} org=${ctx.organizationId}`);
      return NextResponse.json({ updated: true, plan_id: planId });
    }

    // ── NOUVEL ABONNÉ : checkout classique ────────────────────────────────
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

    // TVA — deux modes exclusifs (voir resolveTax ci-dessous) :
    //   1. STRIPE_TAX_ENABLED=true → Stripe Tax (automatic_tax), pour un parc
    //      client varié (UE, hors-UE, autoliquidation). Nécessite Stripe Tax
    //      configuré au dashboard (payant).
    //   2. STRIPE_VAT_RATE_ID=txr_… → taux de TVA FIXE (gratuit), idéal pour
    //      des clients 100 % français à 20 %. On applique le taux comme
    //      default_tax_rates de l'abonnement.
    //   3. Aucun des deux → pas de TVA (prix débités tels quels).
    const { sessionTax, subscriptionTax, addressRequired } = resolveTax();
    const subscription_data = {
      metadata: { organization_id: ctx.organizationId, plan_id: planId, interval },
      ...subscriptionTax,
    };

    if (ui === 'embedded') {
      // Paiement DANS l'app : pas de success/cancel_url, pas de redirection —
      // le dialog écoute onComplete côté client puis rafraîchit l'abonnement
      // (le webhook Stripe met la DB à jour en parallèle).
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        ui_mode: 'embedded_page',
        redirect_on_completion: 'never',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data,
        allow_promotion_codes: true,
        billing_address_collection: addressRequired ? 'required' : 'auto',
        ...sessionTax,
      });
      return NextResponse.json({ client_secret: session.client_secret });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      subscription_data,
      allow_promotion_codes: true,
      billing_address_collection: addressRequired ? 'required' : 'auto',
      ...sessionTax,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (e instanceof StripeConfigError) {
      logger.error(`[billing/checkout] ${e.envVar} ${e.kind}`);
      return NextResponse.json(
        {
          error: 'stripe_not_configured',
          message:
            'Le paiement n\'est pas encore configuré côté serveur (clé Stripe manquante). Écris à contact@centrium-platform.com.',
        },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? e.message : 'Erreur Stripe inconnue';
    logger.error('[billing/checkout] stripe error', message);
    return NextResponse.json(
      { error: 'stripe_error', message: `Paiement indisponible : ${message}` },
      { status: 502 },
    );
  }
}
