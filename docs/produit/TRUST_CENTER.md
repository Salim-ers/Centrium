---
title: "Trust Center"
subtitle: "Sécurité, conformité, disponibilité — page publique"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "trust-center"
---

# Trust Center — Centrium

> Cette page rassemble tout ce qu'un acheteur, un RSSI, un juriste ou une équipe Achats
> doit savoir pour évaluer Centrium en confiance. Elle est volontairement courte et
> scannable. Pour les détails techniques, voir le [Security Whitepaper](./SECURITY_WHITEPAPER.md).

---

## 1. Notre promesse

Centrium est conçu pour les ESN qui auditent leurs fournisseurs avant de signer. Nous opérons selon trois engagements simples : **vos données restent en Europe**, **chaque client est isolé en base de données**, et **rien ne change sans qu'on vous en avertisse**. Cette page documente publiquement nos choix d'architecture, nos sous-traitants, nos délais de réponse et notre feuille de route.

| | |
|---|---|
| **Uptime cible** | **99,9 %** mensuel |
| **Hébergement** | **UE only** (Francfort) — données applicatives jamais répliquées hors UE |
| **Conformité** | **RGPD** + CNIL, **DPA signable** sur demande |

---

## 2. Disponibilité

### 2.1 Engagement de service

Centrium vise un **uptime mensuel de 99,9 %**, ce qui correspond à un maximum de ~43 minutes d'indisponibilité non planifiée par mois. La maintenance planifiée est annoncée 72h à l'avance et exécutée sur des plages basses (samedi 5h-7h UTC) lorsque possible.

### 2.2 Status page

`status.centrium-platform.com` — **mise en ligne Q3 2026**. La page rendra publics en temps réel :

- État des composants (App, Auth, Storage, Realtime, IA, Facturation)
- Incidents en cours avec mises à jour datées
- Historique des 90 derniers jours
- Abonnement par email et flux RSS

### 2.3 Notification incidents

- **P1 et P2** : notification email immédiate aux admins de l'organisation concernée
- **Status page** : publication en temps réel dès la prise en charge
- **Post-mortem public** systématique pour tout incident P1 et tout P2 > 1h, publié sous 5 jours ouvrés

---

## 3. Sécurité

Un résumé exécutif des contrôles en place. Le détail technique se trouve dans le [Security Whitepaper](./SECURITY_WHITEPAPER.md).

| Contrôle | Mise en œuvre |
|---|---|
| **Chiffrement en transit** | TLS 1.2 minimum, TLS 1.3 préféré, HSTS preload sur 2 ans |
| **Chiffrement au repos** | AES-256 sur base de données et stockage (Supabase / AWS) |
| **Isolation multi-tenant** | PostgreSQL Row Level Security, testée en CI à chaque PR |
| **Authentification** | Cookies httpOnly, Secure, SameSite=Lax, session-only (meurent à la fermeture du navigateur) |
| **Headers HTTP** | HSTS preload, CSP stricte, X-Frame-Options, X-Content-Type-Options, Permissions-Policy lockdown |
| **Auto-logout** | Script inline + hook React + BroadcastChannel inter-onglets, déclenche un beacon `/api/auth/logout` |
| **Audit applicatif** | Horodatage + auteur sur toutes les opérations sensibles, export à la demande sous 72h |
| **Mots de passe** | Hashage Argon2id côté Supabase Auth |
| **Validation entrées** | 100 % des entrées API et formulaires validées par schéma Zod |
| **SSO + MFA** | Planifié **Q3 2026** (SAML 2.0, SCIM 2.0, MFA TOTP) |

> Cf. [Security Whitepaper](./SECURITY_WHITEPAPER.md) pour les schémas d'architecture, la configuration CSP complète, les politiques RLS, la roadmap certifications et les contacts sécurité.

---

## 4. Conformité

### 4.1 RGPD et CNIL

Centrium est édité par **QuadCore SAS**, société française. La plateforme est conçue pour respecter le Règlement Général sur la Protection des Données (UE 2016/679) :

- **Registre des traitements** tenu à jour (article 30 RGPD)
- **Bases légales** documentées pour chaque finalité
- **Six droits** opérationnels (accès, rectification, effacement, opposition, portabilité, limitation) via `dpo@centrium-platform.com`
- **Notification CNIL sous 72 heures** en cas de violation (article 33 RGPD)
- **Notification client sous 24 heures** en cas d'incident impactant ses données

### 4.2 DPA

Un **Data Processing Agreement** standard est disponible sur demande commerciale. Il couvre les sous-traitants ultérieurs, la localisation des données, les audits, les durées de conservation et les modalités de fin de contrat.

### 4.3 Hébergement européen

Toutes les **données applicatives** (consultants, contacts, CV, factures, CRA, contrats) sont stockées en **région UE (Francfort)**. Les sauvegardes restent en UE. Seuls les **assets statiques publics** (page d'accueil vitrine, polices, images marketing) transitent par le CDN edge mondial pour des raisons de performance.

### 4.4 Certifications

| Certification | État | Échéance |
|---|---|---|
| **SOC 2 Type I** | Planifiée | **Q4 2026** — audit en cours, rapport début 2027 |
| **SOC 2 Type II** | Planifiée | **2027** — observation 12 mois après Type I |
| **ISO 27001** | À l'évaluation | **2027** — décision Q2 2027, certification visée 2028 |
| **Pentest externe** | Planifié | **Q4 2026** — cabinet indépendant français |

Nos sous-traitants infrastructure principaux (Supabase, Vercel, AWS sous-jacent) sont déjà certifiés SOC 2 Type II.

---

## 5. Sous-traitants

Liste publique versionnée. Tout ajout est notifié aux clients par email avec un préavis de 30 jours, conformément au DPA.

| Sous-traitant | Service | Localisation | Certifications |
|---|---|---|---|
| **Supabase Inc.** | Base de données managée, Auth, Storage, Realtime | UE (Francfort) | SOC 2 Type II, HIPAA-ready |
| **Vercel Inc.** | Hébergement Next.js, CDN edge | UE primaire + edge mondial (assets publics seulement) | SOC 2 Type II |
| **Anthropic** | Claude API pour modules IA — pas de rétention pour entraînement | UE / US | SOC 2 Type II |
| **Stripe** (à venir Q4 2026) | Facturation produit Centrium | UE | PCI-DSS Level 1, SOC 2 Type II |
| **Formspree** | Collecte formulaires marketing site vitrine | UE | DPA standard |
| **Resend** | Envoi emails transactionnels | UE | DPA standard, CCT |

Tous ont signé un DPA conforme au RGPD. Les transferts hors UE (lorsqu'ils ont lieu) sont encadrés par les **Clauses Contractuelles Types** de la Commission européenne, version 2021.

---

## 6. Support & SLA

### 6.1 Trois niveaux de support

| Niveau | Délai première réponse | Couverture | Canaux |
|---|---|---|---|
| **Standard** (inclus) | 24 h ouvrées | Heures ouvrées 9h-19h FR | Email, centre d'aide |
| **Premium** (option) | 4 h ouvrées | Heures ouvrées 9h-19h FR | Email, chat in-app, hotline |
| **Enterprise** (option) | 1 h, 24/7 P1 | 24/7 pour P1, ouvrées sinon | Email, chat, hotline, Customer Success Manager dédié |

### 6.2 Résolution par sévérité

| Sévérité | Réponse | Résolution cible |
|---|---|---|
| **P1 — Critique** (service down, fuite suspectée) | < 1 h (24/7 Enterprise, ouvrées sinon) | 4 h |
| **P2 — Majeure** (fonctionnalité critique dégradée) | < 4 h ouvrées | 24 h |
| **P3 — Mineure** (bug 1 client / non critique) | < 24 h ouvrées | 5 jours ouvrés |
| **P4 — Cosmétique** | < 5 jours ouvrés | Selon roadmap |

### 6.3 Escalade

Tout client peut escalader à un Customer Success Manager (Enterprise) ou à `success@centrium-platform.com` (Standard / Premium) si une demande P1 ou P2 dépasse les délais cibles.

---

## 7. Contact sécurité

| Sujet | Adresse | Délai cible |
|---|---|---|
| Vulnérabilité, faille de sécurité | `security@centrium-platform.com` | < 24 h ouvrées |
| DPO, droits RGPD, DPA | `dpo@centrium-platform.com` | < 30 jours |
| Audit fournisseur, questionnaire RSSI | `security@centrium-platform.com` | < 5 jours ouvrés |
| Support produit | `support@centrium-platform.com` | Selon SLA (cf. §6) |

**Clé PGP** : publiée **Q3 2026** sur `https://www.centrium-platform.com/.well-known/security.txt`. En attendant, tout canal sécurisé est accepté sur demande (S/MIME, ProtonMail, dépôt chiffré). 

**Bug Bounty / Coordinated Disclosure** : programme lancé **Q4 2026** via la même page `security.txt`. Centrium s'engage à ne pas poursuivre les chercheurs ayant agi de bonne foi dans le cadre d'une divulgation responsable, et à reconnaître publiquement leur contribution sur demande.

---

## 8. Nos engagements

Trois engagements écrits, qui valent contrat moral.

### 8.1 Transparence

- **Roadmap publique** : mise à jour trimestrielle sur le site, incluant les fonctionnalités sécurité.
- **Changelog public** : journal de version publié à chaque release majeure, avec mentions explicites des changements de sécurité.
- **Sous-traitants nommés** : liste publique versionnée (cf. §5), notification 30 jours avant tout ajout.

### 8.2 Réversibilité

- **Export complet sur demande** sous **7 jours ouvrés** : structure JSON + fichiers (CV, contrats, factures) en archive chiffrée.
- **Aucun lock-in technique** : les données métier sont standard (consultants, contacts, missions) et exportables sans transformation.
- **Période de récupération post-résiliation** : 30 jours après la fin du contrat pour récupérer l'export, puis effacement définitif.

### 8.3 Notification

- **CNIL sous 72 heures** en cas de violation de données personnelles (article 33 RGPD).
- **Clients sous 24 heures** par email aux admins de l'organisation concernée, en cas d'incident P1/P2 impactant leurs données.
- **Sous-traitants sous 30 jours** avant tout ajout ou retrait.

---

## 9. FAQ Trust

**Où sont stockées mes données ?**
Sur PostgreSQL managé Supabase, région UE Francfort. Sauvegardes incluses. Aucune donnée applicative n'est répliquée hors UE.

**Qui peut accéder à mes données chez QuadCore ?**
Personne en routine. L'équipe QuadCore opère sur une console séparée (`super_admin`) qui n'expose pas les données métier. Un accès ponctuel aux données client n'est possible qu'à votre demande explicite (support sur dossier), tracé en audit log, et limité dans le temps.

**Comment puis-je récupérer mes données ?**
À tout moment via export self-service (modules consultants, contacts, factures) ou via demande à `support@centrium-platform.com` pour un export complet sous 7 jours.

**Que se passe-t-il si QuadCore ferme ?**
Le DPA contractuel prévoit une **clause d'escrow** : en cas de cessation d'activité non concertée, vous disposez de 90 jours pour récupérer vos données via une procédure documentée pré-établie, et le code applicatif est versionné chez un séquestre tiers (à mettre en place Q1 2027). En attendant, la portabilité standard de vos données (export JSON + fichiers) reste votre garantie principale.

**Mes données sont-elles utilisées pour entraîner une IA ?**
Non. Les appels à l'API Claude d'Anthropic sont configurés en mode stateless avec **opt-out de la rétention pour entraînement**. Aucun CV, aucun contact, aucun document client n'est utilisé pour entraîner ou affiner un modèle, par QuadCore ou par Anthropic.

**Le rôle admin chez QuadCore peut-il lire mes données ?**
Non. Le rôle `super_admin` côté QuadCore opère sur une console séparée qui n'a accès qu'aux clients (organisations), abonnements, et métriques agrégées. L'accès aux données métier d'une organisation requiert une demande client explicite, et tout accès est journalisé.

**Comment êtes-vous protégés contre une faille critique chez Supabase ou Vercel ?**
Nos sauvegardes (PITR 7 jours, snapshots quotidiens 30 jours, versioning Storage) sont récupérables indépendamment d'un fournisseur compromis. En cas de défaillance critique d'un sous-traitant, nous disposons d'un **plan de migration documenté** et d'un objectif de RTO de 4 heures.

---

## 10. Documents téléchargeables

| Document | Format | Disponibilité |
|---|---|---|
| **Security Whitepaper** | PDF | [Télécharger](./SECURITY_WHITEPAPER.md) |
| **DPA modèle** | PDF | Sur demande à `legal@centrium-platform.com` |
| **Architecture Overview** | PDF | Sur demande à `security@centrium-platform.com` |
| **SLA & Support** | PDF | Sur demande à `success@centrium-platform.com` |
| **Présentation Entreprise** | PDF | [Télécharger](./PRESENTATION_ENTREPRISE.md) |

---

> **Cette page est versionnée.**
> Version 1.0 — 04 juin 2026 — première publication.
> Prochaine revue : Q3 2026, après mise en ligne de la status page et publication du `security.txt`.
>
> Pour toute question sur ce Trust Center : `security@centrium-platform.com`.
