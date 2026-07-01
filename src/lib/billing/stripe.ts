import 'server-only';
import Stripe from 'stripe';

import { requireStripeSecretKey } from './config';

let _stripe: Stripe | null = null;

/**
 * Singleton client Stripe côté serveur. Instanciation lazy — pas de crash
 * au module load si la clé est absente. Config centralisée dans
 * src/lib/billing/config.ts, avec validation de format + jamais de log
 * des valeurs.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(requireStripeSecretKey(), {
      // Version d'API par défaut du SDK.
      // https://docs.stripe.com/api/versioning
      typescript: true,
    });
  }
  return _stripe;
}
