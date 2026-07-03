import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/billing/stripe';
import { requireOrg } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// POST /api/billing/reactivate
// -------------------------------------------------------------------------
// Ré-active une subscription qui a été mise en cancel_at_period_end=true
// mais qui n'est pas encore terminée (current_period_end > now).
// Simplement : `cancel_at_period_end=false` côté Stripe.
//
// Pour ressusciter une subscription déjà "canceled" (post-period_end), il
// faut repasser par Checkout — cette route retourne 400 dans ce cas.
// =========================================================================

export const runtime = 'nodejs';

export async function POST() {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient('billing-reactivate');
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, status, cancel_at_period_end, is_exempt_from_billing')
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();

  if (sub?.is_exempt_from_billing) {
    return NextResponse.json(
      { error: 'exempt', message: 'Compte exempté de facturation.' },
      { status: 400 },
    );
  }

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json(
      {
        error: 'no_subscription',
        message:
          'Aucune subscription active. Reprends un abonnement via la page /billing.',
      },
      { status: 400 },
    );
  }

  if (!sub.cancel_at_period_end) {
    return NextResponse.json(
      { error: 'not_canceled', message: 'La subscription n\'est pas en cours d\'annulation.' },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    return NextResponse.json({ data: { reactivated: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'stripe_error';
    return NextResponse.json({ error: 'stripe_error', message: msg }, { status: 500 });
  }
}
