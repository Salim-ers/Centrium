import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, callerIp } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/**
 * Pré-flight rate limit avant un POST `auth.signInWithPassword`.
 *
 * À appeler depuis le formulaire de login AVANT le signIn Supabase :
 *   1. Si 429 → afficher "trop de tentatives, réessaie dans X secondes"
 *   2. Sinon → laisser passer le signIn
 *
 * Compte 2 limites en parallèle :
 *   - par IP : 10 tentatives / 5 min (bloque le brute force grossier)
 *   - par email : 5 tentatives / 15 min (bloque le brute force ciblé)
 *
 * Note de sécurité : ce n'est PAS imperméable — un attaquant peut
 * appeler Supabase Auth directement en bypassant cette route. C'est
 * une couche de défense en profondeur. Pour un vrai blocage, il
 * faudrait activer Supabase Auth Rate Limiting (Dashboard → Auth → Rate Limits)
 * ET ce throttle pré-flight.
 */
const bodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  action: z.enum(['login', 'signup', 'reset']).default('login'),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const ip = callerIp(req);
  const { email, action } = parsed.data;

  // Limite par IP : 10/5min — large pour usage légitime, bloque brute force grossier
  const ipResult = await rateLimit(`auth:ip:${action}:${ip}`, {
    limit: 10,
    windowSec: 300,
  });

  // Limite par email : 5/15min — bloque brute force ciblé sur un compte
  const emailResult = await rateLimit(`auth:email:${action}:${email}`, {
    limit: 5,
    windowSec: 900,
  });

  if (!ipResult.ok || !emailResult.ok) {
    const retryAfter = Math.max(
      Math.ceil((ipResult.resetAt - Date.now()) / 1000),
      Math.ceil((emailResult.resetAt - Date.now()) / 1000),
    );
    return NextResponse.json(
      {
        error: 'rate_limited',
        message:
          'Trop de tentatives. Pour ta sécurité, attends quelques minutes avant de réessayer.',
        retry_after_seconds: retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit-IP': String(ipResult.limit),
          'X-RateLimit-Remaining-IP': String(ipResult.remaining),
        },
      },
    );
  }

  return NextResponse.json(
    {
      data: {
        ok: true,
        remaining_ip: ipResult.remaining,
        remaining_email: emailResult.remaining,
      },
    },
    { status: 200 },
  );
}
