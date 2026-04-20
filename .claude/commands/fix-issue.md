# /fix-issue — Résolution d'un ticket

## Usage
```
/fix-issue #42
/fix-issue "Le bouton Générer CV ne déclenche rien sur Safari"
```

## Workflow

1. **Contexte**
   - Lire le ticket (si #ID, via gh CLI)
   - Identifier les fichiers probablement impactés
   
2. **Reproduction**
   - Décrire les étapes pour reproduire
   - Identifier la root cause
   
3. **Fix**
   - Créer une branche `fix/<slug>`
   - Appliquer le correctif minimal
   - Ajouter un test de non-régression
   
4. **Validation**
   - `npm run lint`
   - `npm run type-check`
   - `npm run test`
   - Tester manuellement le parcours
   
5. **Commit**
   - Format : `fix: <description courte> (closes #ID)`
   - Push + ouverture PR avec description détaillée

## Template de PR

```md
## Contexte
[Description du bug + lien ticket]

## Root cause
[Explication technique]

## Correctif
[Ce qui a été modifié et pourquoi]

## Tests
- [ ] Test de non-régression ajouté
- [ ] Testé manuellement sur …
- [ ] Tous les tests passent

## Impact
[Zones du produit potentiellement affectées]
```
