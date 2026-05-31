# Estimation des coûts d'hébergement et de maintenance

> Hypothèses, scénarios à 10 / 50 / 100 ESN clientes.
> Montants HT en euros, par mois sauf mention contraire.

## Hypothèses de base

| Variable | Valeur retenue |
|---|---|
| Consultants moyens par ESN | 25 |
| Utilisateurs ESN actifs / org | 4 |
| Sessions actives concurrentes (peak) | 30 % des utilisateurs |
| CV générés / mois / ESN | 40 |
| Documents stockés / consultant | 5 (CV + RIB + diplômes…) |
| Taille moyenne d'un document | 250 ko |
| Appels IA / CV généré | 1.5 (extraction + reformulation) |
| Trafic web mensuel (vitrine + app) | × 2 vs nombre d'utilisateurs |

## Postes de coût

### 1. Hébergement applicatif — Vercel

| Plan | Coût | Couvre |
|---|---|---|
| Hobby | 0 € | Dev uniquement |
| Pro | 20 $ / membre / mois | ≤ 100 GB bandwidth, 1 M invocations |
| Enterprise | sur devis | > 1 M invocations, SLA, SSO |

### 2. Base de données + Auth + Storage — Supabase

| Plan | Coût | Couvre |
|---|---|---|
| Free | 0 € | Dev (500 MB DB, 1 GB storage) |
| Pro | 25 $ / projet | 8 GB DB inclus, 100 GB storage, PITR 7j |
| Team | 599 $ / projet | + SOC2, advanced security, support |
| Enterprise | sur devis | dédié, SLA, audit logs étendu |

### 3. IA Anthropic (Claude)

Tarif (Sonnet 4.6) : ~3 $/M input tokens, ~15 $/M output tokens.

Hypothèse CV Optimizer :
- 1 CV = ~5k input tokens + ~3k output tokens
- Coût ~0.06 $ par CV

### 4. Emails — Resend

| Plan | Coût | Couvre |
|---|---|---|
| Free | 0 € | 3 000 emails/mois |
| Pro | 20 $ | 50 000 emails/mois |
| Business | 90 $ | 500 000 emails/mois |

### 5. Monitoring — Sentry

| Plan | Coût | Couvre |
|---|---|---|
| Developer | 0 € | 5k events/mois |
| Team | 26 € | 50k events/mois |
| Business | 80 € | 100k events/mois |

### 6. Status page

- BetterStack Uptime : 18 €/mois

### 7. Sauvegardes off-site

- Backups S3 chiffrés (EU) : ~10 €/mois pour < 50 GB

### 8. DNS + domaines

- ~2 €/mois moyennés (incluant *.centrium-platform.com)

---

## Scénario A — 10 ESN clientes

| Poste | Quantité estimée | Coût mensuel |
|---|---|---|
| Vercel Pro (2 sièges équipe) | 2 × 20 $ | ~38 € |
| Supabase Pro | 1 projet prod + 1 staging | ~46 € |
| IA Claude (CV) | 10 × 40 = 400 CV/mois × 0.06 $ | ~22 € |
| Resend Pro | < 50 000 emails | ~19 € |
| Sentry Team | suffisant | ~26 € |
| Status page | — | ~18 € |
| Sauvegardes | — | ~10 € |
| DNS | — | ~2 € |
| **Sous-total infra** | | **~181 €/mois** |
| Marge sécurité +30 % | | **~235 €/mois** |

Par ESN cliente : **~24 €/mois** de coût d'infra brut.

---

## Scénario B — 50 ESN clientes

| Poste | Quantité estimée | Coût mensuel |
|---|---|---|
| Vercel Pro (3 sièges) | 3 × 20 $ | ~57 € |
| Supabase Pro (multi-projet) | 2-3 projets | ~140 € |
| IA Claude | 50 × 40 = 2 000 CV × 0.06 $ | ~110 € |
| Resend Pro | OK | ~19 € |
| Sentry Team | OK | ~26 € |
| Status page | — | ~18 € |
| Sauvegardes | ~150 GB | ~25 € |
| DNS | — | ~2 € |
| **Sous-total infra** | | **~397 €/mois** |
| Marge sécurité +30 % | | **~516 €/mois** |

Par ESN cliente : **~10 €/mois** d'infra (économies d'échelle).

---

## Scénario C — 100 ESN clientes

| Poste | Quantité estimée | Coût mensuel |
|---|---|---|
| Vercel Pro → Enterprise (estimé) | upgrade | ~600 € |
| Supabase Team (1 projet prod) | dédié + SOC2 | ~550 € |
| IA Claude | 100 × 40 = 4 000 CV × 0.06 $ | ~220 € |
| Resend Business | grand volume | ~84 € |
| Sentry Business | — | ~80 € |
| Status page | — | ~18 € |
| Sauvegardes | ~400 GB | ~60 € |
| DNS | — | ~2 € |
| **Sous-total infra** | | **~1 614 €/mois** |
| Marge sécurité +30 % | | **~2 098 €/mois** |

Par ESN cliente : **~21 €/mois** d'infra (la montée Team Supabase fait
remonter le coût unitaire, justifié par les SLA exigés à cette échelle).

---

## Coûts hors infra

À ne pas oublier dans le P&L :

| Poste | Estimation mensuelle |
|---|---|
| Salaires équipe (cible M+12) | 50-70 k€ |
| Comptable | 200-400 € |
| Avocat ponctuel (RGPD, contrats) | 200 € moyennés |
| Outils internes (Slack, Notion, Linear, Figma) | 100-300 € |
| Marketing / acquisition | 500-3 000 € |
| Bureau / coworking | 0-800 € |

## Risques de dépassement

- **Coût IA Claude explose** : prévoir cache prompts + rate limits par
  ESN. Plan B : modèle plus petit (Haiku) pour les actions non-critiques,
  fine-tuning Mistral pour le matching.
- **Storage Supabase saturé** : compresser images, expirer documents
  archivés vers stockage froid (S3 Glacier).
- **Bandwidth Vercel saturé** : passer en Enterprise, ou self-host
  l'instance Next via OVH si volumes deviennent prévisibles.
- **Sentry events débordent** : sample errors récurrentes, monter de
  plan.

## Recommandations pour réduire les coûts

1. **Caching agressif** côté Next : ISR sur landing, dynamic-on-demand
   pour l'app
2. **Cache prompts Claude** : 90 % des CV optim ont des prefixes
   communs — gain estimé 30-40 %
3. **Archivage automatique** : déplacer en stockage froid les docs > 18 mois
4. **Mutualiser staging** : un seul projet Supabase staging partagé
5. **Domaine .com vs .fr** : économies marginales mais SEO important

---

> Ces estimations sont **indicatives** et basées sur les tarifs publics
> en mai 2026. Elles seront révisées à chaque montée de palier.
