# Documentation produit — Centrium

> Documentation officielle de Centrium par QuadCore SAS.
> Version 1.0 · 2026-06-04

---

## Documents disponibles

### Pour les utilisateurs et clients

| Document | Source Markdown | PDF généré |
|---|---|---|
| **Manuel utilisateur** | [`MANUEL_UTILISATEUR.md`](./MANUEL_UTILISATEUR.md) | [`dist/MANUEL_UTILISATEUR.pdf`](./dist/MANUEL_UTILISATEUR.pdf) |
| **Présentation entreprise** | [`PRESENTATION_ENTREPRISE.md`](./PRESENTATION_ENTREPRISE.md) | [`dist/PRESENTATION_ENTREPRISE.pdf`](./dist/PRESENTATION_ENTREPRISE.pdf) |

### Pour l'équipe interne (gouvernance)

| Document | Localisation |
|---|---|
| Audit technique consolidé | [`../../AUDIT_CENTRIUM.md`](../../AUDIT_CENTRIUM.md) |
| Rapport refonte premium | [`../../PREMIUM_UPGRADE_REPORT.md`](../../PREMIUM_UPGRADE_REPORT.md) |
| Guide installation Security-Audit | [`../security-audit.md`](../security-audit.md) |

---

## Génération PDF

### Pré-requis

`md-to-pdf` est listé en `devDependencies` du `package.json`. Il est installé automatiquement avec :

```bash
npm install
```

### Commande

```bash
npm run docs:pdf
```

Convertit **tous les fichiers `.md` sous `docs/produit/`** en PDF stylés et les place dans `docs/produit/dist/`.

### Stylage

Le rendu PDF est piloté par [`pdf-style.css`](./pdf-style.css) :

- **Couverture** dégradé terracotta + halo + titre éditorial Space Grotesk
- **Headers/footers** paginés avec marque "Centrium · by QuadCore"
- **Typographie** : Space Grotesk (display) + Inter (corps) + Instrument Serif (italique éditorial)
- **Tableaux** raffinés (header sombre, rows alternées crème, footer ligne noire)
- **Blockquotes** encadrées en terracotta sang `#b23a26`
- **Sauts de page** intelligents (avoid orphans, widows, tables, blockquotes)
- **A4 portrait**, marges 22mm × 18mm

### Personnalisation

Pour modifier le style du PDF (changer le rouge, retirer le halo, ajuster la typo) :

1. Éditer [`pdf-style.css`](./pdf-style.css)
2. Relancer `npm run docs:pdf`

---

## Convention de versioning

Chaque document porte en frontmatter YAML :

```yaml
---
title: "..."
subtitle: "..."
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
---
```

Bump du `version` :
- **Patch** (1.0.x) : corrections orthographiques, mise à jour de chiffres, captures
- **Minor** (1.x) : ajout de section, refactor d'un module documenté
- **Major** (x) : restructuration complète, breaking change produit

---

## Diffusion aux clients

Les PDFs générés sont :
- **Auto-contenus** (police embarquée, pas de dépendance externe)
- **Sélectionnables** (texte vectoriel, pas de scan)
- **Imprimables** A4 portrait
- **Légers** (~600 KB par doc)

Distribution recommandée :
1. **Manuel utilisateur** : envoyé en kit de bienvenue après signature contrat
2. **Présentation entreprise** : annexée aux propositions commerciales, fournie en réponse aux due diligence acheteurs

---

## Mise à jour

Pour mettre à jour la doc :

1. Éditer le `.md` correspondant
2. Bump le `version` dans le frontmatter
3. `npm run docs:pdf` pour régénérer
4. Commit + push

Les PDFs générés **sont versionnés dans le repo** (`docs/produit/dist/*.pdf`) pour traçabilité et accès direct sans build.

---

> 📧 Pour toute question sur la documentation : `support@centrium-platform.com`
