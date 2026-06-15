/**
 * Sentry config EDGE (middleware, edge routes).
 *
 * Activé uniquement si SENTRY_DSN est défini.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    tracesSampleRate: 0.1,
  });
}
