# Procédure d'incident — Sécurité & RGPD

## Définitions

- **Incident sécurité** : tout événement compromettant la confidentialité,
  l'intégrité ou la disponibilité du service.
- **Violation de données personnelles** (RGPD art. 4.12) : destruction,
  perte, altération, divulgation non autorisée ou accès non autorisé à
  des données personnelles.

## Sévérités

| Niveau | Exemple | Délai d'action |
|---|---|---|
| **SEV-1 Critique** | Fuite massive de données, takeover de compte admin, ransomware | < 1 h |
| **SEV-2 Majeur** | Bug exposant des données privées, escalation de privilège isolée | < 4 h |
| **SEV-3 Modéré** | Faille théorique, comportement anormal sans exploitation prouvée | < 24 h |
| **SEV-4 Mineur** | Détail de configuration, info exposée non sensible | < 5 jours |

## Cellule de crise

Composition par défaut :

- **Incident commander** : CTO (ou suppléant CEO si CTO indisponible)
- **Lead technique** : senior dev backend
- **Communication** : CEO ou DPO selon le contexte
- **Référent juridique** : avocat partenaire RGPD

## Workflow SEV-1 / SEV-2

```
Détection  →  Confirmation  →  Containment  →  Eradication  →  Recovery  →  Post-mortem
  (< 15 min)    (< 30 min)        (< 1 h)        (< 4 h)        (< 24 h)      (< 7 j)
```

### 1. Détection
- Alerte interne (monitoring, log review)
- Signalement externe (`security@centrium-platform.com`)
- Découverte fortuite

### 2. Confirmation
- Reproduction du comportement
- Évaluation périmètre : orgs touchées, données exposées, accès tiers
- Décision SEV → ouverture canal Slack dédié `#incident-YYYY-MM-DD`

### 3. Containment
- Couper l'accès au système / utilisateur compromis
- Activer rate-limiting / firewall si nécessaire
- Suspendre la fonction défectueuse (feature flag)

### 4. Eradication
- Patch du code, déploiement hotfix
- Rotation des secrets si exposés
- Purge des données compromises si possible

### 5. Recovery
- Restauration du service
- Validation par les équipes produit + sécurité
- Re-monitoring renforcé pendant 7 jours

### 6. Post-mortem
- Document écrit dans les 7 jours
- Cause racine (5 whys)
- Action items priorisés
- Partagé en interne, synthèse aux clients impactés

## Notification CNIL (violation données personnelles)

**Obligation art. 33 RGPD** : notification CNIL sous **72 heures** dès
qu'une violation est susceptible d'engendrer un risque pour les droits
et libertés des personnes.

### Délais

| T+ | Action |
|---|---|
| T0 | Constat de la violation |
| T+1 h | Confirmation initiale interne |
| T+24 h | Évaluation complète de l'impact |
| T+72 h max | Notification CNIL (téléservice cnil.fr) |
| T+72 h+ | Notification des personnes concernées si risque élevé (art. 34) |

### Contenu de la notification CNIL

1. Nature de la violation, catégories et nombre de personnes / enregistrements
2. Conséquences probables
3. Mesures prises ou envisagées pour limiter les conséquences
4. Coordonnées du DPO ou point de contact

### Notification des personnes concernées (art. 34)

Si la violation est susceptible d'engendrer un **risque élevé** :

- Information directe, dans un langage clair et simple
- Sauf si mesures techniques rendant les données incompréhensibles
  (chiffrement) ou si effort disproportionné (communication publique)

## Communication clients

**Toujours** :

- Honnête, factuel, pas de minimisation
- Délais clairs (« on vous tient informés sous X »)
- Recommandations d'action si applicable (changer mot de passe, surveiller…)
- Suivi post-incident écrit

## Outils

- **Status page** : `status.centrium-platform.com` (à publier en V1)
- **Canal incident** : Slack `#incident-…`
- **Audit logs** : `/admin/audit` (super_admin)
- **Logs hébergeur** : dashboard Supabase / Vercel
- **DPO** : contact@centrium-platform.com

## Tests de procédure

- Drill annuel minimum
- Revue post-mortem partagée avec les clients sous DPA renforcé
