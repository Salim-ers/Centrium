# Espace de démonstration — Centrium

Deux accès sans inscription depuis `/demo` :

- **Démo ESN** : la direction d'une ESN fictive de 22 consultants (tableau de
  bord, CRM, talents, Matching IA, staffing, missions, opérations, analytics,
  paramètres) ;
- **Démo Consultant** : le portail d'une consultante en mission (accueil,
  mission, CRA, documents, profil).

Tout vit dans une organisation dédiée, isolée comme n'importe quel client
(`organization_id` + RLS), et un bandeau rappelle partout que les données
sont fictives.

## Contenu

« Atlas Conseil (démo) » :

- 10 clients et prospects, 12 interlocuteurs ;
- 22 consultants : compétences, expériences, certifications, coûts ;
- 22 missions, dont 6 terminées et 1 à venir ;
- 17 opportunités réparties sur tout le pipeline ;
- environ 74 CRA sur quatre mois : 7 à valider, 1 renvoyé, 2 manquants ;
- environ 64 préfactures (payées, émises, une en retard) ;
- des relances et des notes internes.

Les dates sont relatives au jour du seed : la démo reste à jour à chaque
réinitialisation. Les noms sont inventés et les e-mails utilisent les
domaines réservés `.example` / `.invalid`, si bien qu'aucun e-mail réel ne
part.

## Mise en place (staging d'abord)

1. **Régénérer le seed** si le générateur a changé :
   `npx tsx scripts/demo/demo-seed.ts > supabase/seed/demo.sql`.
   La CI rejoue ce fichier sur toutes les migrations (`npm run db:check`).
2. **Jouer le seed** sur la base visée (éditeur SQL Supabase ou psql) :
   `psql "$DATABASE_URL" -f supabase/seed/demo.sql`.
   Seule l'organisation de démo est supprimée puis recréée.
3. **Créer et relier les deux comptes** :

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
   DEMO_SEED_TARGET=<référence du projet, ex. uedmmqkkqgtuncexfjcq> \
   DEMO_ESN_EMAIL=demo-esn@demo.centrium.invalid DEMO_ESN_PASSWORD=… \
   DEMO_CONSULTANT_EMAIL=demo-consultant@demo.centrium.invalid DEMO_CONSULTANT_PASSWORD=… \
   npx tsx scripts/demo/create-demo-users.ts
   ```

   Le script refuse de tourner si `DEMO_SEED_TARGET` ne correspond pas au
   projet de l'URL, ou si un des comptes appartient à une autre organisation.
4. **Ouvrir l'accès** dans l'application, dans les variables d'environnement
   de l'environnement concerné : `DEMO_ACCESS=on` et les quatre identifiants,
   puis redéployer. La page `/demo` affiche alors « Explorez Centrium
   maintenant ».

## Réinitialiser

Rejouer l'étape 2 puis l'étape 3 : les comptes sont conservés et reliés à
nouveau.

## Sécurité

- Le compte ESN a le rôle **Direction** : il voit tout le produit, mais
  n'administre ni l'équipe, ni les rôles, ni l'abonnement.
- `/api/demo/session` referme aussitôt la session si le compte n'appartient
  pas à l'organisation de démo (ou, côté consultant, n'est pas relié à la
  fiche de démo).
- Les mots de passe ne vivent que dans les variables d'environnement, jamais
  dans Git.
- Production : uniquement sur décision explicite.
