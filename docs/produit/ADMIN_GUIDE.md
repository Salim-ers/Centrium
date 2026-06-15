---
title: "Guide Administrateur Centrium"
subtitle: "Configuration, gouvernance et opérations courantes d'une organisation Centrium"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
audience: "Administrateurs Centrium"
type: "admin-guide"
---

# Guide Administrateur Centrium

> Ce guide s'adresse aux personnes en charge de la configuration, de la gouvernance et de la sécurité d'une organisation Centrium. Il complète le [Manuel utilisateur](./MANUEL_UTILISATEUR.md) (sections 13 *Paramètres*) et la [Présentation entreprise](./PRESENTATION_ENTREPRISE.md). Les engagements de service et procédures d'incident sont décrits dans le [SLA & Support Guide](./SLA_AND_SUPPORT_GUIDE.md).

---

## 1. Rôle de l'administrateur

L'administrateur d'une organisation Centrium est l'utilisateur de référence pour tout ce qui concerne la configuration métier, la gouvernance des accès, la conformité RGPD et la sécurité de l'organisation. C'est en pratique le **propriétaire fonctionnel** de l'espace.

### 1.1 Responsabilités

- **Périmètre d'accès** : inviter, retirer, changer le rôle des membres de l'organisation.
- **Identité commerciale** : configurer la raison sociale, le SIREN, la TVA, l'adresse, le logo, les couleurs et la signature du représentant.
- **Conformité RGPD** : déclencher exports, droit à l'oubli, conservation longue durée, signature du DPA.
- **Sécurité** : politique de mot de passe, déclenchement des resets, suivi des sessions actives (Q4 2026), activation SSO/MFA (Q3 2026).
- **Audit** : consulter l'historique des actions sensibles, exporter le journal d'audit en cas de demande externe.
- **Continuité** : déclencher la réversibilité (export complet) et coordonner une migration sortante si nécessaire.

### 1.2 Périmètre

Un administrateur dispose des droits suivants **dans le périmètre strict de son organisation** :

- Tous les droits de lecture et d'écriture sur les données métier (consultants, contacts, opportunités, contrats, CRA, factures).
- Accès à toutes les pages `/admin/*` et `/settings/*`.
- Capacité à signer un export d'organisation au format ZIP (cf. § 6).
- Aucun accès aux données d'une autre organisation (cf. § 8 sur le multi-tenant RLS).

> **À retenir** : l'administrateur n'a pas accès aux mots de passe des autres utilisateurs. En cas de blocage, il déclenche un *password reset* qui envoie un lien au membre concerné (cf. § 10.2).

---

## 2. Gestion de l'organisation

### 2.1 Identité légale

L'identité légale de votre organisation est exposée sur tous les documents générés par Centrium (factures, contrats, e-mails) et alimente la conformité comptable. Elle se configure dans `Paramètres > Identité visuelle` (`/settings/branding`) section **Identité légale**.

Champs disponibles :

- **Raison sociale** — nom commercial complet (ex. *Acme Conseil SAS*).
- **Forme juridique** — SAS, SARL, SA, SASU, autre.
- **SIREN** — 9 chiffres, validé côté serveur.
- **TVA intracommunautaire** — FR + clé + SIREN, validé.
- **Adresse du siège social** — rue, code postal, ville, pays (EU uniquement pour le moment).
- **Code APE / NAF** — facultatif, recommandé pour les exports comptables.
- **IBAN / BIC** — pour la facturation client.

Toute modification est tracée dans l'audit trail (cf. § 7).

### 2.2 Multi-organisation

Un même utilisateur Centrium peut être membre de plusieurs organisations — par exemple un consultant *partner* qui intervient pour deux ESN, ou un *business manager* qui gère deux entités d'un même groupe.

Centrium gère ce cas nativement : chaque session est rattachée à **une seule organisation active à la fois**. Les données ne circulent jamais entre organisations.

### 2.3 Switch d'organisation active

L'organisation active est visible en haut à gauche de la sidebar. Pour changer :

1. Cliquez sur le nom de l'organisation (ou son logo).
2. Sélectionnez l'organisation cible dans la liste déroulante.
3. La page recharge automatiquement avec le contexte de la nouvelle organisation.

> **Important** : un switch d'organisation purge les filtres en cours, la recherche globale et la sélection courante. Sauvegardez votre travail avant.

---

## 3. Gestion des utilisateurs

### 3.1 Inviter un membre

L'invitation se fait depuis `Paramètres > Équipe` (`/settings/team`) → bouton **Inviter un membre**.

**Procédure** :

1. Saisissez l'adresse e-mail du futur membre.
2. Choisissez son rôle parmi les 6 disponibles (cf. § 3.2).
3. Validez. Centrium envoie un **e-mail signé** contenant un lien à **usage unique**, **valable 7 jours**.
4. Le destinataire crée son mot de passe et entre dans l'organisation avec le rôle attribué.

Caractéristiques techniques de l'invitation :

- **Lien signé HMAC** : impossible à forger ou à deviner.
- **Usage unique** : le lien expire dès qu'il est consommé.
- **Validité 7 jours** : au-delà, l'invitation est marquée *expirée* et doit être régénérée.
- **E-mail expéditeur** : l'adresse `noreply@centrium-platform.com` avec SPF/DKIM/DMARC alignés.

### 3.2 Matrice de permissions par rôle

Les 6 rôles disponibles dans Centrium sont définis ainsi :

| Permission | admin | business_manager | recruiter | finance | viewer | consultant |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Créer un consultant | OUI | OUI | OUI | non | non | non |
| Voir les consultants | OUI | OUI | OUI | OUI | OUI | son propre profil |
| Modifier un consultant | OUI | OUI | OUI | non | non | son propre profil |
| Archiver un consultant | OUI | OUI | non | non | non | non |
| Voir le CRM | OUI | OUI | OUI | OUI | OUI | non |
| Créer une opportunité | OUI | OUI | OUI | non | non | non |
| Modifier le statut d'une opportunité | OUI | OUI | non | non | non | non |
| Voir les CRA | OUI | OUI | OUI | OUI | OUI | ses CRA |
| Valider un CRA | OUI | OUI | non | non | non | non |
| Voir les factures | OUI | OUI | non | OUI | non | non |
| Marquer une facture payée | OUI | non | non | OUI | non | non |
| Exporter compta (Sage/Pennylane) | OUI | non | non | OUI | non | non |
| Gérer l'équipe (inviter/retirer) | OUI | non | non | non | non | non |
| Gérer le branding | OUI | non | non | non | non | non |
| Gérer la confidentialité (RGPD) | OUI | non | non | non | non | non |
| Configurer SSO / MFA | OUI | non | non | non | non | non |

> **Note** : un même utilisateur ne peut avoir qu'**un seul rôle** par organisation. Pour qu'un BM puisse aussi gérer les factures, attribuez-lui le rôle `admin` ou créez un compte distinct.

### 3.3 Modifier le rôle d'un membre

1. `Paramètres > Équipe` → ligne du membre.
2. Menu kebab `⋮` → **Changer le rôle**.
3. Sélectionnez le nouveau rôle. Le changement est immédiat.
4. Le membre reçoit un e-mail de notification automatique.

Le changement est tracé dans l'audit trail (action `member.role_changed`).

### 3.4 Retirer un membre

1. `Paramètres > Équipe` → ligne du membre.
2. Menu kebab `⋮` → **Retirer de l'organisation**.
3. Confirmez.

**Effets immédiats** :

- Le membre perd tout accès à votre organisation.
- Ses sessions actives sont invalidées à la prochaine requête.
- Les entités qu'il a créées (consultants, opportunités, etc.) **restent dans l'organisation** — elles ne sont pas supprimées.
- L'historique de ses actions reste dans l'audit trail.

**Ce que le membre conserve** :

- Son compte Centrium personnel (e-mail, mot de passe, profil).
- L'accès à toute autre organisation dont il est membre.

**Ce qu'il perd** :

- Toutes les données de votre organisation, immédiatement.
- L'ensemble de ses tokens d'API associés à votre organisation (le cas échéant).

> **Avant de retirer un membre commercial** : assurez-vous de réattribuer ses opportunités ouvertes à un autre BM, sans quoi elles deviennent orphelines (toujours visibles, mais sans owner défini).

### 3.5 Réinvitations expirées

Une invitation non utilisée sous 7 jours passe au statut *expirée*. Pour la régénérer :

1. `Paramètres > Équipe` → onglet **Invitations en cours**.
2. Trouvez la ligne *expirée*.
3. Cliquez **Renvoyer**. Un nouveau lien est généré et envoyé. Le précédent reste invalide.

---

## 4. Sécurité de l'organisation

### 4.1 Politique de mot de passe

Centrium s'appuie sur la politique de mot de passe de Supabase Auth, renforcée côté applicatif :

- Minimum **12 caractères**.
- Au moins **3 catégories** parmi : minuscules, majuscules, chiffres, caractères spéciaux.
- Refus des **10 000 mots de passe les plus compromis** (liste HaveIBeenPwned intégrée).
- Refus des séquences triviales (azerty, 123456, nom de l'organisation, etc.).

La politique s'applique à toute création et tout changement de mot de passe.

### 4.2 Sessions et auto-logout

- Les sessions Centrium sont **cookie-only** (`httpOnly` + `Secure` + `SameSite=Lax`).
- Les cookies sont **session-only** : ils sont purgés à la fermeture du navigateur.
- Un utilisateur dont le navigateur restaure la session via "Continue where you left off" est automatiquement déconnecté côté serveur à la première requête.

> **Pour l'admin** : il n'y a donc jamais de session zombie côté Centrium. Un utilisateur quittant son poste ferme le navigateur et la session est terminée.

### 4.3 SSO (Single Sign-On)

**Disponibilité : Q3 2026.**

Centrium supportera SAML 2.0 et OIDC en option Enterprise. La configuration sera disponible depuis `Paramètres > Sécurité > SSO` et activable par l'admin sur :

- Okta
- Microsoft Entra ID (ex-Azure AD)
- Google Workspace
- IdP générique conforme SAML 2.0 / OIDC

Le mode *SSO obligatoire* sera disponible (forçant tous les membres à passer par le SSO du domaine) avec exception explicite pour l'admin de secours.

### 4.4 MFA (authentification multi-facteurs)

**Disponibilité : Q3 2026.**

MFA TOTP (Google Authenticator, Authy, 1Password) sera disponible pour tous les plans. Mode *MFA obligatoire* configurable par l'admin pour l'ensemble de l'organisation.

### 4.5 Liste des sessions actives

**Disponibilité : Q4 2026.**

Une page dédiée `Paramètres > Sécurité > Sessions` permettra à l'admin de visualiser et révoquer à distance les sessions actives de tout membre de l'organisation. Aujourd'hui, la révocation se fait par changement de mot de passe forcé (cf. § 10.2).

---

## 5. Branding et identité visuelle

L'admin contrôle l'identité visuelle de l'organisation depuis `Paramètres > Identité visuelle` (`/settings/branding`).

### 5.1 Logo

- **Formats acceptés** : PNG ou SVG.
- **Taille recommandée** : 512×512 px minimum, fond transparent.
- **Comportement** : redimensionné automatiquement pour la sidebar (32×32), les en-têtes de documents (200×60), le favicon (32×32) et les e-mails (48×48).
- **Fallback** : si aucun logo n'est défini, Centrium affiche les initiales de la raison sociale dans un carré teinté de la couleur primaire.

### 5.2 Couleurs

- **Couleur primaire** — Utilisée pour les boutons principaux, les liens, les badges actifs, l'accent des CV générés.
- **Couleur d'accent** — Utilisée pour les sous-titres, les détails, les hover states.

Les couleurs doivent respecter un contraste suffisant avec le fond (ratio ≥ 4.5:1 pour WCAG AA). Centrium affiche un avertissement si la couleur saisie ne respecte pas le contraste minimum.

### 5.3 Tagline pied de page

Phrase courte (max 120 caractères) affichée en bas des documents générés (CV, contrats, factures). Exemple : *"Acme Conseil — votre expert SI depuis 2014"*.

### 5.4 Signature du représentant

- **Format** : PNG transparent.
- **Taille recommandée** : 300×100 px.
- **Utilisation** : intégrée dans les contrats commerciaux et les e-mails commerciaux personnalisés.

### 5.5 Template CV par défaut

Choisissez parmi **Standard**, **Dense** ou **Executive**. Ce choix s'applique à tous les CV générés sans surcharge manuelle. Un BM peut choisir un autre template au cas par cas depuis le sélecteur du CV Optimizer.

### 5.6 Où le branding apparaît

| Élément | Apparition du branding |
|---|---|
| CV générés (3 templates) | Logo en-tête, couleurs accent, tagline pied de page |
| Contrats commerciaux | Logo en-tête, signature représentant, mentions légales |
| Factures clients | Logo en-tête, couleurs accents, mentions légales, IBAN |
| E-mails transactionnels | Logo en-tête, couleur primaire des CTA |
| Favicon navigateur | Logo redimensionné 32×32 |
| Sidebar in-app | Logo 32×32 + nom commercial |
| Portail consultant (`/portal`) | Logo et couleurs de votre organisation |

---

## 6. Conformité et RGPD

L'admin gère la conformité RGPD depuis `Paramètres > Confidentialité` (`/settings/privacy`).

### 6.1 Conservation longue durée pour la comptabilité

Activez l'option **Conservation longue durée** pour conserver factures et CRA pendant **10 ans** conformément au Code de commerce. Cette option est activée par défaut pour les organisations françaises.

Durées par catégorie :

| Catégorie | Durée par défaut | Durée long terme | Justification |
|---|---|---|---|
| Factures | 10 ans | 10 ans | Code de commerce art. L123-22 |
| CRA validés | 10 ans | 10 ans | Adossé à la facture associée |
| Contrats signés | 10 ans | 10 ans | Code civil + URSSAF |
| Fiches consultants actifs | Indéfini | Indéfini | Tant que le consultant est actif |
| Fiches consultants inactifs | 3 ans | 5 ans | Sans interaction commerciale |
| Audit trail | 2 ans | 5 ans | Sécurité et traçabilité |
| Sessions / connexions | 90 jours | 1 an | Sécurité opérationnelle |

### 6.2 Export des données de l'organisation

Procédure :

1. `Paramètres > Confidentialité` → bouton **Exporter toutes les données de l'organisation**.
2. Confirmez avec votre mot de passe (re-authentification).
3. Une demande est enregistrée et un job asynchrone est déclenché.
4. **Délai de production : 7 jours maximum** (généralement < 24 h).
5. Vous recevez un e-mail avec un lien signé pour télécharger le ZIP.
6. Le lien est valable **48 heures** après réception.

**Format du ZIP** :

- `organization.json` — méta-données de l'organisation
- `members.csv` — liste des membres (sans mots de passe)
- `consultants/` — un dossier par consultant (fiche JSON + documents binaires)
- `contacts.csv`
- `opportunities.csv`
- `contracts/` — un dossier par contrat (PDF + métadonnées)
- `cras/` — un dossier par CRA (PDF + JSON)
- `invoices/` — un dossier par facture (PDF + JSON)
- `audit_trail.csv` — historique complet sur la période disponible
- `README.md` — index du contenu

### 6.3 Droit à l'oubli d'un utilisateur

Lorsqu'un utilisateur exerce son droit à l'oubli (RGPD article 17) :

1. `Paramètres > Équipe` → ligne du membre → menu `⋮` → **Droit à l'oubli**.
2. Confirmez la demande.
3. Le compte passe en statut *suppression programmée*.
4. **Période de réversibilité : 30 jours**. Pendant cette période, l'admin peut annuler la demande.
5. À J+30, suppression définitive : profil, avatar, e-mail, mot de passe, sessions, tokens. **Les entités créées par l'utilisateur (consultants, opportunités) restent dans l'organisation** mais l'auteur n'est plus identifiable nominativement (remplacé par *Utilisateur supprimé*).

### 6.4 Sous-traitants

L'admin peut consulter à tout moment la liste des sous-traitants de Centrium depuis `Paramètres > Confidentialité > Sous-traitants` :

- **Supabase** (DB + Auth + Storage, région EU) — *Sous-traitant principal*
- **Vercel** (CDN edge, frontend) — *Sous-traitant principal*
- **Anthropic** (Claude API pour les modules IA, no-training opt-in) — *Sous-traitant IA*
- **Stripe** (facturation produit) — *Sous-traitant paiement, à venir*

Tout changement de sous-traitant est notifié 30 jours à l'avance aux contacts admin de l'organisation.

### 6.5 DPA (Data Processing Agreement)

Le DPA Centrium est disponible :

- En lecture depuis `Paramètres > Confidentialité > DPA` (version PDF horodatée).
- En signature électronique (DocuSign) sur demande à `dpo@centrium-platform.com`.
- Renouvelé tacitement à chaque renouvellement de contrat.

---

## 7. Audit trail

### 7.1 Actions auditées

Centrium horodate et associe à un utilisateur les catégories d'actions suivantes :

- **Membres** : invitation, acceptation, changement de rôle, retrait, droit à l'oubli.
- **Consultants** : création, modification de champs sensibles, archivage, suppression.
- **Documents** : upload, téléchargement, export PDF/DOCX, suppression.
- **Opportunités** : création, changement de statut, suppression.
- **CRA** : soumission, validation, refus, modification après validation.
- **Factures** : création, marquage payée, annulation.
- **Exports** : export comptable, export RGPD, export d'audit.
- **Authentification** : connexion, échec de connexion, déconnexion, reset mot de passe.
- **Sécurité** : changement de rôle, activation SSO/MFA, modification politique mot de passe.

### 7.2 Consultation

`/admin/audit` est accessible aux rôles `admin` et `super_admin` uniquement. La page affiche :

- Date / heure (UTC + fuseau local)
- Utilisateur (e-mail + rôle au moment de l'action)
- Action (verbe + objet)
- Cible (ID de l'entité concernée)
- Adresse IP (anonymisée /24)
- User-Agent (synthétique)
- Diff JSON pour les modifications de champ

Filtres disponibles : par utilisateur, par catégorie, par plage de dates, par sévérité.

### 7.3 Conservation

| Catégorie | Durée standard | Durée Enterprise |
|---|---|---|
| Connexions / déconnexions | 90 jours | 1 an |
| Modifications de données métier | 2 ans | 5 ans |
| Actions sensibles (suppression, export, rôle) | 5 ans | 7 ans |
| Incidents sécurité | Indéfini | Indéfini |

### 7.4 Export d'audit

Depuis `/admin/audit`, bouton **Exporter** :

- Format CSV ou JSON
- Périmètre filtré (date, utilisateur, catégorie)
- Limite : 100 000 lignes par export
- Le téléchargement est lui-même tracé dans l'audit trail (action `audit.exported`)

---

## 8. Multi-tenant : ce qu'un admin doit savoir

Centrium est conçu en **multi-tenant strict** sur PostgreSQL avec *Row Level Security* (RLS) activée sur toutes les tables sensibles.

### 8.1 Aucune fuite entre organisations

- Toutes les tables métier portent une colonne `organization_id`.
- Une policy RLS PostgreSQL filtre automatiquement chaque requête par l'organisation active.
- **Il n'existe aucun "joker admin global"** capable de lire des données d'une autre organisation.
- Même un éventuel rôle `super_admin` interne QuadCore ne peut pas contourner la RLS — il doit explicitement se rattacher à l'organisation pour en lire les données, et l'action est tracée.

### 8.2 Si vous gérez plusieurs ESN

Vous devez **switcher d'organisation** (cf. § 2.3) pour passer d'un contexte à l'autre. Aucune jointure n'est possible entre les deux. Une recherche globale ne renvoie que les résultats de l'organisation active.

### 8.3 Invitations scopées

Une invitation envoyée à `alice@example.com` depuis l'organisation A ne donne accès qu'à l'organisation A. Si Alice rejoint ensuite l'organisation B via une autre invitation, elle aura deux organisations dans son compte, indépendantes.

> **Pour les groupes multi-entités** : la fonctionnalité *organisation parent / filiales* avec consolidation de vue est prévue pour **Q1 2027** (cf. § 11.1).

---

## 9. Onboarding équipe

Pour un déploiement Centrium efficace sur une nouvelle organisation, suivez les 5 étapes ci-dessous. Comptez environ **2 heures de travail admin sur 1 à 2 semaines**.

### 9.1 Étape 1 — Inviter les Business Managers et recruteurs

- Identifiez les 3 à 8 personnes qui utiliseront Centrium quotidiennement.
- Invitez-les en leur attribuant le rôle adapté (`business_manager` pour les BM, `recruiter` pour les recruteurs, `finance` pour la compta, `admin` pour les co-administrateurs).
- Demandez-leur d'accepter sous 48 heures pour ne pas avoir à régénérer les liens.

### 9.2 Étape 2 — Configurer le branding

Avant de générer le premier CV ou la première facture :

- Téléversez votre logo.
- Configurez les couleurs primaire et accent.
- Saisissez votre raison sociale, SIREN, TVA, adresse, IBAN.
- Téléversez la signature du représentant légal.
- Sélectionnez le template CV par défaut (*Standard*, *Dense* ou *Executive*).

### 9.3 Étape 3 — Importer la bibliothèque consultants

Deux méthodes :

- **CSV** : modèle disponible depuis `/consultants/import`. Compatible Excel et Google Sheets. Champs minimum requis : prénom, nom, e-mail, séniorité, stack principale.
- **Parsing CV** : déposez les fichiers PDF/DOCX en masse, Centrium parse et crée les fiches. Volume recommandé : 50 CV par batch.

### 9.4 Étape 4 — Importer le carnet de contacts

- Modèle CSV depuis `/contacts/import`.
- Compatible avec un export LinkedIn Sales Navigator (mapping automatique des colonnes).
- Tags d'origine préservés.

### 9.5 Étape 5 — Reprise des CRA en cours (option)

Pour les organisations en exercice avec des CRA déjà en cours :

- Module **Reprise CRA** activable sur demande à `support@centrium-platform.com`.
- Saisie groupée des CRA du mois précédent avec validation BM en masse.
- Recommandé pour basculer en début de mois civil.

---

## 10. Maintenance et opérations courantes

### 10.1 Détection d'une nouvelle version

Centrium est mis à jour en continu. À chaque release :

- **Bannière in-app** sur la page d'accueil pour les releases majeures (toutes les 2 à 4 semaines).
- **Changelog** accessible depuis `Aide > Changelog` (à venir Q3 2026, en attendant : annonces e-mail mensuelles aux contacts admin).
- **Statut public** sur `status.centrium-platform.com` (Q3 2026).

### 10.2 Utilisateur bloqué — procédure password reset

1. Le membre clique sur **Mot de passe oublié** depuis la page de connexion.
2. Il reçoit un e-mail avec un lien signé valable **2 heures**.
3. Il définit un nouveau mot de passe.
4. **Toutes ses sessions actives sont invalidées** immédiatement.

Si le membre ne reçoit pas l'e-mail :

1. Vérifiez les spams et la conformité du nom de domaine.
2. L'admin peut déclencher un *reset forcé* depuis `Paramètres > Équipe` → menu `⋮` → **Forcer la réinitialisation**.

### 10.3 Retirer un consultant qui quitte l'ESN

1. `Consultants` → fiche du consultant → menu `⋮` → **Archiver**.
2. Le consultant passe en statut *archivé*. Il n'apparaît plus dans la recherche par défaut mais ses données restent en base.
3. **Effets cascade** :
   - Les missions actives ne sont **pas** clôturées automatiquement. Clôturez-les manuellement.
   - Les CRA en cours ne sont **pas** annulés. Validez ou refusez selon la situation.
   - Les factures déjà émises restent intactes (obligation légale).
   - Si le consultant avait un compte d'accès au portail (`/portal`), retirez-le aussi de `Paramètres > Équipe`.

### 10.4 Quitter Centrium — réversibilité

À tout moment, l'admin peut déclencher un **export complet de l'organisation** (cf. § 6.2).

En cas de résiliation contractuelle :

- **Export complet** garanti **sous 7 jours** après la demande.
- **Conservation des données** pendant **30 jours** après la fin du contrat (période de récupération).
- **Suppression définitive** à J+30 (ou plus tôt sur demande explicite).

Aucune donnée d'organisation n'est conservée au-delà de la période de réversibilité, à l'exception des éléments légalement obligatoires (factures, contrats signés) qui sont restitués à l'organisation avant suppression.

---

## 11. Cas particuliers

### 11.1 Groupe multi-entités (parent / filiales)

La fonctionnalité **organisation parent / filiales** avec vue consolidée est prévue pour **Q1 2027**.

En attendant, pour un groupe avec plusieurs filiales :

- Créez une organisation Centrium par filiale.
- Les utilisateurs administrant plusieurs filiales utilisent le switch d'organisation (cf. § 2.3).
- Les reportings consolidés se font manuellement à partir des exports CSV de chaque organisation.

### 11.2 Audit externe d'un acheteur grand compte

Lorsqu'un acheteur Enterprise (DSI, RSSI, équipe Achats) demande à auditer votre fournisseur (Centrium), vous pouvez transmettre directement :

- La [Présentation entreprise](./PRESENTATION_ENTREPRISE.md) (sécurité, RGPD, sous-traitants).
- Le [SLA & Support Guide](./SLA_AND_SUPPORT_GUIDE.md) (engagements de service).
- Le DPA signé (téléchargeable depuis `Paramètres > Confidentialité > DPA`).
- Les attestations d'hébergement Supabase et Vercel (sur demande à `support@centrium-platform.com`).
- L'attestation SOC 2 Type I (prévue Q4 2026) — en attendant, une lettre de positionnement RSSI est disponible sur demande à `security@centrium-platform.com`.

### 11.3 Procédure de réponse en cas d'incident

Pour tout incident de service (P1, P2) ou de sécurité, suivez le processus de signalement et d'escalade décrit dans le [SLA & Support Guide § 7 et § 8](./SLA_AND_SUPPORT_GUIDE.md#7-procédure-de-signalement).

---

## 12. Annexes

### 12.1 Glossaire admin

| Terme | Définition |
|---|---|
| **RLS** | *Row Level Security*. Mécanisme PostgreSQL qui filtre automatiquement les lignes accessibles à un utilisateur selon une policy. Garantit l'isolation multi-tenant chez Centrium. |
| **Audit trail** | Journal horodaté et signé des actions sensibles dans une organisation. Consultable par l'admin sur `/admin/audit`. |
| **SSO** | *Single Sign-On*. Authentification déléguée à un fournisseur d'identité (Okta, Entra ID, Google Workspace). Disponible Q3 2026. |
| **MFA** | *Multi-Factor Authentication*. Authentification renforcée par un second facteur (TOTP). Disponible Q3 2026. |
| **DPA** | *Data Processing Agreement*. Contrat de sous-traitance RGPD encadrant le traitement des données personnelles entre le client et l'éditeur. |
| **DPO** | *Data Protection Officer*. Délégué à la protection des données — chez Centrium : `dpo@centrium-platform.com`. |
| **PITR** | *Point-in-Time Recovery*. Capacité à restaurer la base de données à un instant T précis dans les 7 derniers jours. |
| **Tenant** | Organisation cliente isolée dans Centrium. Chaque tenant a son propre `organization_id`, ses propres données, ses propres membres. |

### 12.2 FAQ admin

**1. Puis-je avoir deux administrateurs sur la même organisation ?**
Oui. Il est même recommandé d'avoir au moins **deux administrateurs** par organisation pour la continuité d'exploitation.

**2. Puis-je restreindre l'accès d'un BM à un sous-ensemble de consultants ?**
Pas aujourd'hui. La granularité par sous-portefeuille consultant est prévue **Q2 2027**. En attendant, utilisez les vues filtrées et l'auto-discipline.

**3. Un membre retiré conserve-t-il son historique d'actions ?**
Oui. L'audit trail conserve toutes ses actions passées même après son retrait, avec son e-mail au moment de l'action.

**4. Puis-je voir qui a téléchargé tel CV ?**
Oui, depuis `/admin/audit`, filtrez par action `document.downloaded`.

**5. Combien de temps une session active reste-t-elle ouverte ?**
Tant que le navigateur n'est pas fermé et tant que l'utilisateur ne dépasse pas 24 heures sans activité. Au-delà, la session est révoquée automatiquement.

**6. Puis-je verrouiller temporairement un compte sans le supprimer ?**
La désactivation temporaire (avec préservation des données) sera disponible **Q4 2026**. En attendant, changez son rôle en `viewer` pour le réduire à la lecture seule.

**7. Puis-je signer le DPA en ligne ?**
Oui via DocuSign sur demande à `dpo@centrium-platform.com`. Délai habituel : 48 heures.

**8. Comment migrer mes données depuis Boondmanager ou un autre outil ?**
Centrium fournit un service d'import accompagné. Contactez `support@centrium-platform.com` avec un export de votre outil source. Délai habituel : 5 à 10 jours ouvrés selon le volume.

**9. Mon SIREN n'est pas accepté à la saisie. Que faire ?**
Vérifiez les 9 chiffres et la clé de Luhn. Si le SIREN est valide mais refusé, contactez `support@centrium-platform.com` avec une capture.

**10. Puis-je personnaliser les e-mails transactionnels (invitation, reset, etc.) ?**
Aujourd'hui, seules la couleur primaire et l'en-tête avec logo sont personnalisables (via le branding). La personnalisation du corps des e-mails est prévue **Q4 2026**.

### 12.3 Contact

Pour toute question d'administration non couverte par ce guide :

- **Support admin** : `admin@centrium-platform.com`
- **Support général** : `support@centrium-platform.com`
- **RGPD / DPO** : `dpo@centrium-platform.com`
- **Sécurité (24/7)** : `security@centrium-platform.com`
- **Escalade** : `escalation@centrium-platform.com`

Pour les engagements de service, délais de réponse et procédures d'incident, consultez le [SLA & Support Guide](./SLA_AND_SUPPORT_GUIDE.md).

---

> **Centrium — Guide Administrateur v1.0**
> Édité par QuadCore SAS · 2026-06-04
> Document évolutif — vérifiez la dernière version sur `docs.centrium-platform.com`
