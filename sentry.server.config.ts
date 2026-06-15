/**
 * Sentry config SERVER (Node runtime — route handlers, server components).
 *
 * Activé uniquement si SENTRY_DSN est défini.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),

    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,

    // Filtre erreurs Supabase auth (souvent token expiré, pas un bug)
    beforeSend(event, hint) {
      const err = hint.originalException;
      if (
        err instanceof Error &&
        (err.message?.includes('JWT expired') ||
          err.message?.includes('Invalid Refresh Token'))
      ) {
        return null;
      }
      return event;
    },
  });
}
