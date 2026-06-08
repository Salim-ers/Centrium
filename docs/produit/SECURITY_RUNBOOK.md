---
title: "Runbook sécurité & disaster recovery — Centrium"
subtitle: "Procédures opérationnelles internes (à exécuter par toi)"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "internal-runbook"
---

# Runbook sécurité & disaster recovery — Centrium

> **Ce document est INTERNE.** Il liste tout ce qui doit être fait
> **par toi** (Salim) ou ton équipe pour activer, maintenir et tester
> les protections de sécurité de Centrium. Le code est en place ; ces
> actions externes nécessitent un accès humain à des dashboards tiers.

---

## 0. Actions ponctuelles à faire MAINTENANT (1-2h de boulot)

| # | Action | Où | Durée |
|---|---|---|---:|
| 1 | Vérifier que Supabase est en région EU (Francfort ou Paris) | Supabase Dashboard → Project Settings → Region | 2 min |
| 2 | Activer "Force MFA for Admins" côté Supabase Auth | Supabase Dashboard → Authentication → Providers | 1 min |
| 3 | Activer "Enable Multi-Factor Authentication" (TOTP) | Supabase Dashboard → Authentication → Settings | 1 min |
| 4 | Créer compte Upstash Redis (région EU) et récupérer les credentials | https://console.upstash.com | 10 min |
| 5 | Ajouter `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` dans Vercel env | Vercel Dashboard → Project → Settings → Environment Variables | 5 min |
| 6 | Créer compte Sentry (gratuit) et copier le DSN | https://sentry.io | 10 min |
| 7 | Ajouter `SENTRY_DSN` dans Vercel env | Vercel Dashboard | 2 min |
| 8 | Créer compte Resend, vérifier le domaine `centrium-platform.com` | https://resend.com | 30 min (incluant DNS) |
| 9 | Ajouter `RESEND_API_KEY` dans Vercel env | Vercel Dashboard | 2 min |
| 10 | Configurer DNS `status.centrium-platform.com` → Better Stack | Registrar (OVH/Cloudflare) + Better Stack | 15 min |
| 11 | Activer Vercel Firewall (Web Application Firewall) | Vercel Dashboard → Firewall | 5 min |
| 12 | Régénérer la `SUPABASE_SERVICE_ROLE_KEY` (rotation initiale) | Supabase Dashboard → Project Settings → API | 5 min |

**Ordre conseillé : 1, 2, 3, 12, 11, 4-5, 6-7, 8-9, 10.**

---

## 1. Vérifier que la région Supabase est en EU

**Pourquoi** : RGPD impose que les données personnelles UE soient traitées
en UE par défaut. Un Supabase en US-East-1 = bloque la vente à toute ESN
sérieuse.

1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet Centrium
3. Project Settings → General → cherche "Region"
4. **Si tu vois `eu-central-1` (Francfort) ou `eu-west-3` (Paris)** : ✅ OK
5. **Si tu vois `us-east-1` ou autre US/Asia** : 🚨 migration nécessaire
   - Ouvre un ticket avec le support Supabase
   - Migration zero-downtime possible mais nécessite leur intervention
   - Compte 2-4h d'indisponibilité partielle (en heures creuses)

---

## 2-3. Activer MFA dans Supabase

1. Authentication → Providers → Email
2. Toggle "Multi-Factor Authentication (MFA)" → ON
3. Authentication → Settings → "MFA Enrollment" → "TOTP enabled"
4. Save

Ensuite, le code de Centrium expose déjà les routes `/api/auth/mfa/enroll`
et `/api/auth/mfa/verify` qui marchent automatiquement.

**Pour forcer MFA sur tous les admins de toutes les orgs** :
```sql
UPDATE org_security_settings SET mfa_required_for_admin = TRUE;
```

---

## 4-5. Activer Upstash Redis (rate limiting)

Sans Upstash, le rate limiting tombe en mode "in-memory" qui ne marche
pas en multi-instance Vercel (chaque serverless function a son propre
compteur). C'est INSUFFISANT en prod.

1. Va sur https://console.upstash.com
2. Crée un compte (gratuit, pas de CB)
3. Create Database → choisis "Global" → région principale `eu-west-1` (Irlande) ou `eu-central-1` (Francfort)
4. Type : Regional (suffit), Eviction : volatile-lru
5. Récupère les credentials sous "REST API" :
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
6. Ajoute-les dans Vercel env vars (Production + Preview)
7. Redéploie

Quota gratuit : 10 000 commandes/jour. Largement suffisant pour 50 ESN.

---

## 6-7. Activer Sentry (monitoring)

1. Va sur https://sentry.io
2. Crée un compte (gratuit, 5k events/mois inclus)
3. Create Project → platform = Next.js → name = `centrium-platform`
4. Copie le DSN affiché (format `https://xxx@yyy.ingest.sentry.io/zzz`)
5. Ajoute `SENTRY_DSN` dans Vercel env vars
6. Redéploie

Notre wrapper `src/lib/security/sentry.ts` envoie automatiquement les
événements sécurité critiques (rls.error, cross_tenant.attempt, etc.).

---

## 8-9. Activer Resend (emails de sécurité)

1. Crée un compte sur https://resend.com (gratuit, 3k emails/mois)
2. Domains → Add Domain → `centrium-platform.com`
3. Ajoute les enregistrements DNS demandés (SPF, DKIM, DMARC) chez ton registrar
4. Attends la propagation (15 min - 24h)
5. Crée une API Key (Full Access)
6. Ajoute `RESEND_API_KEY` dans Vercel env vars
7. Redéploie

Tests :
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"security@centrium-platform.com","to":"toi@example.com","subject":"Test","text":"Hello"}'
```

---

## 10. Status page publique

1. Crée un compte sur https://betterstack.com (gratuit jusqu'à 10 monitors)
2. Create Status Page → name = "Centrium Status"
3. Custom domain : `status.centrium-platform.com`
4. Configure les monitors :
   - HTTP : `https://centrium-platform.com/api/health` (à créer si absent — simple GET retournant 200)
   - HTTP : `https://centrium-platform.com/login`
5. Configure les notifications email/Slack en cas d'incident
6. Chez ton registrar (OVH, Cloudflare) :
   - CNAME `status` → l'URL fournie par Better Stack

---

## 11. Vercel Firewall (WAF)

1. Vercel Dashboard → ton projet → Firewall
2. Active "Attack Challenge Mode" en mode auto (activable sur incident)
3. Crée des rules :
   - Block IPs avec > 100 req/min sur `/api/auth/*`
   - Challenge les requêtes sans User-Agent
   - Geo-block les pays où tu ne vends pas (optionnel)

Coût : inclus jusqu'à 1M req/mois sur Vercel Pro.

---

## 12. Rotation de la `SUPABASE_SERVICE_ROLE_KEY`

**À FAIRE MAINTENANT puis tous les 90 jours.**

1. Supabase Dashboard → Project Settings → API → Service Role Key
2. Click "Regenerate" → confirme
3. Copie immédiatement la nouvelle clé
4. Vercel Dashboard → Settings → Environment Variables → édite `SUPABASE_SERVICE_ROLE_KEY` → colle la nouvelle valeur
5. Redéploie le site (sinon les anciennes serverless functions plantent au prochain cold start)
6. **L'ancienne clé est révoquée immédiatement** — toute Edge Function qui l'utilisait encore plantera

**Avant rotation** : préviens ton équipe et vérifie qu'aucun job cron externe (Zapier, n8n) ne l'utilise.

---

## 13. Disaster Recovery — Restore drill mensuel

**À FAIRE LE 1er DE CHAQUE MOIS.** Bloque 1h dans ton calendrier.

### Procédure

1. Supabase Dashboard → ton projet → Database → Backups
2. Vérifie qu'il y a bien un backup datant de < 24h
3. Note la taille du backup (doit grossir progressivement)
4. **Test de restore** :
   - Crée un projet Supabase "staging-restore-test"
   - Lance le restore du dernier backup prod vers ce projet test
   - Connecte-toi à l'instance test, vérifie que tu vois des données
   - Run quelques queries `SELECT count(*) FROM consultants` etc.
   - Si tout est OK → supprime le projet test
5. **Documente le résultat** dans un Google Sheet ou Notion :
   - Date, taille du backup, temps de restore, statut OK/KO, observations

### Si le restore échoue

1. Ouvre un ticket P1 chez Supabase
2. Préviens tes clients par email d'un risque potentiel
3. Revoie ta stratégie de backup (PITR sur plan Pro+ recommandé)

---

## 14. Incident sécurité (procédure d'urgence)

Si tu détectes ou si on te signale une compromission :

### Heure H

1. **NE PANIQUE PAS** — note l'heure de détection
2. Identifie le périmètre :
   - Compte user compromis ? → invalide ses sessions Supabase
   - Service role key fuitée ? → rotation immédiate (cf. #12)
   - Vulnérabilité applicative ? → rollback du dernier déploiement
   - Attaque en cours ? → active "Attack Challenge Mode" sur Vercel

### Heure H+1

3. Constate les dégâts via la table `activities` :
   ```sql
   SELECT * FROM activities
   WHERE created_at > now() - interval '24 hours'
     AND user_id = '<suspect>'
   ORDER BY created_at DESC;
   ```
4. Vérifie `login_events` pour la device suspect
5. Si fuite de données confirmée → c'est une **violation de données personnelles** :
   - Notification CNIL sous 72h (https://www.cnil.fr/notifications/violations)
   - Notification aux utilisateurs concernés "dans les meilleurs délais"

### Heure H+24

6. Rédige un post-mortem :
   - Qu'est-ce qui s'est passé (faits)
   - Comment c'est arrivé (cause racine)
   - Quel a été l'impact (volume, durée, données concernées)
   - Quelles actions correctives (immédiates + long terme)
7. Publie un résumé public sur `status.centrium-platform.com` et envoie un mail à TOUS les clients (pas que les concernés — transparence)

### Heure H+7 jours

8. Déploie les corrections techniques
9. Audit interne : la même classe de vuln pourrait-elle frapper ailleurs ?
10. Met à jour le runbook avec ce que tu as appris

---

## 15. Cycles récurrents

| Fréquence | Action |
|---|---|
| **Quotidien** | Check Sentry dashboard (10 min) |
| **Hebdomadaire** | Revue des `login_events` avec `is_new_device=true` non `notified_at` |
| **Mensuel** | Restore drill (#13) + revue des permissions accordées aux nouveaux membres |
| **Trimestriel** | Audit grep `service_role` + rotation `SUPABASE_SERVICE_ROLE_KEY` |
| **Annuel** | Pentest externe (Synacktiv, HarfangLab, Yogosha) + audit RLS complet |

---

## 16. Contacts d'urgence

| Rôle | Contact |
|---|---|
| Support Supabase critique | support@supabase.com (mention "P1 — security incident") |
| Support Vercel critique | https://vercel.com/help (Enterprise = phone) |
| CERT-FR (CNIL pour incidents nationaux) | cert.fr@ssi.gouv.fr |
| CNIL (violations RGPD) | Formulaire en ligne https://www.cnil.fr/notifications/violations |
| Hotline juridique RGPD | À choisir (DPO externalisé ou cabinet) |

---

## 17. Checklist avant chaque release prod

- [ ] `npm run type-check` passe
- [ ] `npm run lint` passe
- [ ] Tests E2E isolation cross-tenant passent (si seed multi-tenant en place)
- [ ] Pas de nouveau call `createAdminClient` sans `reason` whitelisté
- [ ] Pas de nouvelle table métier sans `ENABLE ROW LEVEL SECURITY`
- [ ] Migration SQL revue (pas d'`USING (true)` accidentel sur une policy)
- [ ] `git diff` ne contient pas de secret en clair
- [ ] Build prod réussit en local : `npm run build`
- [ ] Smoke test post-deploy : login → dashboard → 1 action métier

---

**Dernière mise à jour de ce runbook** : 4 juin 2026 (Sprint Sécurité initial).
**Prochaine revue** : 1er septembre 2026 (après Sprint 2 hardening).
