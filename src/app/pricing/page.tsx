import { redirect } from 'next/navigation';

// =========================================================================
// /pricing → redirect permanent vers /tarifs
// -------------------------------------------------------------------------
// Historique : deux URLs de tarification coexistaient — /pricing (page
// "sur devis" sans grille) et /tarifs (grille 3 tiers avec prix). Elles
// racontaient deux choses différentes, incohérence pour les prospects
// et pour le SEO.
//
// Décision : /tarifs = source unique. /pricing redirige.
// L'ancienne page marketing est conservée dans l'historique git.
// =========================================================================

export default function PricingRedirect() {
  redirect('/tarifs');
}
