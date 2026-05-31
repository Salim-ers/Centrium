# Script vidéo démo — Centrium

> Deux formats : **60 secondes** (réseaux sociaux, hero landing) et
> **3-5 minutes** (présentation commerciale, devis).
> Voix off en français, sous-titres EN.

---

## Format court — 60 secondes

### Storyboard

| Sec | Visuel | Voix off |
|---|---|---|
| 0-3 | Logo Centrium qui apparaît, halo rose-violet | « Centrium — la salle de pilotage de votre ESN. » |
| 3-12 | Split screen : Excel chaotique vs dashboard Centrium animé | « Vos consultants, vos missions, vos CV. Plus dispersés dans Excel, Notion, Word… Tout dans un seul outil. » |
| 12-25 | Zoom sur le CV Optimizer en action : extraction + alignement IA | « Un CV optimisé en 30 secondes par notre IA cadrée. Jamais d'invention. Score de confiance affiché. » |
| 25-38 | Pipeline CRM, drag & drop entre colonnes | « Pipeline AO clair, intercontrat sous contrôle, facturation automatisée à partir de vos CRA. » |
| 38-50 | Page sécurité, badges RGPD, hébergement EU | « Vos données hébergées en Europe. RGPD, isolation multi-tenant stricte. Pensé pour les ESN exigeantes. » |
| 50-60 | CTA fullscreen + URL | « Centrium-platform.com. Demandez votre devis en 20 minutes. » |

### Musique & ambiance
- Beat électronique sobre, montée progressive
- Bass drop subtil sur le moment CV Optimizer

### Format
- 1080p × 1080 (carré) pour LinkedIn / Instagram
- 1920×1080 (16:9) pour YouTube / vitrine
- Sous-titres burned-in

---

## Format long — 3 à 5 minutes

### Structure

```
0. Hook (15 s)
1. Le problème (45 s)
2. Découverte Centrium (30 s)
3. Ajouter un consultant (45 s)
4. Créer un besoin client (30 s)
5. Matching IA (45 s)
6. Audit & conformité (30 s)
7. Reporting (30 s)
8. CTA devis (30 s)
```

### 0. Hook — 15 s

Plan : interview-style, Marc (BM), front caméra, bureau ESN.

> **Marc** : « J'ai 47 consultants. Trois business managers. Et tous les
> matins, on passait deux heures à savoir qui faisait quoi. Vraiment. »

### 1. Le problème — 45 s

Plan : montage rapide — Excel ouvert, onglets multiples, message Slack,
mails, CV Word, dossier partagé en bazar.

> **Voix off** : « En France, 9 ESN sur 10 pilotent encore leur staffing
> avec Excel, Notion et WhatsApp. Résultat : des CV qui traînent, des
> réponses AO en retard, de l'intercontrat invisible. Et un risque
> RGPD permanent. »

> **Stat à l'écran** : *20-30 % du temps des BM perdus en saisie*

### 2. Découverte Centrium — 30 s

Plan : Marc ouvre l'app sur son écran, dashboard apparaît avec halo
animé.

> **Marc** : « Centrium, c'est l'outil que j'aurais voulu monter tout
> seul. Mais en plus moderne. Et en mieux pensé. »

Zoom sur les KPIs animés du dashboard, transitions GSAP.

### 3. Ajouter un consultant — 45 s

Plan : capture écran — drag & drop d'un CV PDF dans `/consultants/new`.
On voit l'extraction temps réel.

> **Voix off** : « Vous glissez un CV. Centrium extrait les compétences,
> les expériences, les formations. Pas de re-saisie. »

Détail : la fiche consultant se remplit toute seule.

### 4. Créer un besoin client — 30 s

Plan : capture `/offers/new`. Marc colle une offre Capgemini reçue par
mail.

> **Marc** : « Je colle l'offre. C'est tout. »

L'offre est parsée, les compétences-clés sortent en badges.

### 5. Matching IA — 45 s

Plan : `/matching` apparaît. Trois consultants ressortent avec scores.
Animation des barres de confiance.

> **Voix off** : « En 5 secondes, Centrium vous propose les profils qui
> matchent. Avec un score de confiance. Et surtout — une justification
> ligne par ligne. Pas de boîte noire. »

Marc clique sur « Générer le CV optimisé ». Le CV Optimizer s'ouvre.

> **Voix off** : « Notre IA reformule le CV pour coller à l'offre, sans
> jamais inventer. Vous validez. Vous exportez. »

### 6. Audit & conformité — 30 s

Plan : `/admin/audit` (super_admin), tableau d'activités défile.

> **Voix off** : « Toutes les actions sensibles sont journalisées.
> Pour vous, pour vos clients exigeants, pour la CNIL. »

Zoom sur la page `/security` : badges RGPD, sous-traitants UE.

### 7. Reporting — 30 s

Plan : `/dashboard` — KPI mensuels animés, sparkline qui se dessine,
TJM moyen, intercontrat en baisse.

> **Marc** : « Mon CA prévisionnel. Mon intercontrat. Mes marges. En
> trois secondes, je sais. »

### 8. CTA devis — 30 s

Plan : page `/devis` qui s'ouvre. Formulaire propre.

> **Voix off** : « Pas de prix public, pas de carte bleue à sortir.
> Vingt minutes avec nous, un devis sur mesure, un onboarding accompagné.
> Centrium-platform.com. »

Logo Centrium fullscreen avec halo. Fin.

---

## Captures écran nécessaires

- [ ] `/` (landing complète, scroll)
- [ ] `/dashboard` (avec données démo)
- [ ] `/consultants` (liste + fiche)
- [ ] `/cv-optimizer` (avant / après)
- [ ] `/matching` (résultats avec scores)
- [ ] `/crm` (pipeline drag & drop)
- [ ] `/admin/audit` (journal d'activités)
- [ ] `/security` (page conformité)
- [ ] `/devis` (formulaire propre)

## Voix off — direction

- **Ton** : posé, confiant, pas vendeur agressif
- **Cible audio** : dirigeants 35-55 ans, ESN
- **Genre** : préférence féminin, accent neutre français
- **Studio** : enregistrement pro, < 100 € via Voice123 ou Vocadium

## Production

- **Outil édition** : Descript ou Final Cut Pro
- **Animations UI** : enregistrer écran à 60 fps + leger zoom / pan en post
- **Musique** : Artlist ou Epidemic Sound, ~30 € pour licences
- **Sous-titres** : Descript auto + relecture humaine

## Budget cible

| Poste | Montant |
|---|---|
| Voix off | 100-300 € |
| Musique | 30 € |
| Editing (interne) | 8-12 h de travail |
| Editing (sous-traité) | 800-1 500 € |
| **Total** | **150 € (interne) à 2 000 € (externalisé)** |

## Calendrier de production

| Semaine | Étape |
|---|---|
| S1 | Capture screens + montage brouillon |
| S2 | Voix off + sync |
| S3 | Édition finale + sous-titres + corrections |
| S4 | Publication multi-format + landing |
