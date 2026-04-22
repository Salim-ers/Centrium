import 'server-only';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY manquante dans .env.local');
    }
    _stripe = new Stripe(key, {
      // On laisse Stripe choisir la version d'API par défaut (celle du SDK installé).
      // Si tu veux pin une version précise, consulte
      // https://docs.stripe.com/api/versioning.
      typescript: true,
    });
  }
  return _stripe;
}
