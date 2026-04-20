# SKILL : Génération CV QuadCore

## Quand utiliser ce skill

Activer ce skill dès qu'une tâche implique :
- Générer ou reformuler un CV dans le template QuadCore
- Aligner un CV avec une offre / fiche de poste
- Extraire des compétences d'un CV brut
- Calculer un score de matching CV ↔ offre

## Règles absolues (NON NÉGOCIABLES)

### ❌ INTERDIT

1. **Inventer** une expérience, un client, une certification, une formation, une langue, une compétence
2. **Modifier** une date de mission, un niveau d'expérience, un intitulé de diplôme
3. **Extrapoler** au-delà de ce qui est écrit dans le CV source
4. **Fusionner** deux expériences distinctes en une seule
5. **Supprimer** totalement une expérience significative (>6 mois)

### ✅ AUTORISÉ

1. **Reformuler** les bullet points pour les rendre plus commerciaux
2. **Réorganiser** l'ordre des compétences et expériences (anti-chronologique par défaut)
3. **Densifier** en regroupant des tâches similaires
4. **Mettre en avant** les compétences qui matchent l'offre
5. **Traduire** le jargon technique en langage business
6. **Générer un résumé exécutif** basé uniquement sur les éléments réels du CV

## Pipeline de génération

```
CV brut (PDF/DOCX/texte)
    ↓
[1] Parser : extraction structurée
    → {identity, skills, experiences, education, languages}
    ↓
[2] Analyse offre client
    → {required_skills, nice_to_have, context, industry}
    ↓
[3] Matching
    → {score, matched_skills, gaps, recommendations}
    ↓
[4] Enrichissement (sans invention)
    → reformulation bullet points
    → résumé exécutif
    → priorisation
    ↓
[5] Rendu template QuadCore
    → Standard | Dense | Executive
    ↓
[6] Export PDF
```

## Template QuadCore — Structure

### En-tête
- Logo QuadCore (gauche)
- "QuadCore — IT Services & Consulting" (centre)
- Mention "Document confidentiel" (droite, petit)

### Identité consultant
- Initiales uniquement (ex. "A. S.") pour anonymisation par défaut
- Titre métier (ex. "QA Automation Confirmé")
- Sous-titre (ex. "Playwright / TypeScript / SQL")
- Années d'expérience | Disponibilité | Mobilité | Langues

### Résumé exécutif
- 4 à 6 lignes MAX
- Ton cabinet de conseil
- Format : "[Profil] avec [X ans] d'expérience en [domaines]. Intervient sur [types de missions] dans des environnements [contextes]. Maîtrise [stack clé]."

### Compétences techniques
- Regroupées par catégories (Langages, Frameworks, Cloud, Outils, CI/CD, Tests, Méthodologies)
- Mise en gras des compétences qui matchent l'offre

### Compétences fonctionnelles
- Bullet points orientés impact business
- Éviter : "J'ai fait…", "J'ai participé à…"
- Préférer : "Pilotage de…", "Mise en place de…", "Définition de…"

### Expériences (anti-chrono)
Pour chaque expérience :
- Période (Mois AAAA – Mois AAAA)
- Client / contexte
- Rôle
- Contexte projet (2-3 lignes)
- Tâches clés (5-8 bullets max)
- Environnement technique

### Formation & langues
- Format corporate : `AAAA | Diplôme | Institution`
- Langues avec niveau (Natif, Bilingue, Professionnel, Intermédiaire)

### Footer
- Mention confidentielle
- Pagination
- "QuadCore — IT Services & Consulting"

## Variantes de template

| Template | Cas d'usage | Caractéristiques |
|---|---|---|
| **Standard** | Profils 2-7 ans | Équilibré, toutes sections visibles |
| **Dense** | Profils 7+ ans avec >4 expériences | Plus compact, bullets resserrés, 2-3 pages |
| **Executive** | Directeurs / Lead / Architectes | Résumé exécutif proéminent, moins de technique, plus de pilotage |

## Score de matching

Formule (mock, remplaçable par LLM) :

```
score = 0.5 × skill_coverage + 0.2 × seniority_fit + 0.2 × industry_fit + 0.1 × availability
```

Classification :
- **90-100** : Excellent match
- **75-89**  : Bon match
- **60-74**  : Match moyen (gaps à combler)
- **<60**    : Non recommandé

## Sorties structurées

```ts
type CVGenerationResult = {
  source: ParsedCV;           // CV brut parsé
  offer: JobOffer;            // offre analysée
  matching: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendation: 'recommend' | 'maybe' | 'not_recommended';
  };
  generated: {
    templateId: 'standard' | 'dense' | 'executive';
    summary: string;
    sections: CVSection[];
  };
  warnings: string[];         // ex: "Trou de 8 mois entre 2020 et 2021"
  guardrails: {
    noInvention: boolean;     // doit toujours être true
    flaggedClaims: string[];  // claims qui ne sont pas dans le source
  };
};
```

## Exemple de reformulation

### Source (CV brut)
> "J'ai fait des tests API avec Postman et j'ai automatisé les TNR"

### Reformulé QuadCore
> "Conception et exécution de campagnes de tests API via Postman ; automatisation des tests de non-régression (TNR) pour sécurisation des livraisons."

## Garde-fous techniques

Le système doit retourner dans `warnings` :
- Toute compétence mentionnée dans l'offre **absente** du CV source → ne pas l'ajouter, la signaler
- Toute période incohérente (chevauchement, trou >6 mois)
- Toute certification dont la date d'obtention manque

Le champ `guardrails.noInvention` doit être `true` après audit automatique comparant le CV généré au CV source (diff sémantique).
