# /review — Code review automatique

## Usage
```
/review                        # review de la branche courante vs main
/review src/lib/services/*.ts  # review de fichiers spécifiques
```

## Ce que fait cette commande

1. Récupère le diff (`git diff main...HEAD` ou fichiers ciblés)
2. Analyse selon les critères ci-dessous
3. Produit un rapport structuré

## Critères de review

### 🔒 Sécurité
- [ ] Pas de secret en clair
- [ ] Inputs validés via zod avant insertion DB
- [ ] RLS respecté (pas de bypass avec service_role sans raison)
- [ ] Sanitization des données user-generated affichées

### 🧱 Architecture
- [ ] Logique métier dans `lib/services/`, pas dans les composants
- [ ] Server Component si possible, Client Component si nécessaire
- [ ] Pas d'appel Supabase direct depuis les composants de page (préférer hooks/services)

### 📐 Qualité
- [ ] TypeScript strict respecté (pas de `any`)
- [ ] Fonctions <50 lignes, fichiers <300 lignes idéalement
- [ ] Naming clair (pas d'abréviations obscures)
- [ ] Pas de code mort / commenté

### 🧪 Tests
- [ ] Tests unitaires pour services ajoutés/modifiés
- [ ] Tests E2E pour nouveaux parcours critiques
- [ ] Tests passent en local

### 🎨 UX
- [ ] Loading states présents
- [ ] Empty states gérés
- [ ] Toast de confirmation/erreur
- [ ] Accessibilité : labels, aria-*, navigation clavier

## Format de sortie

```
## Review – [branche]

### ✅ Points forts
- …

### ⚠️ À améliorer
- [fichier:ligne] Description + suggestion

### 🔴 Bloquants
- [fichier:ligne] Description + pourquoi c'est bloquant

### 📊 Résumé
- Lignes ajoutées : X
- Lignes supprimées : Y
- Fichiers touchés : Z
- Verdict : ✅ OK | ⚠️ Ajustements | 🔴 À retravailler
```
