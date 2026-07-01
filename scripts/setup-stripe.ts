/**
 * Setup Stripe : crée produits + prix mensuels/annuels côté Stripe,
 * met à jour la table `plans` côté Supabase.
 *
 * Usage : npx tsx scripts/setup-stripe.ts
 *
 * IDEMPOTENT
 *   - Produits matchés par metadata.plan_id → réutilisés (name/description
 *     mis à jour si changement).
 *   - Prices matchés par amount+interval+currency → réutilisés à l'identique.
 *   - Si un prix DIFFÉRENT existe avec le même lookup_key (typiquement après
 *     un changement de tarif : 890 → 75), on utilise transfer_lookup_key
 *     sur la nouvelle Price + on désactive l'ancienne. Les subscriptions
 *     existantes RESTENT sur l'ancienne Price (Stripe ne migre pas
 *     automatiquement), il faut proposer un upgrade explicite si voulu.
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

config({ path: '.env.local' });

// ---------- Grille tarifaire ----------
// 3 tiers publics :
//   - Starter    75  EUR HT/mo — TPE ESN < 20 consultants
//   - Medium    149  EUR HT/mo — PME ESN 20-100 consultants (id 'growth')
//   - Enterprise sur devis     — 100+ consultants ou groupes
//
// L'id 'growth' est conservé pour Medium — références en dur dans le code +
// dans les metadata Stripe des abonnés existants. Seul le nom d'affichage
// change.
// --------------------------------------
const YEARLY_DISCOUNT = 0.2;

type PlanSpec = {
  id: string;
  name: string;
  description: string;
  monthlyEur: number;            // 0 = pas de Stripe Price (enterprise / free)
  maxConsultants: number | null;
  maxUsers: number | null;
  maxOpenOpportunities: number | null;
  maxContacts: number | null;
  maxActiveMissions: number | null;
  features: string[];
  isPublic: boolean;
  sortOrder: number;
};

const PLANS: PlanSpec[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Pour lancer une petite ESN — 3 utilisateurs, 20 consultants.',
    monthlyEur: 75,
    maxConsultants: 20,
    maxUsers: 3,
    maxOpenOpportunities: 100,
    maxContacts: 500,
    maxActiveMissions: 30,
    features: [
      '3 utilisateurs admin',
      'Jusqu\'à 20 consultants',
      '100 opportunités CRM ouvertes',
      '500 contacts',
      '30 missions actives',
      'CV Optimizer (Claude API)',
      'CRM Kanban + relances',
      'CRA + facturation PDF',
      'Dashboard pilotage',
      'Support email 24h ouvrées',
    ],
    isPublic: true,
    sortOrder: 10,
  },
  {
    id: 'growth', // ← id interne conservé, nom d'affichage = "Medium"
    name: 'Medium',
    description: 'Pour ESN active — 10 utilisateurs, jusqu\'à 100 consultants, portail conseil, MFA.',
    monthlyEur: 149,
    maxConsultants: 100,
    maxUsers: 10,
    maxOpenOpportunities: 500,
    maxContacts: 2000,
    maxActiveMissions: 100,
    features: [
      '10 utilisateurs admin',
      'Jusqu\'à 100 consultants',
      '500 opportunités CRM ouvertes',
      '2 000 contacts',
      '100 missions actives',
      'Tout Starter',
      'Portail consultant dédié',
      'Signature électronique',
      'MFA TOTP configurable',
      'Audit log + export RGPD',
      'Support prioritaire 8h ouvrées',
    ],
    isPublic: true,
    sortOrder: 20,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Sur devis — consultants & utilisateurs illimités, SSO, SLA contractuel.',
    monthlyEur: 0,
    maxConsultants: null,
    maxUsers: null,
    maxOpenOpportunities: null,
    maxContacts: null,
    maxActiveMissions: null,
    features: [
      'Utilisateurs & consultants illimités',
      'SSO SAML/OIDC',
      'API publique + Webhooks',
      'SLA 99.95% contractuel',
      'Account Manager dédié',
      'Multi-organisations',
      'Support 24/7',
    ],
    isPublic: true,
    sortOrder: 30,
  },
];

// Legacy `scale` reste dans la DB avec is_public=false (migration 067).
// Non listé ici → non touché par ce script (safe pour subscribers historiques).

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
  console.log('⚠️  Mode LIVE. Les produits/prix seront créés en prod.');
  console.log('   Ctrl+C dans 3s pour annuler.\n');
  const start = Date.now();
  while (Date.now() - start < 3000) {
    // busy wait
  }
}

const stripe = new Stripe(STRIPE_KEY, { typescript: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Helpers ----------

async function findOrCreateProduct(spec: PlanSpec): Promise<Stripe.Product> {
  const list = await stripe.products.list({ active: true, limit: 100 });
  const existing = list.data.find((p) => p.metadata?.plan_id === spec.id);

  if (existing) {
    const updated = await stripe.products.update(existing.id, {
      name: spec.name,
      description: spec.description,
      metadata: { plan_id: spec.id },
    });
    console.log(`  ↻ Produit mis à jour : ${spec.name} (${updated.id})`);
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

/**
 * Créé ou retrouve un Price pour ce produit :
 *   1. Cherche un Price actif avec exactement amount+interval+currency → reuse.
 *   2. Sinon, cherche s'il existe UN AUTRE Price avec notre lookup_key
 *      (typiquement l'ancien tarif). Si oui : nouvelle Price avec
 *      transfer_lookup_key=true + désactive l'ancienne.
 *   3. Sinon, crée directement avec lookup_key.
 */
async function findOrCreatePrice(
  product: Stripe.Product,
  amountEur: number,
  interval: 'month' | 'year',
  lookupKey: string,
): Promise<Stripe.Price> {
  const unitAmount = Math.round(amountEur * 100);

  // On liste TOUS les prices (active+inactive) pour ce produit.
  const active = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const inactive = await stripe.prices.list({ product: product.id, active: false, limit: 100 });
  const all = [...active.data, ...inactive.data];

  // 1) Match exact sur amount+interval → réutilise.
  const exact = all.find(
    (p) =>
      p.active &&
      p.recurring?.interval === interval &&
      p.unit_amount === unitAmount &&
      p.currency === 'eur',
  );
  if (exact) {
    console.log(
      `    ↻ Prix ${interval === 'month' ? 'mensuel' : 'annuel'} existant : ${exact.id} (${amountEur}€)`,
    );
    return exact;
  }

  // 2) Un Price a-t-il déjà notre lookup_key ? On le transfère.
  const priorWithKey = all.find((p) => p.lookup_key === lookupKey);
  const transferKey = !!priorWithKey;

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'eur',
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: transferKey,
    metadata: { plan_id: product.metadata?.plan_id ?? '' },
  });
  console.log(
    `    ✓ Prix ${interval === 'month' ? 'mensuel' : 'annuel'} créé : ${created.id} (${amountEur}€)${transferKey ? ' [lookup_key transférée]' : ''}`,
  );

  // 3) Désactive l'ancien Price avec cette lookup_key (les subs existantes
  //    restent liées à son id, Stripe garde l'historique).
  if (priorWithKey && priorWithKey.id !== created.id && priorWithKey.active) {
    await stripe.prices.update(priorWithKey.id, { active: false });
    console.log(`    ⤵ Ancien prix désactivé : ${priorWithKey.id}`);
  }

  return created;
}

// ---------- Main ----------

async function main() {
  console.log('📦 Synchronisation Stripe ↔ Supabase — 3 tiers Centrium\n');

  console.log('1) Masque le plan legacy "free" (hérité, non public) …');
  await supabase.from('plans').update({ is_public: false }).eq('id', 'free');

  for (const spec of PLANS) {
    console.log(
      `\n${spec.sortOrder}) ${spec.name} — ${spec.monthlyEur === 0 ? 'sur devis' : `${spec.monthlyEur} €/mo`}`,
    );

    let monthlyPriceId: string | null = null;
    let yearlyPriceId: string | null = null;

    if (spec.monthlyEur > 0) {
      const product = await findOrCreateProduct(spec);
      const monthly = await findOrCreatePrice(
        product,
        spec.monthlyEur,
        'month',
        `${spec.id}_monthly`,
      );
      const yearlyAmount = Math.round(spec.monthlyEur * 12 * (1 - YEARLY_DISCOUNT));
      const yearly = await findOrCreatePrice(
        product,
        yearlyAmount,
        'year',
        `${spec.id}_yearly`,
      );
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
        price_yearly_eur:
          spec.monthlyEur > 0
            ? Math.round(spec.monthlyEur * 12 * (1 - YEARLY_DISCOUNT))
            : null,
        stripe_price_id: monthlyPriceId,
        stripe_price_yearly_id: yearlyPriceId,
        max_consultants: spec.maxConsultants,
        max_users: spec.maxUsers,
        max_open_opportunities: spec.maxOpenOpportunities,
        max_contacts: spec.maxContacts,
        max_active_missions: spec.maxActiveMissions,
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

  const { data: plans } = await supabase
    .from('plans')
    .select(
      'id, name, price_monthly_eur, stripe_price_id, stripe_price_yearly_id, max_users, max_consultants',
    )
    .eq('is_public', true)
    .order('sort_order');

  console.table(
    (plans ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      monthly: p.price_monthly_eur > 0 ? `${p.price_monthly_eur} €` : 'sur devis',
      users: p.max_users ?? '∞',
      consultants: p.max_consultants ?? '∞',
      stripe_monthly: p.stripe_price_id ?? '—',
    })),
  );

  console.log('\n🎯 Prochaine étape :');
  console.log('   1. Lance : stripe listen --forward-to localhost:3000/api/billing/webhook');
  console.log('   2. Copie whsec_... dans STRIPE_WEBHOOK_SECRET');
  console.log('   3. npm run dev, va sur /billing, teste avec 4242 4242 4242 4242\n');
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err);
  process.exit(1);
});
