---
title: "Activation des abonnements Stripe — Centrium"
subtitle: "Guide pas-à-pas pour brancher les paiements en moins de 30 minutes"
version: "1.0"
date: "2026-06-15"
publisher: "QuadCore SAS"
type: "ops-runbook"
---

# Activer les abonnements payants Stripe — Centrium

> **Pré-requis** : ce document suppose que tu as déjà un compte Stripe et que tu as exécuté la migration `063_plans_pricing_2026.sql` dans Supabase.

Le code Stripe est déjà complet dans Centrium (`/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook`). Il manque juste **3 choses côté Stripe Dashboard + 1 mise à jour SQL** pour que les paiements tournent en prod.

## Étape 1 — Activer le compte Stripe en mode Live (5 min)

1. Connecte-toi sur https://dashboard.stripe.com
2. En haut à droite, **bascule en mode "Live"** (toggle "Test mode" → OFF)
3. Si pas encore validé : **complète les informations entreprise** (SIREN QuadCore SAS, IBAN, RIB, RIB justificatif, pièce d'identité du dirigeant). Stripe valide en 1-3 jours ouvrés. Tu peux continuer la config en mode Test pendant ce temps — tu basculeras à la fin.

## Étape 2 — Créer les 3 Products dans Stripe (10 min)

Dans **Products → + Add Product** (en mode Live ou Test selon où tu en es) :

### Product 1 — Centrium Starter

| Champ | Valeur |
|---|---|
| **Name** | Centrium Starter |
| **Description** | Plan Starter — Pour ESN 10 à 30 consultants. 20 consultants inclus, +39 €/consultant additionnel. |
| **Image** | Logo Centrium (charge ton PNG) |
| **Tax Behavior** | Exclusive (TVA en sus) |
| **Statement Descriptor** | CENTRIUM STARTER |

Puis ajoute **2 prix** au Product :

| Price 1 — Mensuel | Price 2 — Annuel |
|---|---|
| 890 € | 12 000 € |
| Recurring · Monthly | Recurring · Yearly |
| EUR | EUR |
| Currency : EUR | Currency : EUR |
| Lookup key : `starter_monthly` | Lookup key : `starter_yearly` |

→ Note les 2 **Price ID** générés (format `price_1ABC...`)

Crée un **3e prix** pour les consultants additionnels :

| Price 3 — Per-consultant overage |
|---|
| Pricing model : **Standard pricing** |
| Recurring : Monthly |
| 39 € par unité |
| Usage type : **Per unit** (ou **Metered** si tu veux reporter les usages via API) |
| Lookup key : `starter_extra_consultant` |

→ Note ce **Price ID**

### Product 2 — Centrium Growth

Même procédure :

| Champ | Valeur |
|---|---|
| **Name** | Centrium Growth |
| **Description** | Plan Growth — Pour ESN 30 à 100 consultants. 20 consultants inclus, +29 €/consultant additionnel. |
| Mensuel | 1 690 € · `growth_monthly` |
| Annuel | 20 000 € · `growth_yearly` |
| Per-consultant | 29 € · `growth_extra_consultant` |

### Product 3 — Centrium Enterprise

| Champ | Valeur |
|---|---|
| **Name** | Centrium Enterprise |
| **Description** | Plan Enterprise — Pour ESN 100+ consultants ou groupes. Tarif sur devis. |
| Mensuel | 3 500 € · `enterprise_monthly_base` (prix de base, le reste se négocie en custom) |
| Annuel | 42 000 € · `enterprise_yearly_base` |

Pour Enterprise, pas de prix per-consultant standard — chaque deal est négocié à la main et tu crées des Prices custom dans Stripe au cas par cas.

## Étape 3 — Coller les Price ID dans Supabase (5 min)

Récupère les 8 Price ID Stripe (3 mensuels + 3 annuels + 2 per-consultant pour Starter/Growth) et exécute dans **Supabase Dashboard → SQL Editor** :

```sql
-- Remplace les price_xxxx par tes vrais Price IDs récupérés de Stripe

UPDATE plans SET
  stripe_price_id = 'price_REMPLACE_starter_monthly',
  stripe_price_yearly_id = 'price_REMPLACE_starter_yearly',
  stripe_extra_consultant_price_id = 'price_REMPLACE_starter_extra'
WHERE id = 'starter';

UPDATE plans SET
  stripe_price_id = 'price_REMPLACE_growth_monthly',
  stripe_price_yearly_id = 'price_REMPLACE_growth_yearly',
  stripe_extra_consultant_price_id = 'price_REMPLACE_growth_extra'
WHERE id = 'growth';

UPDATE plans SET
  stripe_price_id = 'price_REMPLACE_enterprise_monthly',
  stripe_price_yearly_id = 'price_REMPLACE_enterprise_yearly'
WHERE id = 'enterprise';

-- Vérification
SELECT id, name, price_monthly_eur, stripe_price_id, stripe_price_yearly_id,
       stripe_extra_consultant_price_id
FROM plans
ORDER BY sort_order;
```

## Étape 4 — Configurer le Webhook Stripe (5 min)

1. Stripe Dashboard → **Developers → Webhooks → + Add endpoint**
2. **Endpoint URL** : `https://centrium-platform.com/api/billing/webhook`
3. **Description** : `Centrium prod webhook`
4. **Events to listen** : sélectionne ces 5 événements :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. **+ Add endpoint** → Stripe te montre le **Signing Secret** (format `whsec_xxx`)
6. **Copie ce secret**

## Étape 5 — Ajouter les variables d'env Vercel (5 min)

Dans **Vercel Dashboard → Project Settings → Environment Variables**, ajoute en **Production** :

| Variable | Valeur | Où la trouver |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (mode Live) | Stripe → API Keys → Standard keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (copié à l'étape 4) | Stripe → Webhooks → endpoint Centrium → Signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (mode Live) | Stripe → API Keys → Standard keys → Publishable key |
| `NEXT_PUBLIC_APP_URL` | `https://centrium-platform.com` | Doit être renseigné |

**Important** : si tu utilises encore le mode Test (en attendant validation Stripe), utilise les clés `sk_test_...` et `pk_test_...` à la place. Bascule en `_live_` quand Stripe valide ton compte.

Puis **Redéploie** Vercel (Settings → Deployments → onglet "..." → Redeploy).

## Étape 6 — Test du parcours complet (5 min)

1. Connecte-toi sur Centrium en tant qu'admin d'org (ou crée une org de test via `/admin/new-org`)
2. Va sur `/billing` (page qui contient le bouton "Upgrade")
3. Clique sur le bouton → tu dois être redirigé vers la **page Stripe Checkout hébergée**
4. En mode Test, paye avec la carte test `4242 4242 4242 4242` · `12/30` · `123`
5. Tu reviens sur Centrium → la subscription doit être active dans `subscriptions` (vérifier en SQL : `SELECT * FROM subscriptions WHERE organization_id = '...'`)

Si ça plante → vérifie :
- Webhook délivré dans Stripe Dashboard → Webhooks → Events
- Logs Vercel : Fonctions → `/api/billing/webhook` → erreurs
- Variable `STRIPE_WEBHOOK_SECRET` bien posée

## Étape 7 — Connecter la page /tarifs au checkout

Le fichier `src/app/tarifs/page.tsx` a déjà des CTAs `/devis?plan=starter`. Pour que le clic redirige direct vers Stripe Checkout en mode self-serve :

**Option A — Garde le funnel "Démo d'abord"** (recommandé pour les premiers clients) :
- Tu reçois la demande de devis
- Tu envoies un lien Calendly
- Après la démo, tu crées manuellement le Checkout via le dashboard

**Option B — Self-serve immédiat** (pour scaler après 5-10 clients) :
- Crée une route `/api/billing/checkout-public?plan=starter&cycle=monthly`
- Elle crée un Checkout Stripe pour un email donné, sans org existante
- Au paiement réussi, on crée auto l'org + on envoie l'email d'invitation admin

Pour le V1, garde **l'Option A** : tu veux voir ton 1er client en face avant qu'il paye, ça te donne le feedback produit critique.

## ✅ Checklist finale

- [ ] Compte Stripe validé en mode Live (KYB OK)
- [ ] 3 Products créés avec leurs 8 Prices
- [ ] Migration `063_plans_pricing_2026.sql` exécutée dans Supabase
- [ ] `UPDATE plans SET stripe_price_id = ...` exécuté (8 IDs renseignés)
- [ ] Webhook `https://centrium-platform.com/api/billing/webhook` créé
- [ ] 4 env vars dans Vercel Production (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`)
- [ ] Redéploiement Vercel effectué
- [ ] Test parcours Checkout avec carte test
- [ ] Test webhook délivré (Events Stripe → 200 OK)

**Ton temps total estimé : 30-45 minutes** (hors validation KYB Stripe qui prend 1-3 jours).

## Contact en cas de blocage

- Stripe Support : https://support.stripe.com (chat live 24/7)
- Logs Vercel : Dashboard → Functions → tail
- Documentation Centrium : `docs/business-plan/audit/04-OPS-INFRA.md`
