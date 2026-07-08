import 'server-only';

import { logger } from '@/lib/logger';

/**
 * Rate limiting basé sur Upstash Redis.
 *
 * Modes :
 *   - Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN définis → Upstash (recommandé)
 *   - Sinon → fallback in-memory (1 process Node, OK en local, INSUFFISANT en prod multi-instance Vercel)
 *
 * Window sliding sur N secondes. Clé = identifiant (IP, user_id, email…).
 *
 * Activation prod :
 *   1. Créer un compte Upstash (https://upstash.com) — gratuit jusqu'à 10k req/jour
 *   2. Créer une DB Redis (région EU-West-1 ou EU-Central-1 pour rester en UE)
 *   3. Récupérer les credentials REST et les ajouter aux env vars Vercel
 *   4. Redéployer — détection auto, fallback in-memory désactivé
 */

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // ms epoch
};

const memStore = new Map<string, { count: number; resetAt: number }>();

function memHit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const existing = memStore.get(key);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowSec * 1000;
    memStore.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, limit, resetAt };
  }
  existing.count += 1;
  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    limit,
    resetAt: existing.resetAt,
  };
}

async function upstashHit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // INCR + EXPIRE atomique via PIPELINE Upstash REST
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSec.toString(), 'NX'],
      ['TTL', key],
    ]),
    cache: 'no-store',
  });

  if (!res.ok) {
    logger.warn('[rate-limit] upstash error', { status: res.status, body: await res.text() });
    return null;
  }

  type PipelineResult = Array<{ result: number } | { error: string }>;
  const data = (await res.json()) as PipelineResult;
  const count = 'result' in data[0] ? data[0].result : 0;
  const ttl = 'result' in data[2] ? data[2].result : windowSec;
  const resetAt = Date.now() + Math.max(ttl, 1) * 1000;

  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    resetAt,
  };
}

export async function rateLimit(
  key: string,
  opts: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
  const upstash = await upstashHit(key, opts.limit, opts.windowSec);
  if (upstash) return upstash;
  return memHit(key, opts.limit, opts.windowSec);
}

/**
 * Helper pour identifier le caller : IP réelle derrière proxies Vercel/Cloudflare.
 */
export function callerIp(req: Request): string {
  // Sur Vercel, x-vercel-forwarded-for et x-real-ip sont posés par la
  // plateforme et NON spoofables. x-forwarded-for est forgeable par le client
  // (la valeur de GAUCHE) → un attaquant qui la fait tourner obtient un bucket
  // de rate-limit neuf à chaque requête. On lit d'abord les en-têtes de
  // confiance ; en dernier recours on prend la valeur de DROITE de XFF (celle
  // ajoutée par le proxy de confiance), jamais celle de gauche.
  const trusted =
    req.headers.get('x-vercel-forwarded-for') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip');
  if (trusted) return trusted.split(',')[0]!.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1]!;
  }
  return 'unknown';
}
