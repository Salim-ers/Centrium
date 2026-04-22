/**
 * Setup Stripe : crée produits + prix mensuels/annuels côté Stripe,
 * met à jour la table `plans` côté Supabase.
 *
 * Usage : npx tsx scripts/setup-stripe.ts
 *
 * Idempotent : on matche par metadata.plan_id (dédup côté Stripe) et par
 * primary key côté Supabase. Rejouable sans créer de doublons.
 *
 * Variables env nécessaires (.env.local) :
 *   STRIPE_SECRET_KEY              (sk_test_... recommandé pour le 1er run)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { config } from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Charge .env.local explicitement (Next convention)
config({ path: '.env.local' });

// ---------- Grille tarifaire ----------
//   - free : non public (utilisé seulement pour les essais 14j avant souscription)
//   - yearlyDiscount = 20% → yearly = monthly * 12 * 0.8
// --------------------------------------
const YEARLY_DISCOUNT = 0.2;

type PlanSpec = {
  id: string;
  name: string;
  description: string;
  monthlyEur: number;            // 0 = pas de Stripe Price (enterprise / free)
  maxConsultants: number | null; // null = illimité
  maxUsers: number | null;
  features: string[];
  isPublic: boolean;
  sortOrder: number;
};

const PLANS: PlanSpec[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Pour lancer une petite ESN — gestion consultants + CV IA + matching.',
    monthlyEur: 99,
    maxConsultants: 10,
    maxUsers: 3,
    features: [
      'Jusqu\'à 10 consultants',
      '3 utilisateurs internes',
      'CV Optimizer IA (Claude)',
      'Matching consultant ↔ offre',
      'CRM pipeline',
      'Templates CV QuadCore',
      'Support email',
    ],
    isPublic: true,
    sortOrder: 1,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Le plan phare — tout pour piloter une ESN active au quotidien.',
    monthlyEur: 299,
    maxConsultants: 30,
    maxUsers: 10,
    features: [
      'Jusqu\'à 30 consultants',
      '10 utilisateurs internes',
      'Tout Starter',
      'Réponses AO IA (pitch commercial)',
      'Analyse skills IA (enrichissement profils)',
      'CRA + validation workflow',
      'Factures automatiques',
      'Génération contrats AT',
      'Support prioritaire',
    ],
    isPublic: true,
    sortOrder: 2,
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'Pour ESN établie — jusqu\'à 100 consultants et support dédié.',
    monthlyEur: 699,
    maxConsultants: 100,
    maxUsers: 30,
    features: [
      'Jusqu\'à 100 consultants',
      '30 utilisateurs internes',
      'Tout Growth',
      'Exports avancés (Excel, API)',
      'Intégrations webhook sortants',
      'Onboarding personnalisé',
      'Success manager dédié',
      'SLA 99.5%',
    ],
    isPublic: true,
    sortOrder: 3,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Sur devis — consultants illimités, SSO, SLA 99.9%, data residency.',
    monthlyEur: 0, // pas de Stripe Price — facturation custom
    maxConsultants: null,
    maxUsers: null,
    features: [
      'Consultants & utilisateurs illimités',
      'SSO (SAML / OIDC)',
      'SLA 99.9% contractuel',
      'Data residency (région Supabase dédiée)',
      'Audit logs exportables',
      'Support 24/7 + CSM dédié',
      'Contractuel annuel ≥ 1 500 €/mois',
    ],
    isPublic: true,
    sortOrder: 4,
  },
];

// ---------- Bootstrap ----------

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`❌ Variable d'environnement manquante : ${key}`);
    console.error('   Vérifie ton .env.local.');
    process.exit(1);
  }
  return v;
}

const STRIPE_KEY = requireEnv('STRIPE_SECRET_KEY');
const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const isLive = STRIPE_KEY.startsWith('sk_live_');
const isTest = STRIPE_KEY.startsWith('sk_test_');

if (!isLive && !isTest) {
  console.error('❌ STRIPE_SECRET_KEY doit commencer par sk_test_ ou sk_live_');
  process.exit(1);
}

console.log(`\n🔧 Mode Stripe : ${isLive ? '🔴 LIVE (PROD)' : '🟢 TEST'}\n`);

if (isLive) {
  console.log('⚠️  Tu es en mode LIVE. Les produits seront créés en production.');
  console.log('   Appuie sur Ctrl+C dans les 3 secondes pour annuler.\n');
  // Pause bloquante
  const start = Date.now();
  while (Date.now() - start < 3000) {
    // busy wait simple pour laisser le temps de Ctrl+C
  }
}

const stripe = new Stripe(STRIPE_KEY, { typescript: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Idempotence helpers ----------

async function findOrCreateProduct(spec: PlanSpec): Promise<Stripe.Product> {
  // On matche par metadata.plan_id (stable)
  const list = await stripe.products.list({ active: true, limit: 100 });
  const existing = list.data.find((p) => p.metadata?.plan_id === spec.id);

  if (existing) {
    // Update metadata si le nom/description a changé
    const updated = await stripe.products.update(existing.id, {
      name: spec.name,
      description: spec.description,
      metadata: { plan_id: spec.id },
    });
    console.log(`  ↻ Produit existant mis à jour : ${spec.name} (${updated.id})`);
    return updated;
  }

  const created = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: { plan_id: spec.id },
  });
  console.log(`  ✓ Produit créé : ${spec.name} (${created.id})`);
  return created;
}

async function findOrCreatePrice(
  product: Stripe.Product,
  amountEur: number,
  interval: 'month' | 'year',
  lookupKey: string,
): Promise<Stripe.Price> {
  const unitAmount = Math.round(amountEur * 100); // centimes

  // Cherche par lookup_key (unique par price côté Stripe)
  const list = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const existing = list.data.find(
    (p) =>
      p.recurring?.interval === interval &&
      p.unit_amount === unitAmount &&
      p.currency === 'eur',
  );

  if (existing) {
    console.log(`    ↻ Prix existant ${interval === 'month' ? 'mensuel' : 'annuel'} : ${existing.id} (${amountEur}€)`);
    return existing;
  }

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'eur',
    recurring: { interval },
    lookup_key: lookupKey,
    metadata: { plan_id: product.metadata?.plan_id ?? '' },
  });
  console.log(`    ✓ Prix créé ${interval === 'month' ? 'mensuel' : 'annuel'} : ${created.id} (${amountEur}€)`);
  return created;
}

// ---------- Main ----------

async function main() {
  console.log('📦 Synchronisation des plans Stripe ↔ Supabase\n');

  // 1) Masque le plan "free" hérité (il reste en DB pour les trials mais
  //    ne s'affiche plus en pricing publique).
  console.log('1) Masque le plan "free" (non public) …');
  await supabase.from('plans').update({ is_public: false }).eq('id', 'free');

  // 2) Pour chaque plan payant, crée/update produit + prix côté Stripe,
  //    puis upsert dans Supabase.
  for (const spec of PLANS) {
    console.log(`\n${spec.sortOrder}) ${spec.name} — ${spec.monthlyEur === 0 ? 'sur devis' : `${spec.monthlyEur} €/mo`}`);

    let monthlyPriceId: string | null = null;
    let yearlyPriceId: string | null = null;

    if (spec.monthlyEur > 0) {
      const product = await findOrCreateProduct(spec);
      const monthly = await findOrCreatePrice(product, spec.monthlyEur, 'month', `${spec.id}_monthly`);
      const yearlyAmount = Math.round(spec.monthlyEur * 12 * (1 - YEARLY_DISCOUNT));
      const yearly = await findOrCreatePrice(product, yearlyAmount, 'year', `${spec.id}_yearly`);
      monthlyPriceId = monthly.id;
      yearlyPriceId = yearly.id;
    } else {
      console.log('    (pas de prix Stripe — plan sur devis)');
    }

    const { error } = await supabase.from('plans').upsert(
      {
        id: spec.id,
        name: spec.name,
        price_monthly_eur: spec.monthlyEur,
        price_yearly_eur: spec.monthlyEur > 0
          ? Math.round(spec.monthlyEur * 12 * (1 - YEARLY_DISCOUNT))
          : null,
        stripe_price_id: monthlyPriceId,
        stripe_price_yearly_id: yearlyPriceId,
        max_consultants: spec.maxConsultants,
        max_users: spec.maxUsers,
        features: spec.features,
        is_public: spec.isPublic,
        sort_order: spec.sortOrder,
      },
      { onConflict: 'id' },
    );
    if (error) {
      console.error(`    ❌ Erreur Supabase : ${error.message}`);
      process.exit(1);
    }
    console.log(`    ✓ Plan synchronisé en DB`);
  }

  console.log('\n✅ Terminé.\n');
  console.log('📋 Récap :');
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, price_monthly_eur, stripe_price_id, stripe_price_yearly_id, is_public')
    .eq('is_public', true)
    .order('sort_order');

  console.table(
    (plans ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      monthly: `${p.price_monthly_eur} €`,
      monthly_price_id: p.stripe_price_id ?? '—',
      yearly_price_id: p.stripe_price_yearly_id ?? '—',
    })),
  );

  console.log('\n🎯 Prochaine étape :');
  console.log('   1. Lance `stripe listen --forward-to localhost:3000/api/billing/webhook`');
  console.log('   2. Copie le whsec_... dans STRIPE_WEBHOOK_SECRET');
  console.log('   3. npm run dev, va sur /pricing, teste un checkout avec 4242 4242 4242 4242\n');
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err);
  process.exit(1);
});
