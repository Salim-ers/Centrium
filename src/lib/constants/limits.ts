/**
 * Limites globales de caractères pour tous les champs texte de Centrium.
 *
 * Objectif : éviter qu'un user (ou un attaquant via API directe) ne stocke
 * des payloads géants dans la base, ou ne paste 10 Mo de texte dans un
 * champ "nom".
 *
 * Appliquées à 3 niveaux :
 *   1. UI — l'attribut `maxLength` sur <Input> et <Textarea> empêche la
 *      saisie au-delà de la limite (l'utilisateur voit clairement la limite)
 *   2. Validation Zod côté serveur — schémas qui rejettent les payloads trop
 *      longs avec un 400 (pour les call API directs / curl)
 *   3. Contraintes DB — non implémentées ici (les colonnes Supabase sont en
 *      TEXT sans limite par défaut — on s'en tient à la validation côté code)
 *
 * Lignes directrices :
 *   - Champs identifiants courts (nom, ville, statut) : 80-200 chars
 *   - Emails : 254 chars (RFC 5321)
 *   - URLs : 2048 chars
 *   - Slugs / codes : 60 chars
 *   - Descriptions / résumés : 4000 chars (~600 mots)
 *   - Contenu long (bullets, résumé exécutif CV, notes mission) : 8000 chars
 *   - Champs textuels libres très longs (CV import brut, brief AO) : 50000 chars
 */

export const LIMITS = {
  // Identifiants courts
  shortName: 80, // prénom, nom, ville, intitulé court
  name: 200, // nom de société, intitulé long
  slug: 60, // slug URL kebab-case
  code: 40, // forme juridique, code postal, devise…

  // Coordonnées
  email: 254,
  phone: 30,
  url: 2048,
  address: 200,

  // Données légales
  siren: 20,
  siret: 20,
  vatNumber: 30,
  rcs: 100,
  iban: 40,
  bic: 20,

  // Champs libres courts
  jobTitle: 200,
  oneLiner: 280, // tagline, sous-titre…
  category: 100,

  // Champs libres moyens
  description: 4000, // descriptions de mission, brief AO, etc.
  summary: 4000, // résumé exécutif CV, résumé profil
  note: 4000, // notes libres, commentaires

  // Champs libres longs
  bulletPoint: 1000, // une tâche / réalisation dans un CV
  longText: 8000, // contenu d'un module CV complet, body d'un message
  contractClause: 8000, // clause de contrat

  // Champs textuels très longs (rare)
  rawImport: 50000, // CV brut copié-collé, brief AO import en gros, etc.
  emailBody: 50000, // contenu d'un email envoyé

  // Métadonnées
  reason: 2000, // motif de suppression, d'archivage, raison d'incident
  tag: 60, // un tag dans une taxonomie

  // Mot de passe (alignement avec la policy)
  password: 128,
} as const;

export type LimitKey = keyof typeof LIMITS;
