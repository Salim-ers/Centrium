---
title: "Help Center Structure — Centrium"
subtitle: "Arborescence et contenu du centre d'aide centrium-platform.com/aide"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "help-center-structure"
language: "fr-FR"
status: "Planification — déploiement Q3 2026"
---

# Help Center Structure — Centrium

> Document de planification éditoriale et architecture d'information pour le futur
> centre d'aide `centrium-platform.com/aide`. Sert de référence pour les équipes
> Produit, Support, Marketing et Documentation. Mise en production cible : **Q3 2026**.

---

## 1. Vision et principes éditoriaux

Le centre d'aide de Centrium n'est pas un manuel utilisateur déguisé. C'est un **outil de support en self-service**, conçu pour répondre à une question précise en moins de 90 secondes, depuis un moteur de recherche ou un lien contextuel dans l'application.

### 1.1 Audience

| Persona | Profil | Besoins typiques |
|---|---|---|
| **Admin ESN** | Dirigeant, RH, COO. Configure et supervise la plateforme. | Onboarding, équipe, branding, sécurité, RGPD, facturation plateforme. |
| **Business Manager (BM)** | Pilote 10 à 40 consultants, suit le pipeline commercial. | Consultants, CV, matching, opportunités, contrats, CRA validation. |
| **Recruteur** | Sourcing, qualification, mise à jour des fiches. | Import CV, parsing, tags, recherche avancée, statuts. |
| **Finance** | Édite et suit les factures, alimente la compta. | Factures, exports Sage/Pennylane, relances, alertes retard. |
| **Consultant (Portal)** | Salarié ou freelance accédant à son portail dédié. | Saisie CRA, consultation factures, téléchargement contrats. |

### 1.2 Tonalité éditoriale

- **Direct.** Pas de phrase d'accroche marketing. On entre dans le sujet à la première ligne.
- **Opérationnel.** Chaque article répond à un *job-to-be-done* identifié.
- **Sans jargon inutile.** Le vocabulaire ESN est conservé (BM, AO, TJM, CRA, intercontrat) — il est familier à la cible. Les termes techniques inhabituels sont définis ou liés au glossaire.
- **Optimiste mais honnête.** Si une limite existe, on l'écrit (parsing CV à 85 %, IA assistant comptable non substituable à un expert-comptable, etc.).
- **Tutoiement interdit, vouvoiement de service.** "Vous pouvez ajouter un consultant en…".

### 1.3 Format dominant

- **Article texte court** — 300 à 800 mots, scannable (titres H2/H3, listes, encarts).
- **Captures d'écran annotées** — au moins 1 par article, à produire en continu à partir de l'app de prod.
- **GIFs courts** (5 à 15 secondes) pour démontrer un geste UI précis — à produire à partir de Q4 2026.
- **Vidéos tutorielles** (30 à 60 secondes, sous-titrées FR + EN) — à produire à partir de Q1 2027.
- **Tableaux** pour statuts, codes erreur, rôles, raccourcis clavier.
- **Encarts visuels** standardisés : 💡 Astuce · ⚠️ Attention · 🔒 Sécurité · 📌 À noter.

### 1.4 Recherche et navigation

- **Recherche plein-texte** sur titres + corps + tags. Implémentation au choix : **Algolia DocSearch** (gratuit pour la documentation open ou produit, indexation hebdomadaire) ou **Supabase pgvector** (cohérent avec la stack existante, recherche sémantique possible). Décision tranchée au sprint 1.
- **Suggestions contextuelles dans l'app** — chaque page principale embarque un bouton "?" en haut à droite qui ouvre les 3 articles les plus pertinents pour la page courante.
- **Breadcrumbs systématiques.**
- **Bloc "Articles lus ensemble"** en pied d'article (top 3 par fréquence de co-consultation).

### 1.5 Multilingue

- **Français par défaut.** Tous les articles sont rédigés en FR.
- **Anglais sur 50 % des articles essentiels** (les 20 articles fondateurs + le top 20 par trafic). Cible : Q1 2027.
- Pas de traduction automatique non relue. Si l'EN n'existe pas, on n'affiche pas un placeholder traduit auto — on renvoie à la version FR avec une mention "English version coming".

### 1.6 Principes d'écriture (charte interne)

1. **Une question = un article.** Pas de "tout savoir sur les contrats" qui mélange création, signature et résiliation.
2. **Le titre est une question utilisateur, ou un verbe d'action.** "Importer un CV en glisser-déposer" plutôt que "Le parsing de CV".
3. **La première ligne contient la réponse.** Pas de mise en contexte de 3 paragraphes.
4. **Le verbe à l'impératif est interdit dans le corps.** "Cliquez sur **Importer**" est OK, "Importez votre CV" sonne brutal. On préfère "Pour importer un CV, cliquez sur **Importer un CV** depuis `/consultants`".
5. **Chaque écran cité est lié par son URL.** `/consultants`, `/cv-pushed`, `/settings/team` — jamais "le module des consultants".
6. **Pas de promesses non datées.** "À venir" est interdit. On écrit "Q4 2026" ou "v1.2".
7. **Une astuce par article maximum.** Au-delà, on dilue l'attention.

---

## 2. Arborescence complète

L'arborescence est volontairement profonde de **deux niveaux maximum** (Catégorie → Article). Pas de sous-catégorie. Centrium revendique une UX plate, l'aide doit refléter ce parti pris.

```
/aide
├── 🚀 Démarrer avec Centrium
│   ├── Premiers pas en 15 minutes
│   ├── Créer votre organisation
│   ├── Inviter votre équipe
│   ├── Configurer votre identité visuelle
│   └── Tour de l'interface
│
├── 👥 Consultants
│   ├── Importer un CV en glisser-déposer
│   ├── Importer une bibliothèque CSV
│   ├── Comprendre les statuts consultants
│   ├── Filtrer et rechercher
│   ├── Gérer les compétences et tags
│   ├── Pousser un CV vers une mission
│   └── Anticiper un intercontrat
│
├── 📄 CV Optimizer
│   ├── Comment fonctionne l'optimisation IA
│   ├── Choisir le bon template (Standard / Dense / Executive)
│   ├── Éditer un CV en mode inline
│   ├── Personnaliser un CV pour un AO précis
│   ├── Comprendre le score de matching
│   ├── Comprendre les "claims" rejetés
│   ├── Exporter en PDF
│   └── Exporter en DOCX
│
├── 🎯 Matching & Appels d'offres
│   ├── Capturer un AO depuis un screenshot
│   ├── Capturer un AO depuis du texte
│   ├── Lancer un matching IA
│   ├── Comprendre les niveaux de confiance
│   └── Générer une fiche de poste PDF
│
├── 💼 CRM commercial
│   ├── Comprendre les 9 statuts du pipeline
│   ├── Créer une opportunité
│   ├── Glisser-déposer une carte
│   ├── Travailler à plusieurs sur le CRM
│   ├── Marquer une opportunité gagnée
│   └── Analyser ses pertes
│
├── 📞 Carnet de contacts
│   ├── Créer un contact
│   ├── Utiliser les tags
│   ├── Programmer un rappel
│   └── Importer un CSV
│
├── 📝 Contrats
│   ├── Générer un contrat depuis une mission
│   ├── Personnaliser un template
│   ├── Comprendre les 8 statuts
│   └── Récupérer un contrat signé
│
├── 📅 Comptes-rendus d'activité (CRA)
│   ├── Saisir un CRA en tant que BM
│   ├── Saisir un CRA en tant que consultant (Portal)
│   ├── Comprendre les types de journée
│   ├── Valider un CRA
│   ├── Refuser et corriger un CRA
│   └── Exporter l'historique annuel
│
├── 💰 Facturation
│   ├── Générer une facture depuis un CRA validé
│   ├── Personnaliser une facture
│   ├── Marquer une facture envoyée
│   ├── Marquer une facture payée
│   ├── Comprendre les alertes de retard
│   ├── Exporter vers Sage
│   └── Exporter vers Pennylane
│
├── 🤖 Assistant comptable IA
│   ├── Questions rapides disponibles
│   ├── Poser une question libre
│   ├── Limites de l'assistant
│   └── Confidentialité des données
│
├── 📊 Dashboard
│   ├── Lire les KPIs
│   ├── Comprendre le graphique CA & missions
│   ├── Traiter les alertes prioritaires
│   └── Personnaliser les widgets (Q4 2026)
│
├── 👤 Portal consultant
│   ├── Donner accès à un consultant
│   ├── Le consultant : saisir son CRA
│   ├── Le consultant : consulter ses factures
│   ├── Le consultant : télécharger un contrat
│   └── Que voit-il / Que ne voit-il pas
│
├── ⚙️ Paramètres
│   ├── Mon profil personnel
│   ├── Gérer l'équipe et les rôles
│   ├── Configurer l'identité visuelle
│   ├── RGPD : exporter mes données
│   ├── RGPD : droit à l'oubli
│   ├── Apparence : thème, fond animé, densité
│   └── SSO + MFA (Q3 2026)
│
├── 🔒 Sécurité & RGPD
│   ├── Comment mes données sont protégées
│   ├── Qui peut voir quoi (matrice rôles)
│   ├── Procédure incident
│   ├── Notification 72h CNIL
│   └── DPA & sous-traitants
│
├── 💼 Administration
│   ├── Inviter des utilisateurs
│   ├── Auditer l'activité
│   ├── Multi-organisation
│   └── Réversibilité : quitter Centrium
│
├── 🆘 Dépannage
│   ├── Je n'arrive pas à me connecter
│   ├── Mon CRA ne se valide pas
│   ├── Mon export PDF échoue
│   ├── Mes factures ne s'envoient pas
│   ├── Je suis bloqué par un message d'erreur
│   ├── Le parsing CV n'a pas tout extrait
│   └── La synchronisation temps réel ne fonctionne plus
│
├── ❓ FAQ
│   ├── Combien coûte Centrium ?
│   ├── Mes données sont-elles en France ?
│   ├── Centrium remplace-t-il mon expert-comptable ?
│   ├── Puis-je essayer Centrium gratuitement ?
│   ├── Comment Centrium se compare-t-il à Boondmanager ?
│   ├── Quel est l'engagement minimum ?
│   ├── Que se passe-t-il si je résilie ?
│   ├── Centrium fonctionne-t-il sur mobile ?
│   ├── Quelle est la roadmap produit ?
│   ├── Puis-je faire signer mes contrats avec Centrium ?
│   ├── L'IA invente-t-elle des informations sur mes CV ?
│   ├── Centrium est-il certifié SOC 2 ou ISO 27001 ?
│   ├── Mes consultants ont-ils besoin d'une licence ?
│   ├── Que se passe-t-il si Centrium ferme ?
│   ├── Puis-je avoir plusieurs organisations sous un même compte ?
│   ├── Comment Centrium gère les ESN à plusieurs entités ?
│   ├── Les factures Centrium sont-elles conformes facturation électronique 2026 ?
│   └── Quel SLA appliquez-vous ?
│
├── 📞 Contacter le support
│   ├── Quand contacter le support
│   ├── Comment formuler une demande efficace
│   ├── Niveaux de support disponibles
│   └── Urgences sécurité (24/7)
│
└── 📰 Nouveautés & Changelog
    ├── Articles de release
    ├── Roadmap publique (3-12 mois)
    └── Bêta features (Q4 2026)
```

**Total** : 21 catégories · ~120 articles cibles à 12 mois · 20 articles fondateurs au lancement.

---

## 3. Détail des 20 articles fondateurs

Ces 20 articles forment le **socle minimal** publié à la mise en ligne du centre d'aide (Sprint 1, J0 → J+30). Ils couvrent les 80 % des questions support attendues sur les 6 premiers mois d'usage.

### Article 1 — Premiers pas en 15 minutes

| Champ | Valeur |
|---|---|
| **Audience** | Admin ESN découvrant Centrium |
| **Résumé** | Parcours guidé pour passer de la création de compte au premier consultant enregistré en moins de 15 minutes, sans support. |
| **Mots-clés SEO** | démarrer, onboarding, premiers pas, configuration, ESN, centrium |
| **Articles liés** | Créer votre organisation · Inviter votre équipe · Configurer votre identité visuelle |
| **Mise à jour cible** | Trimestrielle (Q3 / Q4 / Q1 / Q2) |

### Article 2 — Importer un CV en glisser-déposer

| Champ | Valeur |
|---|---|
| **Audience** | BM, Recruteur |
| **Résumé** | Glisser-déposer d'un PDF ou DOCX, parsing IA, vérification de la fiche pré-remplie. Précision moyenne attendue : 85 % — vérifier systématiquement. |
| **Mots-clés SEO** | importer CV, parsing CV, glisser-déposer, PDF, DOCX, IA |
| **Articles liés** | Comprendre les statuts consultants · Le parsing CV n'a pas tout extrait · Importer une bibliothèque CSV |
| **Mise à jour cible** | À chaque amélioration du parser |

### Article 3 — Choisir le bon template CV (Standard / Dense / Executive)

| Champ | Valeur |
|---|---|
| **Audience** | BM, Admin |
| **Résumé** | Comparaison visuelle des 3 templates Centrium, cas d'usage typique de chacun (Standard pour 90 % des AO, Dense pour profils 10+ ans, Executive pour direction). |
| **Mots-clés SEO** | template CV, CV ESN, CV Standard, CV Dense, CV Executive, format CV |
| **Articles liés** | Comment fonctionne l'optimisation IA · Personnaliser un CV pour un AO précis · Exporter en PDF |
| **Mise à jour cible** | À l'ajout d'un nouveau template |

### Article 4 — Comprendre les statuts du pipeline CRM

| Champ | Valeur |
|---|---|
| **Audience** | BM |
| **Résumé** | Sens, transitions autorisées et règles automatiques des 9 statuts du pipeline (Nouveau → CV envoyé → Entretien → Proposition → Gagnée / Perdue). |
| **Mots-clés SEO** | statuts CRM, pipeline ESN, opportunité, CV envoyé, gagné perdu |
| **Articles liés** | Créer une opportunité · Glisser-déposer une carte · Marquer une opportunité gagnée |
| **Mise à jour cible** | À chaque évolution du pipeline |

### Article 5 — Saisir un CRA correctement

| Champ | Valeur |
|---|---|
| **Audience** | BM, Consultant (Portal) |
| **Résumé** | Saisie jour par jour, types de journée (jour travaillé, jour férié, RTT, congé, maladie, demi-journée), erreurs fréquentes à éviter (chevauchement, jour manquant). |
| **Mots-clés SEO** | CRA, compte rendu d'activité, saisie CRA, validation CRA, intercontrat |
| **Articles liés** | Valider un CRA · Refuser et corriger un CRA · Mon CRA ne se valide pas |
| **Mise à jour cible** | Mensuelle |

### Article 6 — Générer une facture conforme au Code de Commerce

| Champ | Valeur |
|---|---|
| **Audience** | Finance, BM |
| **Résumé** | Génération automatique depuis un CRA validé, mentions légales obligatoires (SIREN, TVA, IBAN, conditions de paiement), numérotation séquentielle. Conformité Code de Commerce art. L441-9. |
| **Mots-clés SEO** | facture conforme, mentions légales, Code de Commerce, facturation ESN, IBAN |
| **Articles liés** | Personnaliser une facture · Exporter vers Sage · Exporter vers Pennylane |
| **Mise à jour cible** | À chaque évolution réglementaire (facturation électronique 2026) |

### Article 7 — Donner accès au portail à un consultant

| Champ | Valeur |
|---|---|
| **Audience** | BM, Admin |
| **Résumé** | Création d'un accès consultant depuis sa fiche, envoi de l'invitation, périmètre exact d'accès (jamais l'app principale, jamais les autres consultants). |
| **Mots-clés SEO** | portail consultant, accès consultant, invitation portail, cloisonnement |
| **Articles liés** | Le consultant : saisir son CRA · Que voit-il / Que ne voit-il pas · Gérer l'équipe et les rôles |
| **Mise à jour cible** | À chaque évolution du périmètre Portal |

### Article 8 — Configurer mon identité visuelle

| Champ | Valeur |
|---|---|
| **Audience** | Admin |
| **Résumé** | Logo, couleurs primaire et accent, signature scannée, baseline pied de page. Aperçu temps réel sur un CV, un contrat et une facture. |
| **Mots-clés SEO** | branding, identité visuelle, logo ESN, charte graphique, couleurs |
| **Articles liés** | Premiers pas en 15 minutes · Personnaliser un template · Personnaliser une facture |
| **Mise à jour cible** | À chaque changement de pipeline branding |

### Article 9 — Exporter mes données (RGPD)

| Champ | Valeur |
|---|---|
| **Audience** | Admin, Consultant |
| **Résumé** | Procédure d'export complet des données de l'organisation ou des données personnelles d'un utilisateur, format JSON + CSV + PDF associés. Délai 30 jours maximum garanti. |
| **Mots-clés SEO** | RGPD, export données, portabilité, droit accès, article 20 |
| **Articles liés** | RGPD : droit à l'oubli · DPA & sous-traitants · Réversibilité : quitter Centrium |
| **Mise à jour cible** | À chaque évolution réglementaire |

### Article 10 — Comprendre les alertes intercontrat

| Champ | Valeur |
|---|---|
| **Audience** | BM, Admin |
| **Résumé** | Logique de l'alerte (J-15 fin de mission), affichage dans le centre d'alertes, action recommandée (lancer un matching, contacter le client pour renouvellement). |
| **Mots-clés SEO** | intercontrat, alerte fin mission, bientôt disponible, anticipation |
| **Articles liés** | Comprendre les statuts consultants · Lancer un matching IA · Lire les KPIs |
| **Mise à jour cible** | Semestrielle |

### Article 11 — Personnaliser un CV pour un AO précis

| Champ | Valeur |
|---|---|
| **Audience** | BM |
| **Résumé** | Sélection d'une offre cible, déclenchement de l'optimisation, lecture du score de matching, édition inline avant export. Pas d'invention : tout reste traçable. |
| **Mots-clés SEO** | CV personnalisé, optimisation CV, AO, mots-clés client, score matching |
| **Articles liés** | Comprendre le score de matching · Comprendre les claims rejetés · Éditer un CV en mode inline |
| **Mise à jour cible** | À chaque évolution du moteur |

### Article 12 — Capturer un AO depuis un screenshot

| Champ | Valeur |
|---|---|
| **Audience** | BM, Recruteur |
| **Résumé** | Coller ou déposer une image d'AO (capture mail, capture LinkedIn), extraction IA des champs structurés (intitulé, skills, TJM, lieu, dates), validation manuelle. |
| **Mots-clés SEO** | capture AO, screenshot offre, extraction OCR, appel d'offres |
| **Articles liés** | Capturer un AO depuis du texte · Lancer un matching IA · Générer une fiche de poste PDF |
| **Mise à jour cible** | À chaque amélioration de l'extraction |

### Article 13 — Glisser-déposer une carte CRM

| Champ | Valeur |
|---|---|
| **Audience** | BM |
| **Résumé** | Déplacer une carte d'opportunité entre colonnes Kanban, règles de transition (certaines transitions déclenchent une action automatique : Gagnée crée la mission). |
| **Mots-clés SEO** | drag drop CRM, kanban opportunité, déplacer carte, pipeline |
| **Articles liés** | Comprendre les 9 statuts du pipeline · Marquer une opportunité gagnée · Analyser ses pertes |
| **Mise à jour cible** | Annuelle |

### Article 14 — Comprendre les types de journée CRA

| Champ | Valeur |
|---|---|
| **Audience** | BM, Consultant |
| **Résumé** | Jour travaillé, demi-journée, jour férié, RTT, congé payé, maladie, formation, astreinte. Codes couleur, impact sur la facturation. |
| **Mots-clés SEO** | types journée CRA, jour férié, RTT, demi-journée, congé |
| **Articles liés** | Saisir un CRA correctement · Valider un CRA · Générer une facture |
| **Mise à jour cible** | À l'ajout d'un nouveau type |

### Article 15 — Marquer une facture payée

| Champ | Valeur |
|---|---|
| **Audience** | Finance |
| **Résumé** | Saisie d'une date de règlement et d'un mode (virement, prélèvement, chèque), bascule automatique du statut, impact KPI dashboard, ce qui se passe ensuite. |
| **Mots-clés SEO** | facture payée, règlement, encaissement, statut facture |
| **Articles liés** | Comprendre les alertes de retard · Lire les KPIs · Exporter vers Sage |
| **Mise à jour cible** | Annuelle |

### Article 16 — Inviter votre équipe

| Champ | Valeur |
|---|---|
| **Audience** | Admin |
| **Résumé** | Envoi d'invitation par e-mail (lien à usage unique, valable 7 jours), choix du rôle (Admin, BM, Recruteur, Finance, Viewer), retrait d'un membre. |
| **Mots-clés SEO** | inviter équipe, rôles, permissions, admin, BM |
| **Articles liés** | Gérer l'équipe et les rôles · Qui peut voir quoi (matrice rôles) · SSO + MFA (Q3 2026) |
| **Mise à jour cible** | À chaque évolution du modèle de rôles |

### Article 17 — Lire les KPIs du Dashboard

| Champ | Valeur |
|---|---|
| **Audience** | Admin, BM |
| **Résumé** | Définition de chaque KPI (CA prévisionnel, taux d'intercontrat, taux de transformation, retard moyen de paiement), fenêtres temporelles, drill-down par clic. |
| **Mots-clés SEO** | KPI ESN, dashboard, indicateurs, CA prévisionnel, intercontrat |
| **Articles liés** | Comprendre le graphique CA & missions · Traiter les alertes prioritaires · Personnaliser les widgets (Q4 2026) |
| **Mise à jour cible** | À l'ajout d'un nouveau KPI |

### Article 18 — Limites de l'assistant comptable IA

| Champ | Valeur |
|---|---|
| **Audience** | Admin, Finance |
| **Résumé** | Ce que l'assistant fait (calculs courants, rappels échéances, synthèse) et ce qu'il **ne fait pas** (avis fiscal, déclaration, conseil personnalisé). Renvoi vers expert-comptable obligatoire pour la décision. |
| **Mots-clés SEO** | assistant IA, comptable IA, limites, expert-comptable, fiscalité |
| **Articles liés** | Questions rapides disponibles · Poser une question libre · Confidentialité des données |
| **Mise à jour cible** | Trimestrielle |

### Article 19 — Comprendre les "claims" rejetés du CV Optimizer

| Champ | Valeur |
|---|---|
| **Audience** | BM, Recruteur |
| **Résumé** | Quand l'IA ne peut pas justifier une affirmation à partir du CV source (compétence non mentionnée, durée d'expérience non vérifiable), elle l'écarte. Lecture du panneau "claims rejetés", action recommandée (compléter le CV source ou laisser tel quel). |
| **Mots-clés SEO** | claims rejetés, CV factuel, anti-hallucination, IA explicable |
| **Articles liés** | Comment fonctionne l'optimisation IA · Comprendre le score de matching · L'IA invente-t-elle des informations |
| **Mise à jour cible** | À chaque évolution du moteur |

### Article 20 — Je n'arrive pas à me connecter

| Champ | Valeur |
|---|---|
| **Audience** | Tous |
| **Résumé** | Arbre de décision : mot de passe oublié → procédure ; lien d'invitation expiré → demander un renvoi ; auto-logout après restauration de session Chrome → comportement attendu, se reconnecter ; MFA bloqué → contacter admin. |
| **Mots-clés SEO** | connexion impossible, mot de passe, login bloqué, MFA, session expirée |
| **Articles liés** | Mot de passe oublié · SSO + MFA (Q3 2026) · Contacter le support |
| **Mise à jour cible** | Trimestrielle |

---

## 4. Système de tags et catégories

Chaque article porte **3 à 6 tags** issus de 4 axes. Les tags alimentent les filtres de la page d'accueil du centre d'aide et la recherche facettée.

### 4.1 Tag par audience

| Tag | Cible |
|---|---|
| `admin` | Administrateur de l'organisation |
| `bm` | Business manager |
| `recruteur` | Sourceur, recruteur |
| `finance` | Comptabilité, ADV, contrôle de gestion |
| `consultant` | Utilisateur Portal consultant |

### 4.2 Tag par module

| Tag | Module Centrium |
|---|---|
| `consultants` | Bibliothèque consultants |
| `cv` | CV Optimizer |
| `matching` | Matching & AO |
| `crm` | CRM commercial |
| `contacts` | Carnet de contacts |
| `contrats` | Contrats |
| `cra` | Comptes rendus d'activité |
| `factures` | Facturation |
| `assistant-ia` | Assistant comptable |
| `dashboard` | Dashboard |
| `portal` | Portal consultant |
| `parametres` | Paramètres / Administration |
| `securite` | Sécurité & RGPD |

### 4.3 Tag par difficulté

| Tag | Profil utilisateur |
|---|---|
| `debutant` | Première semaine d'utilisation |
| `intermediaire` | Usage régulier, connaît les bases |
| `avance` | Power user, cas particuliers, intégrations |

### 4.4 Tag par usage

| Tag | Type d'article |
|---|---|
| `tutoriel` | Pas-à-pas pour réaliser une tâche |
| `depannage` | Résolution d'un problème |
| `conceptuel` | Explication d'un concept ou d'une mécanique |
| `reference` | Liste exhaustive (statuts, raccourcis, codes erreur) |

### 4.5 Exemple de tagging

> **Article** : "Importer un CV en glisser-déposer"
> **Tags** : `bm`, `recruteur`, `consultants`, `cv`, `debutant`, `tutoriel`

> **Article** : "Comprendre les claims rejetés du CV Optimizer"
> **Tags** : `bm`, `cv`, `avance`, `conceptuel`

---

## 5. Composants visuels recommandés

L'aide Centrium est rédigée d'abord en texte, enrichie progressivement en visuels selon un calendrier réaliste.

### 5.1 Captures d'écran annotées

- **À produire dès le sprint 1**, en continu sur chaque article.
- Format : PNG, largeur cible 1280 px, ratio préservé.
- Annotations : flèches rouges, encadrés numérotés.
- **Anonymisation obligatoire** : aucun nom, e-mail, IBAN, SIREN réel visible. Données de démonstration uniquement.
- Stockage : Supabase Storage, bucket public `help-screenshots/`.

### 5.2 GIFs courts

- **Production démarre Q4 2026**.
- Durée : 5 à 15 secondes maximum. Au-delà, on passe à une vidéo.
- Format : GIF optimisé ou MP4 silencieux (`<video autoplay muted loop playsinline>`).
- Cas d'usage : gestes UI (drag and drop CRM, déplacement d'une carte, ouverture d'un dialog).
- Outils recommandés : ScreenStudio, Tella, ou capture native macOS + compression.

### 5.3 Vidéos tutorielles

- **Production démarre Q1 2027**.
- Durée : 30 à 60 secondes maximum.
- Voix off **interdite** au lancement (complexité multilingue) → sous-titres FR + EN intégrés.
- Format : MP4 720p, hébergé sur Mux ou Cloudflare Stream.
- Cas d'usage : parcours utilisateurs (créer une opportunité, générer un CV optimisé, valider un CRA et générer la facture).

### 5.4 Schémas conceptuels

- Pour les articles `conceptuel` (statuts, flux, architecture).
- Format : SVG produit dans Figma puis exporté.
- Cohérence visuelle obligatoire avec la charte Centrium (palette violet/rose, dégradés du site vitrine).

---

## 6. Search et navigation

### 6.1 Recherche plein-texte

- **Q3 2026 — phase 1** : Algolia DocSearch si éligibilité gratuite confirmée, sinon Supabase pgvector (cohérent avec stack).
- Champs indexés : titre, sous-titre, corps, tags, URL.
- Synonymes maintenus à la main pour le vocabulaire ESN : `BM = business manager`, `AO = appel d'offres = offre`, `CRA = compte rendu = activité`, `TJM = taux journalier`.
- Recherche sémantique (Q1 2027) : embeddings via Voyage AI ou OpenAI, fallback sur recherche lexicale.

### 6.2 Suggestions contextuelles in-app

- Bouton **?** persistant en haut à droite de chaque page principale.
- Au clic, panneau latéral droit avec 3 articles pertinents pour la page courante (mapping URL → IDs articles maintenu côté code).
- Si l'utilisateur ne trouve pas, lien direct vers "Contacter le support".

### 6.3 Breadcrumbs

- Présents sur **toutes** les pages article : `Aide > Catégorie > Article`.
- Cliquables, accessibles (`<nav aria-label="Breadcrumb">`).

### 6.4 Bloc "Articles lus ensemble"

- En pied d'article.
- Top 3 articles co-consultés calculés mensuellement à partir des analytics.
- Fallback manuel sur le champ `articles_liés` du frontmatter de chaque article tant que les données analytics ne sont pas significatives.

### 6.5 Page d'accueil du centre d'aide

Structure cible :

1. **Barre de recherche** plein-écran (focus automatique).
2. **6 catégories en cartes** (les plus consultées) avec icône + intro + nb d'articles.
3. **"Articles les plus utiles cette semaine"** — 4 cartes mises à jour hebdomadairement.
4. **"Nouveau dans Centrium ?"** — entrée directe vers l'article *Premiers pas en 15 minutes*.
5. **"Contacter le support"** — toujours visible en bas.

---

## 7. Plan de production

### 7.1 Sprint 1 — J0 à J+30 (mise en ligne du Help Center)

| Livrable | Charge estimée |
|---|---|
| Architecture site (Next.js statique, sous-domaine `aide.`) | 3 j |
| Intégration recherche (Algolia ou pgvector) | 2 j |
| Rédaction des **20 articles fondateurs** (cf. section 3) | 12 j |
| Captures d'écran pour les 20 articles fondateurs | 3 j |
| Relecture éditoriale + validation produit | 2 j |
| Mise en ligne et tests | 1 j |
| **Total Sprint 1** | **23 j-homme** |

### 7.2 Sprint 2 — J+30 à J+60 (couverture des modules)

| Livrable | Charge estimée |
|---|---|
| 30 articles complémentaires (compléter les catégories) | 18 j |
| 10 articles de dépannage | 5 j |
| Captures d'écran additionnelles | 3 j |
| Mise en place du flux "thumbs up/down" + commentaire | 2 j |
| **Total Sprint 2** | **28 j-homme** |

### 7.3 Sprint 3 — J+60 à J+90 (extension qualitative)

| Livrable | Charge estimée |
|---|---|
| Extension FAQ à 30+ questions | 4 j |
| Production des 15 premiers GIFs | 5 j |
| Première vague de traduction EN (20 articles essentiels) | 8 j |
| Suggestions contextuelles in-app (mapping URL → articles) | 3 j |
| **Total Sprint 3** | **20 j-homme** |

### 7.4 Cadence en régime de croisière

À partir de J+90 :

- **2 nouveaux articles par semaine** minimum, alignés sur les tickets support et les release notes.
- **1 revue trimestrielle** de tous les articles pour mise à jour.
- **1 audit annuel** de pertinence et de cannibalisation (articles redondants → fusion).

---

## 8. Mesure d'efficacité

Le centre d'aide est un produit. On le pilote avec des indicateurs.

### 8.1 Indicateurs cible (steady state à J+180)

| Indicateur | Cible | Mesure |
|---|---|---|
| **Taux d'auto-résolution** | ≥ 70 % | Pourcentage de visiteurs qui consultent un article et **ne déposent pas** de ticket support dans les 24 h suivantes. |
| **Satisfaction article** | ≥ 80 % thumbs up | Vote en pied d'article (👍 / 👎 + commentaire facultatif). |
| **Tickets déviés** | ≥ 30 par article fondateur sur 90 jours | Approximation : (consultations × taux d'auto-résolution) divisé par 100. |
| **Temps moyen passé sur article** | 60 à 180 secondes | Si < 30 s → article trop dense ou hors sujet. Si > 240 s → article trop long, à découper. |
| **Top 20 articles** | Représente 60 % du trafic | Loi de Pareto observée — sinon, on a un problème de découvrabilité. |
| **Recherches sans résultat** | < 5 % | Si > 5 %, on enrichit les synonymes ou on crée l'article manquant. |

### 8.2 Tableau de bord interne

Construit en Q3 2026 dans l'admin Centrium, accessible aux rôles `admin` interne QuadCore :

- Top 20 articles consultés (semaine glissante)
- Top 10 recherches sans résultat (semaine glissante)
- Articles avec satisfaction < 60 % (à retravailler en priorité)
- Articles non mis à jour depuis > 6 mois (à reviewer)
- Volume de tickets support par catégorie d'article (corrélation aide ↔ support)

### 8.3 Boucle de feedback

1. **Hebdomadaire** : Support équipe identifie les 3 questions répétées de la semaine → ticket Linear "Article à créer ou enrichir".
2. **Mensuel** : Comité Produit + Support → revue des articles à faible satisfaction → réécriture.
3. **Trimestriel** : Audit complet — articles obsolètes, articles fantômes (< 5 vues / mois), restructuration de catégories si nécessaire.

---

## 9. Gouvernance éditoriale

### 9.1 Rôles

| Rôle | Responsabilité |
|---|---|
| **Owner Help Center** | Tech writer ou Product manager. Décide de la roadmap éditoriale, valide chaque article avant publication. |
| **Rédacteurs** | PM produit (pour les articles `conceptuel`), Support (pour les articles `depannage`), Marketing produit (pour la FAQ commerciale). |
| **Relecteurs** | Owner + 1 personne du module concerné. |
| **Traducteur EN** | Externe ou bilingue interne. Relecture par un anglophone natif. |

### 9.2 Workflow de publication

1. **Brief** — Owner crée un ticket avec : titre, audience, mots-clés, plan en 3 H2.
2. **Rédaction** — 1 à 3 jours selon longueur. Brouillon dans la branche `docs/help/<slug>`.
3. **Relecture** — Owner + 1 expert module. Aller-retour max 2 cycles.
4. **Capture d'écran** — Produit à partir d'un environnement de démo isolé.
5. **Publication** — Merge → déploiement automatique.
6. **Monitoring** — Si satisfaction < 50 % à J+30, retour en file de retravail.

### 9.3 Critères de qualité avant publication

- [ ] Titre = question utilisateur ou verbe d'action
- [ ] Première ligne = la réponse
- [ ] Au moins 1 capture d'écran (sauf article `conceptuel`)
- [ ] Tags renseignés (3 à 6, dont 1 audience, 1 module, 1 difficulté, 1 usage)
- [ ] Articles liés renseignés (3 à 5)
- [ ] Aucune mention "à venir" sans date trimestrielle précise
- [ ] Vocabulaire ESN cohérent (BM, AO, TJM, CRA — pas de variations)
- [ ] Aucune donnée personnelle réelle dans les captures
- [ ] Liens internes en chemin relatif `/aide/...`
- [ ] Date de dernière mise à jour visible en pied d'article

---

## 10. Risques et hypothèses

### 10.1 Risques identifiés

| Risque | Probabilité | Mitigation |
|---|---|---|
| Décalage entre l'aide et la réalité produit (release > update doc) | Élevée | Politique "code + doc dans la même PR" pour toute évolution UI. |
| Surcharge éditoriale au lancement | Moyenne | Sprint 1 limité à 20 articles. Reste en backlog priorisé. |
| Stack search trop coûteuse | Faible | Fallback Supabase pgvector cohérent avec l'infra existante. |
| Captures obsolètes après redesign | Élevée | Script Playwright qui rejoue les screenshots clés à chaque release majeure (à mettre en place sprint 3). |
| Mauvaise mesure d'auto-résolution | Moyenne | Cookie corrélant visite article ↔ création ticket à 24 h, à coder dans le support. |

### 10.2 Hypothèses

- L'équipe Centrium accepte une charge moyenne de **~70 j-homme sur 90 jours** pour sortir le Help Center initial (cf. section 7).
- Le sous-domaine `aide.centrium-platform.com` (ou le chemin `/aide`) est disponible et configurable côté DNS / Vercel.
- Le budget Algolia DocSearch ou l'effort pgvector est arbitré au sprint 1.
- Une équipe support existe (même réduite) capable de répondre aux tickets non couverts par l'aide.
- L'environnement de démo de Centrium est suffisamment stable et représentatif pour produire des captures d'écran réutilisables.

---

## 11. Conclusion

Le centre d'aide n'est pas un livrable annexe. C'est le **prolongement naturel du produit** : ce qui ne peut pas être absorbé par l'UI ou l'onboarding se résout ici. À budget équivalent, un Help Center bien construit dévie significativement plus de tickets que n'importe quelle évolution UX.

L'arborescence proposée (21 catégories, ~120 articles à 12 mois, 20 articles fondateurs au lancement) couvre l'intégralité du périmètre fonctionnel de Centrium v1.0 décrit dans le manuel utilisateur. Le plan de production sur 90 jours est réaliste si l'effort est sanctuarisé sur un rédacteur principal accompagné de relecteurs experts par module.

L'objectif chiffré à J+180 — **70 % d'auto-résolution, 80 % de satisfaction sur les articles fondateurs, top 20 représentant 60 % du trafic** — est atteignable et constitue la définition opérationnelle du succès.
