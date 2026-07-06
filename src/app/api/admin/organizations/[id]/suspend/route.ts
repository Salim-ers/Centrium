import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { getStripe } from '@/lib/billing/stripe';

// =========================================================================
// POST /api/admin/organizations/:id/suspend — Suspend l'accès d'une org.
// -------------------------------------------------------------------------
// Oversight fondateur (super console) : coupe l'accès d'un compte (essai
// non validé, abus…) SANS supprimer ses données (contrairement à DELETE).
//   - annule l'abonnement Stripe (immédiat, best-effort) → aucun débit
//   - passe la sub en 'canceled' → le middleware bloque l'accès
//   - refuse une org exemptée (protège le compte fondateur/interne)
// Réversible côté client : le prospect peut se reconnecter et re-souscrire
// depuis /billing (ou vous supprimez l'org définitivement).
// =========================================================================

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getSuperAdminContext();
  if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const orgId = params.id;
  const admin = createAdminClient('billing-cancel');

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, is_exempt_from_billing, status')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (sub.is_exempt_from_billing) {
    return NextResponse.json(
      {
        error: 'exempt_protected',
        message: 'Organisation exemptée (compte fondateur/interne) — non suspendable ici.',
      },
      { status: 400 },
    );
  }

  // Annulation Stripe immédiate (best-effort — ne bloque pas la suspension).
  if (sub.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
    } catch {
      /* déjà annulée / test / inexistante — on continue */
    }
  }

  // Bloque l'accès côté app : 'canceled' sans period_end futur → deny par
  // la matrice (lib/billing/access.ts). Le webhook posera aussi 'canceled'.
  const { error: updErr } = await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      current_period_end: null,
      trial_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId);
  if (updErr) {
    return NextResponse.json({ error: 'suspend_failed', message: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: { suspended: true } });
}
