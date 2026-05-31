import 'server-only';

/**
 * Rate limiter in-memory simple (sliding window).
 *
 * ⚠️ Limitations :
 *   - Stockage en mémoire dans le process Node : NON partagé entre
 *     instances horizontales. Suffit pour un MVP single-instance ou
 *     Vercel serverless (chaque cold start a un compteur indépendant
 *     mais ça réduit déjà l'amplitude des abus).
 *   - À remplacer par Upstash Ratelimit ou Redis quand on passe en
 *     multi-instance prod.
 *
 * Usage typique dans une route handler :
 *
 *   const ok = await rateLimit({
 *     key: `quote-requests:${ip}`,
 *     limit: 5,
 *     windowMs: 60_000,
 *   });
 *   if (!ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
 */

type Bucket = { hits: number[]; }; // timestamps ms
const STORE = new Map<string, Bucket>();

// GC périodique : retire les buckets dont le dernier hit est trop vieux.
// On évite que la map enfle indéfiniment sur des clés à faible trafic.
const GC_INTERVAL_MS = 5 * 60_000;
let lastGc = Date.now();

function gc(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  const cutoff = now - 60 * 60_000;
  for (const [key, bucket] of STORE) {
    if (!bucket.hits.length || bucket.hits[bucket.hits.length - 1]! < cutoff) {
      STORE.delete(key);
    }
  }
}

export type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  gc(now);

  let bucket = STORE.get(input.key);
  if (!bucket) {
    bucket = { hits: [] };
    STORE.set(input.key, bucket);
  }

  // Drop hits hors fenêtre.
  const since = now - input.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > since);

  if (bucket.hits.length >= input.limit) {
    const oldest = bucket.hits[0]!;
    return {
      ok: false,
      remaining: 0,
      resetAt: oldest + input.windowMs,
    };
  }

  bucket.hits.push(now);
  return {
    ok: true,
    remaining: input.limit - bucket.hits.length,
    resetAt: now + input.windowMs,
  };
}

/**
 * Helper : extrait l'IP de la requête en prenant en compte
 * X-Forwarded-For (Vercel, Cloudflare). Tombe sur 'unknown' si rien
 * trouvé — toutes les requêtes 'unknown' partageraient alors le même
 * bucket (sécurité acceptable côté MVP).
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
