# Support Centrium

## Canaux

| Type de demande | Adresse | SLA cible |
|---|---|---|
| Support général | contact@centrium-platform.com | 24-48 h ouvrées |
| Sécurité / vulnérabilité | security@centrium-platform.com | < 24 h |
| Données personnelles / RGPD | contact@centrium-platform.com | < 30 jours (légal) |
| Commercial / devis | contact@centrium-platform.com | 24-48 h |

## Niveaux de sévérité

| Niveau | Définition | Délai de réponse |
|---|---|---|
| **P0 — Critique** | Plateforme inaccessible, perte de données, faille active | < 1 h ouvrée |
| **P1 — Bloquant** | Module clé indisponible, impacte la facturation | < 4 h ouvrées |
| **P2 — Gênant** | Bug fonctionnel, contournement possible | < 1 jour ouvré |
| **P3 — Mineur** | Détail UI, demande d'évolution | < 5 jours ouvrés |

## Avant de contacter le support

1. **Vérifier la FAQ** : [FAQ.md](./FAQ.md)
2. **Vérifier la page status** : sera publiée à `status.centrium-platform.com`
3. **Recharger la page** + se déconnecter / reconnecter
4. **Vider le cache navigateur** si l'UI semble figée

## Informations à inclure dans un ticket

```
Organisation : [nom + slug]
Utilisateur : [email]
URL : [URL de la page]
Navigateur : [Chrome/Firefox/Safari + version]
Action attendue : [...]
Comportement observé : [...]
Capture d'écran : [joindre si possible]
ID éventuel : [si erreur 500, donner l'identifiant si affiché]
```

## Procédure interne support (équipe Centrium)

Pour l'équipe support QuadCore :

1. Triage dans l'inbox shared → assigner à un membre
2. Catégoriser : Bug / Question / Demande RGPD / Sécurité
3. Pour les demandes RGPD : transmettre à privacy-officer dans les 24 h
4. Pour les bugs : reproduire en local, créer issue GitHub, prioriser
5. Réponse au client + horodatage SLA
6. Si incident sécurité : déclencher [INCIDENT.md](./INCIDENT.md)
