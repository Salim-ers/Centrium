/**
 * Sentry config SERVER (Node runtime — route handlers, server components).
 *
 * Activé uniquement si SENTRY_DSN est défini.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

/**
 * Expurge les PII évidentes d'un event avant envoi à Sentry :
 * en-têtes sensibles (Authorization, Cookie), cookies de requête, données
 * utilisateur (e-mail, IP, identifiant nominatif), et e-mails/tokens présents
 * dans les champs texte libres (message, URL, query, exceptions).
 */
function scrubPii(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const TOKEN = /\b(?:Bearer\s+)?[A-Za-z0-9._-]{24,}\b/g;
  const mask = (input: string): string => input.replace(EMAIL, '[email]').replace(TOKEN, '[token]');

  const request = event.request;
  if (request) {
    if (request.headers) {
      for (const key of Object.keys(request.headers)) {
        if (/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token)$/i.test(key)) {
          request.headers[key] = '[redacted]';
        }
      }
    }
    if (request.cookies) {
      delete request.cookies;
    }
    if (request.url) {
      request.url = mask(request.url);
    }
    if (typeof request.query_string === 'string') {
      request.query_string = mask(request.query_string);
    }
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  if (event.message) {
    event.message = mask(event.message);
  }
  for (const value of event.exception?.values ?? []) {
    if (value.value) {
      value.value = mask(value.value);
    }
  }

  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),

    // Ne jamais joindre automatiquement de PII (IP, cookies, headers) aux events.
    sendDefaultPii: false,

    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,

    // Filtre erreurs Supabase auth (souvent token expiré, pas un bug),
    // puis expurge les PII de tout event restant avant envoi.
    beforeSend(event, hint) {
      const err = hint.originalException;
      if (
        err instanceof Error &&
        (err.message?.includes('JWT expired') ||
          err.message?.includes('Invalid Refresh Token'))
      ) {
        return null;
      }
      return scrubPii(event);
    },
  });
}
