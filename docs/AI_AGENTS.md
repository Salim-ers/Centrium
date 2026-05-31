# Agents IA — Documentation

## Principes directeurs

Centrium utilise l'IA comme **assistant**, jamais comme décideur autonome.

### 5 contraintes absolues

1. **Jamais d'invention** : une compétence, un client, une certification,
   une langue, un titre — rien n'est ajouté s'il n'est pas dans la source.
2. **Jamais de modification de fait** : dates, niveau d'expérience,
   chiffres clés ne sont pas altérés.
3. **Toujours un score de confiance** : chaque output IA affiche son
   niveau de certitude (0-100 %).
4. **Toujours une trace** : chaque appel IA est journalisé dans la table
   `activities` (`action: ai.requested`, `ai.completed`, `ai.flagged`).
5. **Toujours un humain dans la boucle** : les outputs IA arrivent en mode
   **« brouillon à valider »**, jamais en mode actif.

## Agents actifs

### 1. CV Optimizer

**Localisation** : `src/lib/ai/cv-generator.ts`
**Trigger** : `/cv-optimizer` — upload CV source + offre client
**Modèle visé V1** : Claude Sonnet 4.6 via SDK Anthropic

#### Pipeline

```
CV PDF/DOCX → extract texte → parse structure → match offre →
réécriture (avec garde-fous) → score confiance → output brouillon
```

#### Garde-fous

- Liste blanche des compétences extraites du CV source — l'IA ne peut
  citer QUE celles-là
- Diff source vs output validé côté serveur avant export
- Flag `flaggedClaims[]` qui remonte tout doute
- Mode strict `noInvention=true` (toujours actif en prod)

#### Scoring

```ts
{
  overall: 87,             // % global
  perDimension: {
    technical_skills: 92,
    soft_skills: 78,
    relevance_to_offer: 88,
  },
  flaggedClaims: [],       // [] si aucun doute
  reasoning: 'string',     // justification synthétique
}
```

### 2. Matching consultant ↔ mission

**Localisation** : `src/lib/ai/cv-generator.ts::computeMatching`
**Trigger** : `/matching`
**Mode V1** : déterministe (pas de LLM) — scoring sur critères :
- Compétences requises présentes (poids 50 %)
- Nice-to-have présents (20 %)
- Séniorité compatible (15 %)
- TJM dans la cible (10 %)
- Disponibilité (5 %)

#### Output

```ts
{
  score: 0..100,
  matched_skills: string[],
  missing_skills: string[],
  warnings: string[],
  recommendation: 'strong' | 'fit' | 'risky' | 'pass',
  confidence: 0..100,
}
```

### 3. Assistant comptable

**Localisation** : `src/lib/ai/accounting-assistant.ts`
**Statut** : mock (placeholder pour intégration V1)

## Mode brouillon

Toute action IA pouvant impacter une décision sensible (envoi de CV,
contrat, facture) est marquée `status: 'draft'` jusqu'à validation
humaine explicite.

Pas de "auto-send", pas de "validation à 5 secondes" — l'utilisateur
clique « Valider et envoyer » consciemment.

## Audit & transparence

Chaque appel IA log :

```ts
logAudit({
  organizationId,
  userId,
  entityType: 'ai_cv_optimize' | 'ai_match' | 'ai_accounting',
  entityId: targetEntityId,
  action: 'ai.completed',
  details: {
    model: 'claude-sonnet-4-6',
    prompt_tokens: 1234,
    output_tokens: 567,
    confidence: 87,
    flagged: false,
    latency_ms: 1850,
  },
});
```

## Jeux d'évaluation

À enrichir au fil du temps. Cible :

- 20 CV réels (anonymisés, avec accord) couvrant tech / commerce / RH
- 10 offres types
- Cas d'invention détectée à 100 % (golden tests)
- Cas de format inattendu (CV image, CV bilingue, …)

## Limites assumées

- L'IA peut se tromper sur le **wording marketing** — toute reformulation
  doit être relue par un humain.
- L'IA ne raisonne pas sur des **contextes contractuels** (clauses,
  juridique) — son rôle s'arrête à la suggestion.
- L'IA **ne signe pas**, **n'envoie pas**, **ne facture pas** seule.

## Ressources

- Skill projet : [`.claude/skills/cv-generation/SKILL.md`](../.claude/skills/cv-generation)
- API Anthropic : [docs.anthropic.com](https://docs.anthropic.com)
