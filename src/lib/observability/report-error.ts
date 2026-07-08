import 'server-only';

/**
 * Remonte une erreur GÉRÉE vers Sentry.
 *
 * Les route handlers qui renvoient `NextResponse.json({ error }, { status: 500 })`
 * ne « throw » pas → le hook `onRequestError` (instrumentation.ts) ne les voit
 * PAS. Ce helper rend ces erreurs 4xx/5xx gérées visibles dans le monitoring.
 *
 * - No-op si Sentry n'est pas configuré (pas de DSN) → aucune dépendance dure.
 * - Best-effort : ne throw jamais, ne casse jamais la requête appelante.
 */
export async function reportError(
  error: unknown,
  context?: { route?: string; extra?: Record<string, unknown> },
): Promise<void> {
  try {
    if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error, {
      tags: context?.route ? { route: context.route } : undefined,
      extra: context?.extra,
    });
  } catch {
    /* observabilité best-effort — ne jamais faire échouer la requête */
  }
}
