import { NextResponse } from 'next/server';

import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { getStripe } from '@/lib/billing/stripe';
import { resolveStripePriceId } from '@/lib/billing/resolve-price';
import type { StripePlanId } from '@/lib/billing/config';
import { SELF_SERVICE_PLAN_IDS, type BillingInterval } from '@/lib/billing/plans';

// =========================================================================
// GET /api/admin/stripe-status — Diagnostic de configuration Stripe.
// -------------------------------------------------------------------------
// Réservé fondateur. Rapporte CE QUE LE SERVEUR VOIT réellement (les env
// vars du déploiement Vercel courant), SANS jamais exposer de secret :
//   - mode de la clé secrète (live / test / manquante) → c'est CE mode qui
//     détermine si le checkout affiche « Environnement de test »
//   - mode de la clé publique
//   - présence du webhook secret
//   - pour chaque Price ID : existe-t-il, est-il live ou test, son montant
//
// Si secretKeyMode = 'test' alors que tu as mis une clé live sur Vercel :
// le déploiement n'a PAS repris la variable → il faut redéployer.
// =========================================================================

export const runtime = 'nodejs';

function keyMode(v: string | undefined, livePrefix: string, testPrefix: string) {
  if (!v) return 'missing';
  if (v.startsWith(livePrefix)) return 'live';
  if (v.startsWith(testPrefix)) return 'test';
  return 'invalid';
}

export async function GET() {
  const ctx = await getSuperAdminContext();
  if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const secretKeyMode = keyMode(process.env.STRIPE_SECRET_KEY, 'sk_live_', 'sk_test_');
  const publishableKeyMode = keyMode(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'pk_live_',
    'pk_test_',
  );
  const webhookSecretSet = !!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_');

  // Résout le prix RÉELLEMENT utilisé par le checkout (base d'abord, env en
  // fallback) puis l'interroge chez Stripe : révèle livemode + montant.
  // Échoue si le prix n'est pas du même mode que la clé → info précieuse.
  // Offres V2 souscriptibles, mensuel et annuel (clé : `<plan>:<interval>`).
  const PLAN_KEYS: { key: string; plan: StripePlanId; interval: BillingInterval }[] = SELF_SERVICE_PLAN_IDS.flatMap((plan) =>
    (['month', 'year'] as const).map((interval) => ({ key: `${plan}:${interval}`, plan, interval })),
  );
  const prices: Record<string, unknown> = {};
  const stripeReady = secretKeyMode === 'live' || secretKeyMode === 'test';
  for (const { key, plan, interval } of PLAN_KEYS) {
    let id: string;
    try {
      id = await resolveStripePriceId(plan, interval);
    } catch {
      prices[key] = { set: false };
      continue;
    }
    if (!stripeReady) {
      prices[key] = { set: true, id_prefix: id.slice(0, 8), checked: false };
      continue;
    }
    try {
      const price = await getStripe().prices.retrieve(id);
      prices[key] = {
        set: true,
        found: true,
        livemode: price.livemode, // true = prix LIVE, false = prix TEST
        amount: price.unit_amount != null ? price.unit_amount / 100 : null,
        currency: price.currency,
        recurring: !!price.recurring,
      };
    } catch (e) {
      prices[key] = {
        set: true,
        found: false,
        error: e instanceof Error ? e.message : 'retrieve_failed',
      };
    }
  }

  // Verdict synthétique.
  const priceModes = Object.values(prices)
    .map((p) => (p as { livemode?: boolean }).livemode)
    .filter((v) => v !== undefined);
  const allPricesLive = priceModes.length > 0 && priceModes.every((v) => v === true);
  const isFullyLive =
    secretKeyMode === 'live' &&
    publishableKeyMode === 'live' &&
    webhookSecretSet &&
    allPricesLive;

  return NextResponse.json({
    data: {
      isFullyLive,
      secretKeyMode,
      publishableKeyMode,
      webhookSecretSet,
      prices,
      hint: isFullyLive
        ? 'Configuration LIVE complète — les vrais paiements sont actifs.'
        : secretKeyMode === 'test'
          ? "La clé secrète du serveur est en TEST. Mets sk_live_ dans STRIPE_SECRET_KEY sur Vercel PUIS REDEPLOIE (les variables ne sont prises en compte qu'au redéploiement)."
          : 'Configuration incomplète — voir les champs ci-dessus.',
    },
  });
}
