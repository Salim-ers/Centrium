// =========================================================================
// Résolution du mode de TVA pour les sessions Stripe Checkout.
// -------------------------------------------------------------------------
// Trois modes exclusifs, choisis par variables d'environnement :
//   1. STRIPE_TAX_ENABLED=true   → Stripe Tax (automatic_tax) — calcul
//      automatique multi-pays + autoliquidation UE. Payant (service Stripe
//      Tax). Nécessite Stripe Tax configuré dans le dashboard.
//   2. STRIPE_VAT_RATE_ID=txr_…  → taux de TVA FIXE (gratuit). Le taux
//      (créé une fois dans Stripe → Tax rates, en mode « exclusif » puisque
//      les prix sont HT) est appliqué comme default_tax_rates de l'abonnement.
//      Idéal pour un parc 100 % français à 20 %.
//   3. Aucun des deux            → pas de TVA (prix débités tels quels).
//
// STRIPE_TAX_ENABLED a priorité si les deux sont posés.
// =========================================================================

export type TaxParams = {
  /** Params posés sur la Checkout Session (automatic_tax…). */
  sessionTax: Record<string, unknown>;
  /** Params posés sur subscription_data (default_tax_rates…). */
  subscriptionTax: Record<string, unknown>;
  /** true → billing_address_collection: 'required' (exigé par Stripe Tax). */
  addressRequired: boolean;
};

export function resolveTax(): TaxParams {
  const taxEnabled = process.env.STRIPE_TAX_ENABLED === 'true';
  const vatRateId = process.env.STRIPE_VAT_RATE_ID?.trim();

  if (taxEnabled) {
    return {
      sessionTax: {
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
        customer_update: { address: 'auto', name: 'auto' },
      },
      subscriptionTax: {},
      addressRequired: true,
    };
  }

  if (vatRateId) {
    return {
      sessionTax: {},
      subscriptionTax: { default_tax_rates: [vatRateId] },
      addressRequired: false,
    };
  }

  return { sessionTax: {}, subscriptionTax: {}, addressRequired: false };
}
