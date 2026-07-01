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
  const ctx = await requireOrg();
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient('billing-cancel');
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, is_exempt_from_billing')
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
      { error: 'no_active_subscription', message: 'Aucune subscription active à annuler.' },
      { status: 400 },
    );
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
