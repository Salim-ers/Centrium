import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/billing/stripe';
import { requireOrg } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// POST /api/billing/cancel
// -------------------------------------------------------------------------
// Annule la subscription active côté Stripe en mode "cancel at period end".
// Le user garde l'accès jusqu'à current_period_end ; le webhook
// customer.subscription.updated puis .deleted synchronisent la DB.
//
// Auth : admin uniquement (les autres rôles ne gèrent pas la subscription
// pour l'org). is_exempt_from_billing → 400 ("comptes exemptés n'ont pas
// de subscription Stripe à annuler").
//
// Réponse succès : { data: { cancel_at_period_end: true, period_end } }
// =========================================================================

export const runtime = 'nodejs';

export async function POST() {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient('billing-cancel');
  const { data: sub } = await admin
    .from('subscriptions')
    .select(
      'stripe_subscription_id, is_exempt_from_billing, status, trial_end, current_period_end',
    )
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();

  if (sub?.is_exempt_from_billing) {
    return NextResponse.json(
      { error: 'exempt', message: 'Compte exempté de facturation.' },
      { status: 400 },
    );
  }

  if (!sub) {
    return NextResponse.json(
      { error: 'no_active_subscription', message: 'Aucune subscription active à annuler.' },
      { status: 400 },
    );
  }

  // --- Cas essai / abonnement provisionné SANS Stripe (aucune carte) --------
  // Ces comptes (créés via la super console, ou essai posé sans checkout) n'ont
  // pas de subscription Stripe à annuler. On résilie directement en base : on
  // pose cancel_at_period_end=true et on garde l'accès jusqu'à la fin d'essai /
  // période. Aucune carte à débiter → l'accès tombe simplement à l'échéance.
  if (!sub.stripe_subscription_id) {
    const now = new Date();
    const trialEnd = sub.trial_end ? new Date(sub.trial_end) : null;
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
    const accessEnd =
      trialEnd && trialEnd > now ? trialEnd : periodEnd && periodEnd > now ? periodEnd : null;

    const { error: updErr } = await admin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        // Pas d'échéance future → on coupe tout de suite (statut canceled).
        ...(accessEnd ? {} : { status: 'canceled' }),
      })
      .eq('organization_id', ctx.organizationId);

    if (updErr) {
      return NextResponse.json(
        { error: 'db_error', message: updErr.message },
        { status: 500 },
      );
    }
    return NextResponse.json({
      data: {
        cancel_at_period_end: true,
        current_period_end: accessEnd?.toISOString() ?? null,
      },
    });
  }

  const stripe = getStripe();
  try {
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    // Cast pour timestamp (SDK types drift).
    const s = updated as typeof updated & { current_period_end?: number };
    return NextResponse.json({
      data: {
        cancel_at_period_end: true,
        current_period_end: s.current_period_end
          ? new Date(s.current_period_end * 1000).toISOString()
          : null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'stripe_error';
    return NextResponse.json({ error: 'stripe_error', message: msg }, { status: 500 });
  }
}
