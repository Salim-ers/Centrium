/**
 * Sentry config CLIENT (browser).
 *
 * Activé uniquement si NEXT_PUBLIC_SENTRY_DSN est défini.
 * Si absent → init no-op, aucun event envoyé (utile en local).
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7),

    // Taux d'échantillonnage des traces de performance
    tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1.0,

    // Désactivé par défaut — activer si tu veux du session replay (10€/mois+)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,

    // Filtres : on n'envoie pas les erreurs de réseau client (network blip)
    // ni les annulations d'AbortController (navigation cancellée)
    ignoreErrors: [
      'AbortError',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'cancelled',
    ],

    // Ne capture pas les requêtes vers Supabase Auth (trop verbeuses)
    beforeSend(event, hint) {
      const err = hint.originalException;
      if (err instanceof Error && err.message?.includes('auth/v1')) {
        return null;
      }
      return event;
    },
  });
}
