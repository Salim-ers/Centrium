/**
 * Setup Stripe Webhook : crée (ou remplace) l'endpoint qui pousse les
 * events de subscription vers Centrium prod.
 *
 * Usage : npx tsx scripts/setup-stripe-webhook.ts
 *
 * IMPORTANT : Le `secret` d'un webhook endpoint n'est retourné par Stripe
 * QU'À LA CRÉATION. Si un endpoint existe déjà sur la même URL, ce script
 * le SUPPRIME et le recrée pour pouvoir récupérer un nouveau secret
 * (safe car on ne perd que quelques events de retry pendant le swap).
 *
 * Events écoutés (couverture cycle complet):
 *   - checkout.session.completed              premier paiement
 *   - customer.subscription.created           sub créée
 *   - customer.subscription.updated           plan change / cancel-at-period-end / rollover
 *   - customer.subscription.deleted           fin de sub
 *   - customer.subscription.paused / .resumed pause_collection lifecycle
 *   - customer.subscription.trial_will_end    3j avant fin trial
 *   - invoice.paid / invoice.payment_succeeded renouvellement OK
 *   - invoice.payment_failed                   renouvellement échoué → past_due
 */

import 'dotenv/config';
import { config } from 'dotenv';
import Stripe from 'stripe';

config({ path: '.env.local' });

// IMPORTANT : www.centrium-platform.com et pas l'apex. Vercel redirige
// centrium-platform.com → www.centrium-platform.com en HTTP 307 permanent,
// et Stripe ne suit pas les redirects sur les webhooks (=> endpoint mort).
const WEBHOOK_URL = 'https://www.centrium-platform.com/api/billing/webhook';

const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`❌ ${key} manquante dans .env.local`);
    process.exit(1);
  }
  return v;
}

const STRIPE_KEY = requireEnv('STRIPE_SECRET_KEY');
const isLive = STRIPE_KEY.startsWith('sk_live_');
const isTest = STRIPE_KEY.startsWith('sk_test_');

if (!isLive && !isTest) {
  console.error('❌ STRIPE_SECRET_KEY doit commencer par sk_test_ ou sk_live_');
  process.exit(1);
}

console.log(`\n🔧 Mode Stripe : ${isLive ? '🔴 LIVE (PROD)' : '🟢 TEST'}`);
console.log(`📡 Endpoint cible : ${WEBHOOK_URL}\n`);

if (isLive) {
  console.log('⚠️  Mode LIVE. Le webhook sera créé en prod.');
  console.log('   Ctrl+C dans 3s pour annuler.\n');
  const start = Date.now();
  while (Date.now() - start < 3000) {
    // busy wait
  }
}

const stripe = new Stripe(STRIPE_KEY, { typescript: true });

async function main() {
  console.log('1) Recherche des webhook endpoints existants…');
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const duplicates = existing.data.filter((e) => e.url === WEBHOOK_URL);

  if (duplicates.length > 0) {
    console.log(`   → ${duplicates.length} endpoint(s) existant(s) sur cette URL, suppression…`);
    for (const dup of duplicates) {
      await stripe.webhookEndpoints.del(dup.id);
      console.log(`     ⤵ Supprimé : ${dup.id} (créé ${new Date(dup.created * 1000).toISOString()})`);
    }
  } else {
    console.log('   → Aucun endpoint existant sur cette URL.');
  }

  console.log(`\n2) Création du nouvel endpoint avec ${EVENTS.length} events…`);
  const endpoint = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: 'Centrium — subscription lifecycle sync',
    metadata: { app: 'centrium', purpose: 'billing_lifecycle' },
  });

  console.log(`   ✓ Endpoint créé : ${endpoint.id}`);
  console.log(`   ✓ Status : ${endpoint.status}`);
  console.log(`   ✓ ${endpoint.enabled_events.length} events subscribed`);

  console.log('\n📋 COPIE cette ligne dans .env.local ET dans Vercel env vars :\n');
  console.log(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}\n`);

  console.log('⚠️  Sécurité :');
  console.log('   - Ce secret ne sera PLUS accessible côté Stripe. Copie-le maintenant.');
  console.log('   - Si tu le perds, relance ce script (crée un nouveau endpoint avec nouveau secret).');
  console.log('');

  console.log('🎯 Prochaines étapes :');
  console.log('   1. Copie STRIPE_WEBHOOK_SECRET dans .env.local (dev)');
  console.log('   2. Ajoute-le aussi dans Vercel → Settings → Environment Variables (prod)');
  console.log('   3. Redéploie Vercel pour que la nouvelle env var soit prise en compte');
  console.log('   4. Teste depuis Stripe Dashboard → Webhooks → ton endpoint → "Send test webhook"');
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err.message ?? err);
  process.exit(1);
});
