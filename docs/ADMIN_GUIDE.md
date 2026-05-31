# Guide administrateur ESN

> Rôle `admin` dans Centrium. Vous êtes responsable de votre organisation :
> équipe, branding, paramètres, facturation, conformité.

## 1. Première connexion

1. Vous recevez un email d'invitation → cliquer sur le lien
2. Créer votre mot de passe (12 caractères minimum recommandés)
3. Compléter votre profil personnel (`/settings/profile`)
4. Compléter l'identité de l'organisation (`/settings/branding`) :
   - Logo, couleurs, nom de marque
   - Mentions légales (SIREN, RCS, capital, adresse)
   - Coordonnées bancaires (IBAN, BIC) — utilisées pour les factures
   - Représentant légal et signature

## 2. Gérer votre équipe

`/settings/team`

- **Inviter** un membre : email + rôle
- **Rôles disponibles** :
  - `admin` : tous les droits, gestion équipe et facturation
  - `business_manager` : pipeline commercial, consultants, missions
  - `recruiter` : sourcing, candidats, CV
  - `finance` : factures, CRA, comptabilité
  - `viewer` : lecture seule
- **Révoquer** un membre : bouton sur sa ligne

> 💡 Les invitations expirent au bout de 7 jours. Renvoyer depuis la liste.

## 3. Consultants

`/consultants` — annuaire complet

- **Créer** un consultant : bouton « Nouveau »
- **Importer** un CV : drag & drop dans la fiche consultant → extraction
  automatique des compétences, expériences, formations
- **Ajouter des documents** : RIB, contrat, diplômes, KYC
- **Statut** : actif / en mission / intercontrat / archivé

## 4. CRM commercial

`/crm` — pipeline visuel

- Colonnes : Prospect → Qualifié → Proposition → Négociation → Gagné/Perdu
- Drag & drop pour faire avancer
- Liaison avec contacts (`/contacts`) et missions (`/missions`)

## 5. CV Optimizer

`/cv-optimizer`

- Charger un CV source + le besoin client
- L'IA propose une version alignée — **jamais d'invention**
- Score de confiance, justifications, choix entre 3 templates
- Export PDF ou DOCX, prêt à envoyer

## 6. Facturation

`/invoices`

- Génération automatique à partir des CRA validés
- Templates personnalisés (logo, mentions, RIB)
- Statuts : brouillon → envoyée → payée → archivée
- Export PDF, envoi email

## 7. Paramètres conformité

`/settings/privacy` (pour chaque utilisateur)
- Export RGPD de ses propres données
- Demande de suppression

`/security` (page publique, à partager avec vos clients)
- Architecture sécurité, sous-traitants, conformité

## 8. Audit (super_admin éditeur uniquement)

Le super_admin de QuadCore (éditeur Centrium) accède à `/admin/audit` pour
voir le journal des activités. Pour récupérer un audit de votre propre
organisation, contactez-nous.

## 9. Support

- Email : [contact@centrium-platform.com](mailto:contact@centrium-platform.com)
- Délai de réponse : 24-48h ouvrées
- Incidents sécurité : [security@centrium-platform.com](mailto:security@centrium-platform.com)
