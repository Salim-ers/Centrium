import { NextResponse } from 'next/server';

import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { getStripe } from '@/lib/billing/stripe';

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

  const priceEnv: Record<string, string | undefined> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    medium: process.env.STRIPE_MEDIUM_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  };

  // Interroge Stripe pour chaque prix : révèle livemode + montant. Échoue si
  // le prix n'appartient pas au mode de la clé (test vs live) → info précieuse.
  const prices: Record<string, unknown> = {};
  const stripeReady = secretKeyMode === 'live' || secretKeyMode === 'test';
  for (const [plan, id] of Object.entries(priceEnv)) {
    if (!id) {
      prices[plan] = { set: false };
      continue;
    }
    if (!stripeReady) {
      prices[plan] = { set: true, id_prefix: id.slice(0, 8), checked: false };
      continue;
    }
    try {
      const price = await getStripe().prices.retrieve(id);
      prices[plan] = {
        set: true,
        found: true,
        livemode: price.livemode, // true = prix LIVE, false = prix TEST
        amount: price.unit_amount != null ? price.unit_amount / 100 : null,
        currency: price.currency,
        recurring: !!price.recurring,
      };
    } catch (e) {
      prices[plan] = {
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
