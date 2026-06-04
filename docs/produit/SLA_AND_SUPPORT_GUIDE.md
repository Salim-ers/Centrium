---
title: "SLA & Support Guide Centrium"
subtitle: "Niveaux de service, support, escalade"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
audience: "Clients Centrium, RSSI, Achats, Direction"
type: "sla-support-guide"
---

# SLA & Support Guide Centrium

> Ce document décrit les engagements de service (SLA), niveaux de support, classifications d'incidents et procédures d'escalade applicables aux contrats Centrium. Il est annexé au contrat de service signé entre le client et QuadCore SAS et prévaut sur tout autre document en cas de contradiction sur les sujets traités. Pour les sujets d'administration courante, consultez le [Guide Administrateur](./ADMIN_GUIDE.md). Pour le contexte produit, consultez la [Présentation Entreprise](./PRESENTATION_ENTREPRISE.md).

---

## 1. Vue d'ensemble

### 1.1 Trois niveaux de support

Centrium est commercialisé selon trois niveaux de support, sélectionnables au contrat :

| Niveau | Cible | Inclus avec |
|---|---|---|
| **Standard** | ESN jusqu'à 20 utilisateurs | Tout contrat Centrium |
| **Premium** | ESN > 20 utilisateurs, cabinets de conseil | En option ou contrats > 20 sièges |
| **Enterprise** | Groupes, ETI, contrats > 100 sièges | Plan Enterprise |

À chaque niveau correspond un SLA distinct (disponibilité, temps de réponse, temps de résolution) détaillé dans les sections suivantes.

### 1.2 Trois SLA associés

| SLA | Standard | Premium | Enterprise |
|---|:-:|:-:|:-:|
| Disponibilité mensuelle | **99.5 %** | **99.9 %** | **99.95 %** |
| Heures de support | Lun–Ven 9–18 CET | Lun–Ven 8–20 CET | 24/7 |
| Délai de réponse P1 | 4 h ouvrées | 1 h (24/7) | 30 min (24/7) |
| Canaux | Email + chat | + visio | + téléphone dédié |

### 1.3 Périmètre couvert

Les engagements de ce document s'appliquent à :

- **L'application Centrium** servie sur `*.centrium-platform.com` (interface utilisateur et API privée).
- **L'infrastructure d'hébergement** opérée pour le compte du client (base de données PostgreSQL, stockage de fichiers, authentification, Edge Functions, CDN).
- **Les composants tiers critiques** dans la mesure où QuadCore SAS contractualise lui-même un SLA avec eux (Supabase, Vercel, Anthropic).

Le périmètre **n'inclut pas** :

- Les développements spécifiques, personnalisations sur devis séparé ou intégrations sur mesure.
- Les services tiers configurés par le client (sa boîte mail, son IdP SSO, son outil comptable connecté).
- Les bugs résultant d'un usage manifestement non documenté ou d'une modification non autorisée des paramètres serveur fournis par QuadCore.

---

## 2. Engagements de disponibilité

### 2.1 SLA par niveau

| Niveau de support | Disponibilité mensuelle garantie | Indisponibilité maximale autorisée par mois (30 j) |
|---|:-:|:-:|
| **Standard** | 99.5 % | 3 h 36 min |
| **Premium** | 99.9 % | 43 min 12 s |
| **Enterprise** | 99.95 % | 21 min 36 s |

### 2.2 Calcul de l'uptime

L'uptime mensuel est calculé selon la formule :

```
Uptime (%) = ((Minutes totales du mois − Minutes d'indisponibilité éligibles) / Minutes totales du mois) × 100
```

Avec :

- **Minutes totales du mois** : nombre réel de minutes calendaires (28×24×60 à 31×24×60 selon le mois).
- **Minutes d'indisponibilité éligibles** : minutes pendant lesquelles l'application est **inaccessible aux utilisateurs**, mesurées par notre monitoring externe (sondes multi-régions UE).

### 2.3 Exclusions du calcul

Les périodes suivantes **ne comptent pas** comme indisponibilité au sens du SLA :

- **Maintenance planifiée** annoncée au moins **72 heures** à l'avance (cf. § 3).
- **Force majeure** au sens de l'article 1218 du Code civil (catastrophes naturelles, attaque informatique massive coordonnée, panne majeure d'un opérateur réseau tier).
- **Problèmes côté client** : connectivité Internet de l'utilisateur, configuration locale, navigateur non supporté (versions de plus de 2 ans), pare-feu d'entreprise bloquant le domaine.
- **Indisponibilité d'un service tiers** que le client a explicitement intégré et que Centrium ne contrôle pas (IdP SSO du client, outil comptable connecté).
- **Tests de charge** demandés par le client.

### 2.4 Crédits SLA

En cas de manquement à l'engagement de disponibilité du mois M, le client a droit à un **crédit SLA** sur sa facture du mois M+1, calculé comme suit :

| Uptime mesuré sur le mois | Crédit appliqué sur le MRR |
|---|:-:|
| ≥ engagement contractuel | 0 % |
| Sous engagement, mais ≥ 99.0 % | **5 % MRR** |
| Entre 98.0 % et 99.0 % | **10 % MRR** |
| < 98.0 % | **25 % MRR** + droit de résiliation sans pénalité après 2 mois consécutifs sous seuil |

**MRR** = montant facturé récurrent mensuel hors taxes du contrat concerné.

Le crédit SLA est **plafonné à 25 % du MRR** d'un mois donné. Il est appliqué automatiquement sur la facture suivante ou versé en avoir sur demande.

### 2.5 Procédure de réclamation de crédit SLA

Pour réclamer un crédit SLA non appliqué automatiquement :

1. Adressez un e-mail à `support@centrium-platform.com` avec en objet `[SLA Claim] Org_<votre_org_id> Month_<YYYY-MM>`.
2. **Délai de réclamation : 30 jours** après la fin du mois concerné. Au-delà, la réclamation est forclose.
3. Le formulaire structuré (cf. § 7.5) doit être joint avec : minutes d'indisponibilité observées, captures d'écran, logs côté client si disponibles.
4. QuadCore SAS répond sous **10 jours ouvrés** avec :
   - Confirmation du crédit (calculé sur la base de notre monitoring externe), ou
   - Refus motivé (avec preuves de disponibilité de notre côté), ou
   - Demande d'éléments complémentaires.

---

## 3. Maintenance planifiée

### 3.1 Préavis

Toute maintenance planifiée est annoncée **au moins 72 heures à l'avance** aux contacts admin de chaque organisation.

### 3.2 Fenêtres de maintenance

Les maintenances planifiées sont privilégiées dans les fenêtres suivantes (heure CET) :

- **Nuits en semaine** : du mardi au jeudi, 23h00 → 02h00.
- **Week-ends** : samedi 20h00 → dimanche 06h00.

Les fenêtres en heures ouvrées CET sont **interdites** sauf urgence sécurité (cf. § 4.1).

### 3.3 Communication

Pour chaque maintenance planifiée :

- **E-mail** envoyé aux contacts admin à H-72 et H-2.
- **Bannière in-app** affichée à H-24 avec compte à rebours.
- **Page status** mise à jour à H-72, puis en direct pendant l'opération (Q3 2026).

### 3.4 Durée typique

Une maintenance planifiée Centrium dure typiquement **moins de 30 minutes**. Les maintenances dépassant 60 minutes sont exceptionnelles et annoncées avec un préavis de **7 jours**.

---

## 4. Classification des incidents

Chaque incident est classifié à son ouverture selon une grille de sévérité partagée entre QuadCore SAS et le client. La sévérité peut être révisée en cours de traitement si la situation évolue.

| Sévérité | Définition | Exemples |
|---|---|---|
| **P1 — Critique** | Service indisponible, perte de données, fuite de sécurité confirmée ou suspectée, indisponibilité d'une fonctionnalité critique pour l'ensemble des clients | API totalement inaccessible · Login impossible pour > 50 % des utilisateurs · Confirmation d'accès non autorisé à des données client · Perte de CRA validés |
| **P2 — Majeure** | Feature critique dégradée pour plusieurs clients ou bloquante pour un client unique sans contournement raisonnable | CV Optimizer hors service · Export comptable corrompu · Latence > 5 s sur une page critique · Envoi d'invitations bloqué |
| **P3 — Mineure** | Bug non bloquant, contournement existe et est documenté | Affichage cosmétique défectueux sur Safari · Filtre qui ne tient pas après refresh · Erreur 500 sur une fonction secondaire |
| **P4 — Cosmétique** | Polish, demande d'évolution mineure, amélioration UX | Wording à corriger · Couleur de hover · Suggestion d'amélioration ergonomique |

---

## 5. Délais de réponse cibles

Le **délai de réponse** correspond au temps entre l'ouverture officielle du ticket et la première réponse humaine d'un membre de l'équipe support QuadCore (accusé de réception automatique exclu).

| Sévérité | Standard | Premium | Enterprise |
|---|:-:|:-:|:-:|
| **P1** | 4 h ouvrées | **1 h (24/7)** | **30 min (24/7)** |
| **P2** | 8 h ouvrées | 2 h ouvrées | 1 h ouvrée |
| **P3** | 24 h ouvrées | 8 h ouvrées | 4 h ouvrées |
| **P4** | 5 j ouvrés | 3 j ouvrés | 2 j ouvrés |

**Heures ouvrées** = Lundi à Vendredi 9h00–18h00 CET hors jours fériés français.
**24/7** = tous les jours, toutes les heures, jours fériés compris.

---

## 6. Délais de résolution cibles

Le **délai de résolution** correspond au temps entre l'ouverture officielle du ticket et la mise à disposition d'un **correctif** ou d'un **contournement opérationnel documenté** validé par le client.

| Sévérité | Standard | Premium | Enterprise |
|---|:-:|:-:|:-:|
| **P1** | < 4 h | < 2 h | **< 1 h** |
| **P2** | 1 jour ouvré | 4 h ouvrées | 2 h ouvrées |
| **P3** | 5 j ouvrés | 3 j ouvrés | 2 j ouvrés |
| **P4** | Inclus dans la roadmap (sans engagement de date) | Idem | Idem |

> **Note importante** : pour les P1, le délai de résolution commence au moment de la classification, pas de la première réponse. La résolution peut être un *hotfix* déployé, un *rollback* effectué ou un contournement opérationnel temporaire validé conjointement.

---

## 7. Procédure de signalement

### 7.1 Canal principal — email

Pour les sévérités **P3 et P4**, écrivez à :

> **`support@centrium-platform.com`**

avec en objet `[<Sévérité>] <Titre court>`. Exemple : `[P3] Export CSV CRA vide depuis hier matin`.

### 7.2 Canal in-app — chat

Pour les sévérités **P2, P3 et P4**, utilisez le **chat in-app** (bouton bulle en bas à droite de l'interface). Disponible aux heures de support de votre niveau (cf. § 10).

### 7.3 Hotline sécurité 24/7

Pour tout incident de **sécurité (P1 sécurité)** — accès non autorisé, fuite de données suspectée, vulnérabilité critique découverte :

> **`security@centrium-platform.com`** (24/7, surveillé par astreinte)

L'astreinte sécurité QuadCore garantit un **accusé de réception sous 30 minutes 24/7** et une première qualification sous **1 heure**.

Pour les clients Enterprise, un **numéro de téléphone d'astreinte sécurité** est fourni à la signature du contrat et inscrit dans l'avenant *Coordonnées d'urgence*.

### 7.4 Téléphone d'urgence Enterprise

Les clients Enterprise disposent d'un **numéro de téléphone d'urgence dédié** (24/7) pour tout P1, communiqué à la signature et accessible également depuis `/admin/support` (rubrique réservée aux admins Enterprise).

### 7.5 Formulaire de ticket structuré

Pour faciliter le traitement, tout ticket doit contenir :

- **Sévérité estimée** (P1 / P2 / P3 / P4).
- **Description claire et factuelle** du problème.
- **URL exacte** de la page concernée.
- **Captures d'écran** ou enregistrement vidéo si pertinent.
- **Étapes de reproduction** (numérotées, 1 → N).
- **Comportement attendu** vs **comportement observé**.
- **Impact** : combien d'utilisateurs concernés, criticité métier.
- **Identifiant d'organisation** (visible dans `/admin/audit` ou en pied de page de l'interface).
- **Identifiant d'utilisateur affecté** si différent de l'émetteur.
- **Heure exacte (CET)** de la première observation.

Un modèle réutilisable est fourni à l'annexe 15.2.

---

## 8. Escalade

### 8.1 Niveaux d'escalade

Lorsqu'un ticket ne progresse pas dans les délais attendus, le client peut **escalader** vers le niveau supérieur. Centrium accepte l'escalade dès lors que le délai de réponse cible (cf. § 5) est dépassé de plus de **50 %**.

| Niveau | Périmètre | Cible |
|---|---|---|
| **N1 — Support technique** | Premier contact, qualification, résolution des P3/P4 et de la majorité des P2 | Tous les niveaux |
| **N2 — Engineering on-call** | Investigation profonde, hotfix, rollback | P1 et P2 non résolus en N1 |
| **N3 — Direction technique** | Décision sur incident majeur ou prolongé, communication post-mortem | P1 > 4 h ou P2 > 8 h ouvrées |
| **N4 — Direction générale** | Impact contractuel, négociation crédit ou réversibilité | Tout litige contractuel ou incident > 24 h |

### 8.2 Contacts d'escalade par niveau

| Niveau d'escalade | Standard | Premium | Enterprise |
|---|---|---|---|
| N1 | `support@centrium-platform.com` | `support@centrium-platform.com` | `support@centrium-platform.com` |
| N2 | `support@centrium-platform.com` (escalade automatique) | `escalation@centrium-platform.com` | `escalation@centrium-platform.com` + numéro Enterprise |
| N3 | `escalation@centrium-platform.com` | `escalation@centrium-platform.com` | Responsable de compte dédié (joignable par téléphone) |
| N4 | `escalation@centrium-platform.com` | `escalation@centrium-platform.com` | Directeur Customer Success (coordonnées au contrat) |

### 8.3 Procédure d'escalade côté client

1. Le contact admin envoie un e-mail à l'adresse du niveau cible.
2. Objet : `[ESCALATION N<x>] Ticket #<id> — <résumé>`.
3. Corps : référence du ticket initial, délai écoulé, impact actualisé.
4. QuadCore accuse réception sous **30 minutes** (24/7 pour Enterprise) et confirme le nouveau cycle de traitement.

---

## 9. Communication client pendant un incident

### 9.1 Status page publique

À partir de **Q3 2026**, une page status publique sera disponible sur :

> **`status.centrium-platform.com`**

Elle exposera :

- L'état en temps réel des composants (API, Auth, Database, CDN, Edge Functions, IA Claude).
- Les incidents en cours avec mise à jour horodatée.
- Les maintenances planifiées à venir.
- L'historique de disponibilité des 90 derniers jours.

### 9.2 Notifications par e-mail

Pour les incidents **P1 et P2** :

- **E-mail initial** envoyé aux contacts admin de chaque organisation impactée dans les **15 minutes** suivant la détection.
- **Mises à jour toutes les 30 minutes** pendant la durée d'un P1.
- **Mises à jour toutes les 2 heures** pendant la durée d'un P2.
- **E-mail de résolution** envoyé dès rétablissement, avec un résumé temporaire des causes.

### 9.3 Post-mortem public

Pour tout incident dont l'**impact réel dépasse 1 heure** (toute sévérité confondue), un **post-mortem public** est publié **sous 5 jours ouvrés** sur la status page et envoyé aux contacts admin.

Contenu du post-mortem :

- Chronologie complète horodatée.
- Cause racine (RCA — *Root Cause Analysis*).
- Impact mesuré (utilisateurs, données, fonctions).
- Actions correctives immédiates.
- Actions préventives planifiées (avec dates).

---

## 10. Support inclus par niveau

| Critère | Standard | Premium | Enterprise |
|---|---|---|---|
| **Heures de support** | Lun–Ven 9h–18h CET | Lun–Ven 8h–20h CET | **24/7** |
| **Canaux** | Email + chat in-app | + Visioconférence | + Téléphone dédié |
| **Compte dédié** | Non | Responsable de compte partagé | **Responsable de compte exclusif** |
| **Heures de formation incluses / an** | 2 h | 8 h | **24 h** |
| **Délai SLA pour réclamation crédit** | 14 jours | 7 jours | 3 jours |
| **Status page personnalisée** | Non | Non | Oui (Q4 2026) |
| **Reporting trimestriel** | Non | Synthèse e-mail | **Revue trimestrielle en visio** |
| **Astreinte sécurité 24/7** | Email security@ | Email security@ | Email + téléphone dédié |
| **Post-mortems privés** | Non | Sur demande | Systématiques pour P1 |
| **Accompagnement migration** | Self-service | Assisté | Sur site possible |

---

## 11. Hors périmètre SLA

Les éléments suivants sont explicitement **hors périmètre** des engagements de service de ce document et font l'objet de devis séparés :

- **Développements spécifiques** : intégrations sur mesure, connecteurs métier, modules personnalisés.
- **Migrations exceptionnelles** : reprise d'historique > 2 ans, fusion de plusieurs instances, scission d'organisation.
- **Formations supplémentaires** au-delà des heures incluses par niveau (cf. § 10).
- **Bugs résultant d'un usage manifestement non documenté** ou d'une modification non autorisée.
- **Demandes d'évolution** (P4) — incluses dans la roadmap produit sans engagement de date contractuel.
- **Support des navigateurs en fin de vie** (versions > 2 ans).
- **Récupération de données après suppression définitive** au-delà de la fenêtre PITR (7 jours).

---

## 12. Pénalités et résiliation

### 12.1 Droit de résiliation client

Le client peut résilier le contrat **sans pénalité** dans les cas suivants :

- **Uptime < 98.0 %** pendant **2 mois consécutifs** (sur la base du monitoring externe et après application des exclusions du § 2.3).
- **Incident P1 non résolu** sous 24 heures (Standard), 12 heures (Premium), 6 heures (Enterprise) — hors force majeure documentée.
- **Violation grave** du DPA ou de la confidentialité des données, confirmée par audit externe.

### 12.2 Délai de migration / réversibilité

En cas de résiliation :

- **Notification écrite** du client à `support@centrium-platform.com` + adresse postale officielle.
- **Période de réversibilité : 30 jours** à compter de la date de fin de contrat. Pendant cette période, le client conserve l'accès en lecture pour ses besoins de migration.
- **Export complet** des données fourni **sous 7 jours** après la demande explicite (cf. Guide Administrateur § 6.2).
- **Suppression définitive** à J+30 (ou plus tôt sur demande explicite signée du client).

### 12.3 Données obligatoires conservées

Les éléments suivants peuvent être conservés au-delà de la période de réversibilité pour des obligations légales :

- **Factures Centrium émises au client** (10 ans, Code de commerce).
- **Audit trail de connexions** (durée selon § 7.3 du Guide Administrateur).

---

## 13. Roadmap support 12 mois

| Trimestre | Livrable |
|---|---|
| **Q3 2026** | Status page publique opérationnelle (`status.centrium-platform.com`) · Hotline Enterprise activée avec numéro dédié 24/7 · SSO + MFA disponibles |
| **Q4 2026** | Portail client de tickets (`/support`) · Status page personnalisée Enterprise · Désactivation temporaire de compte · Personnalisation des e-mails transactionnels |
| **Q1 2027** | Base de connaissances vidéo · Assistant IA support (chatbot interne) · SOC 2 Type I publiée · Organisation parent / filiales |

---

## 14. Contacts

| Sujet | Adresse |
|---|---|
| **Support général** (tickets P3/P4, questions) | `support@centrium-platform.com` |
| **Sécurité — astreinte 24/7** (incidents sécurité, fuite suspectée, vulnérabilités) | `security@centrium-platform.com` |
| **Escalade** (ticket dépassant les délais cibles) | `escalation@centrium-platform.com` |
| **RGPD / DPO** (droit d'accès, droit à l'oubli, DPA) | `dpo@centrium-platform.com` |
| **Commercial** (renégociation contrat, montée en gamme support) | `sales@centrium-platform.com` |
| **Administration** (gestion d'organisation, configuration) | `admin@centrium-platform.com` |

Pour les clients Enterprise, les coordonnées personnelles du responsable de compte exclusif et le numéro de téléphone d'astreinte 24/7 figurent dans l'avenant *Coordonnées d'urgence* annexé au contrat.

---

## 15. Annexes

### 15.1 Glossaire SLA

| Terme | Définition |
|---|---|
| **MRR** | *Monthly Recurring Revenue*. Montant facturé récurrent mensuel hors taxes au titre du contrat de service Centrium. Sert de base au calcul des crédits SLA. |
| **RTO** | *Recovery Time Objective*. Temps maximum acceptable pour rétablir le service après un sinistre majeur. Cible Centrium : **4 heures** (Premium) / **2 heures** (Enterprise). |
| **RPO** | *Recovery Point Objective*. Perte de données maximale acceptable en cas de sinistre. Cible Centrium : **15 minutes** grâce au PITR et aux sauvegardes incrémentales. |
| **P1** | Incident critique. Service indisponible, perte de données, fuite sécurité confirmée. Mobilise l'engineering on-call et la direction technique. |
| **P2** | Incident majeur. Feature critique dégradée pour plusieurs clients, sans contournement raisonnable. |
| **P3** | Incident mineur. Bug non bloquant avec contournement documenté. |
| **P4** | Demande cosmétique ou évolution. Incluse dans la roadmap sans engagement de date contractuel. |
| **ETA** | *Estimated Time of Arrival*. Estimation communiquée par QuadCore du moment où une étape sera franchie (correctif déployé, statut résolu). |
| **RCA** | *Root Cause Analysis*. Analyse de la cause racine d'un incident, publiée dans le post-mortem (cf. § 9.3). |
| **Hotfix** | Correctif d'urgence déployé en dehors du cycle de release normal pour résoudre un P1 ou un P2. |
| **PITR** | *Point-in-Time Recovery*. Capacité à restaurer la base à un instant T précis dans les 7 derniers jours. |

### 15.2 Modèle de formulaire incident

```
[__] P1 Critique [__] P2 Majeure [__] P3 Mineure [__] P4 Cosmétique

Organisation : _______________________________________________
Identifiant d'organisation : _________________________________
Émetteur (nom, e-mail, rôle) : _______________________________
Niveau de support contractuel : Standard / Premium / Enterprise

Date et heure de l'incident (CET) : ___________________________
URL exacte concernée : ________________________________________
Utilisateurs impactés (nombre et profils) : __________________

DESCRIPTION DU PROBLÈME
______________________________________________________________
______________________________________________________________

ÉTAPES DE REPRODUCTION (numérotées)
1. ___________________________________________________________
2. ___________________________________________________________
3. ___________________________________________________________

COMPORTEMENT ATTENDU
______________________________________________________________

COMPORTEMENT OBSERVÉ
______________________________________________________________

IMPACT MÉTIER
______________________________________________________________

CAPTURES / VIDÉOS jointes : [__] Oui [__] Non
LOGS CLIENT joints : [__] Oui [__] Non

À envoyer à : support@centrium-platform.com
(ou security@centrium-platform.com si suspicion sécurité)
```

### 15.3 Historique des versions du SLA

| Version | Date | Auteur | Modifications |
|---|---|---|---|
| **1.0** | 2026-06-04 | QuadCore SAS | Première publication officielle. Trois niveaux Standard / Premium / Enterprise. SLA 99.5 / 99.9 / 99.95. Crédits SLA jusqu'à 25 % MRR. Procédure d'escalade en 4 niveaux. Status page annoncée pour Q3 2026. |

Les versions ultérieures seront communiquées par e-mail aux contacts admin avec un préavis de **30 jours** avant entrée en vigueur. Aucune révision rétroactive du SLA en défaveur du client.

---

> **Centrium — SLA & Support Guide v1.0**
> Édité par QuadCore SAS · 2026-06-04
> Annexé au contrat de service Centrium · Document évolutif
> Pour toute question contractuelle : `escalation@centrium-platform.com`
