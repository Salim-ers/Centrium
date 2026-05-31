# FAQ Centrium

## Compte & accès

**Comment créer un compte ?**
Centrium est en onboarding accompagné. Demandez un devis sur `/devis`, notre
équipe configure votre espace et vous envoie une invitation par email.

**J'ai oublié mon mot de passe.**
Sur `/login`, cliquer sur « Mot de passe oublié » — vous recevez un lien
de réinitialisation par email.

**Je me déconnecte tout seul après avoir fermé mon navigateur.**
C'est volontaire. Les cookies de session sont purgés à la fermeture pour
la sécurité (notamment sur poste partagé). Un simple `F5` ou un changement
d'onglet ne vous déconnecte pas.

**Puis-je avoir plusieurs organisations sur le même email ?**
Pas dans la version actuelle. Utilisez un alias email par organisation
(ex: `prenom+esn1@mondomaine.com`).

## Données & RGPD

**Où sont stockées mes données ?**
Base de données et stockage Supabase en région UE. Page complète :
[/security](https://centrium-platform.com/security).

**Comment exporter mes données ?**
`/settings/privacy` → bouton « Télécharger mes données » → JSON.

**Comment supprimer mon compte ?**
`/settings/privacy` → section « Supprimer mon compte » → saisir votre email
en confirmation. La demande est traitée sous 30 jours.

**Les données de mes consultants sont-elles partagées avec d'autres ESN ?**
**Non.** Isolation stricte par `organization_id` avec Row Level Security.
Voir la [politique de confidentialité](https://centrium-platform.com/legal/privacy).

## CV Optimizer & IA

**L'IA peut-elle inventer une expérience ?**
**Non, c'est une contrainte forte du moteur.** Voir [AI_AGENTS.md](./AI_AGENTS.md)
pour les détails techniques.

**Pourquoi un score de confiance s'affiche ?**
Pour vous indiquer quels passages sont solides et quels passages
nécessitent votre relecture. Toute proposition IA est un brouillon à
valider — pas une décision finale.

## Facturation & pricing

**Pourquoi pas de prix public ?**
Une ESN de 12 consultants n'a pas les mêmes besoins qu'un groupe de 500
personnes. On préfère cadrer en 20 minutes. Demandez un devis sur `/devis`.

**Y a-t-il un engagement ?**
Engagement minimum 12 mois. Renouvellement mensuel ou annuel ensuite.

**Comment résilier ?**
Email à `contact@centrium-platform.com` avec 30 jours de préavis.

## Technique

**Quels navigateurs sont supportés ?**
Chrome, Firefox, Safari, Edge — 2 dernières versions stables. IE non
supporté.

**Application mobile ?**
Pas en V1. L'app web est responsive (mobile + tablette). App native React
Native prévue en V2.

**SSO disponible ?**
SAML / OIDC en option (Google Workspace, Microsoft Entra, Okta). À
demander dans le devis.

**Y a-t-il une API publique ?**
Voir [API.md](./API.md). API REST disponible sur demande contractuelle.

## Support

**Délai de réponse moyen ?**
24-48 h ouvrées sur les demandes standard, < 1 h sur les P0 (incident
critique). Voir [SUPPORT.md](./SUPPORT.md).
