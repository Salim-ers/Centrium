/**
 * Hook Next.js qui charge les configs Sentry selon le runtime actif.
 * Auto-détecté par Next 14 — requires `experimental.instrumentationHook: true`
 * pour Next < 14.1 (déjà GA après).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validation des env au boot (fail-fast en prod si REQUISES manquantes).
    const { validateEnv } = await import('./lib/env/validate');
    validateEnv();
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  },
) {
  // Import dynamique pour ne charger Sentry que si on est côté serveur
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
}
