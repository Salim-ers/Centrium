# Checklist de mise en production

> À cocher AVANT chaque release majeure.

## Sécurité & RGPD

- [ ] Service role key absente de tout fichier client (`grep -r SUPABASE_SERVICE`)
- [ ] `.env.local` non commité (vérifier `.gitignore`)
- [ ] RLS active sur 100 % des tables sensibles (revue manuelle policies)
- [ ] HTTPS forcé + HSTS header
- [ ] Headers CSP configurés
- [ ] Cookies de session : `httpOnly`, `sameSite=lax`, session-only
- [ ] Bannière cookies fonctionnelle, consentement requis avant analytics
- [ ] Pages légales publiques accessibles : `/legal/privacy`, `/mentions`, `/cgu`, `/cookies`, `/dpa`
- [ ] Page `/security` à jour avec sous-traitants réels
- [ ] DPO / référent données : email actif et monitoré
- [ ] Audit logging activé sur actions sensibles
- [ ] Rate limiting sur routes publiques (`/api/quote-requests`, `/api/cv/*`)

## Qualité code

- [ ] `npm run type-check` passe (0 erreur)
- [ ] `npm run lint` passe (configurer ESLint si pas encore fait)
- [ ] `npm run test` passe
- [ ] `npm run test:e2e` passe sur le parcours critique (login → dashboard)
- [ ] Pas de `console.log` en code de production (utiliser logger)
- [ ] Pas de `// TODO` critique restant dans la PR
- [ ] Pas de `any` non justifié (audit grep)

## Performance

- [ ] Build production réussit (`next build`)
- [ ] Bundle JS analysé (`next build` + analyser bundle stats)
- [ ] Images optimisées (Next Image partout où c'est pertinent)
- [ ] Fonts chargées via `next/font` avec preload
- [ ] LCP < 2.5 s sur landing (test PageSpeed Insights)
- [ ] INP < 200 ms sur interaction dashboard

## Base de données

- [ ] Migrations testées en local + staging
- [ ] Index sur clés de filtre fréquentes (org_id, created_at, status)
- [ ] Pas de migration destructive sans backup confirmé
- [ ] Seed de prod préparé (au moins 1 super_admin)
- [ ] PITR activé côté Supabase

## Tiers & intégrations

- [ ] Stripe : webhook configuré sur l'URL prod
- [ ] Stripe : produits / plans synchronisés
- [ ] Resend / Postmark : domaine vérifié (SPF, DKIM, DMARC)
- [ ] Anthropic : clé API valide, quota suffisant
- [ ] Sentry : DSN configuré, alerting activé

## Conformité

- [ ] Mentions légales validées par un juriste
- [ ] CGU validées par un juriste
- [ ] DPA prêt à signer avec les clients ESN
- [ ] Liste des sous-traitants publique et à jour
- [ ] Politique de rétention documentée et respectée
- [ ] Procédure d'incident testée au moins une fois ([INCIDENT.md](./INCIDENT.md))

## Observabilité

- [ ] Monitoring uptime configuré
- [ ] Alerting Sentry sur erreurs P95
- [ ] Dashboard Supabase : connexions, requêtes lentes
- [ ] Status page accessible et à jour

## Documentation

- [ ] [INSTALL.md](./INSTALL.md) à jour
- [ ] [DEPLOYMENT.md](./DEPLOYMENT.md) à jour
- [ ] CHANGELOG / release notes rédigés
- [ ] Guides utilisateurs à jour avec les nouvelles fonctionnalités

## Comms

- [ ] Email aux clients pour features majeures
- [ ] Mise à jour landing / pricing si pertinent
- [ ] Réseau (LinkedIn, Twitter) si annonce publique
- [ ] Préavis maintenance si downtime prévu

## Post-release

- [ ] Monitoring renforcé pendant 24 h
- [ ] Vérification sentry zéro erreur P0 en 24 h
- [ ] Retours équipe support remontés
- [ ] Post-mortem si incident
