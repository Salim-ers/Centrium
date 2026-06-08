import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, callerIp } from '@/lib/security/rate-limit';
import {
  DEFAULT_PASSWORD_POLICY,
  isPasswordPwned,
  validatePassword,
} from '@/lib/security/password';

export const runtime = 'nodejs';

/**
 * Vérifie en temps réel qu'un mot de passe respecte la policy + n'est
 * pas dans HaveIBeenPwned. À appeler depuis le formulaire de signup /
 * change-password avant submit.
 *
 * Rate-limité (10 req/min/IP) pour éviter qu'on s'en serve comme oracle
 * de vérification de mots de passe pour des emails arbitraires.
 */
const bodySchema = z.object({
  password: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  const ip = callerIp(req);
  const rl = await rateLimit(`pwd-check:${ip}`, { limit: 10, windowSec: 60 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const { password } = parsed.data;
  const policyErrors = validatePassword(password, DEFAULT_PASSWORD_POLICY);
  const hibp = await isPasswordPwned(password);

  const allErrors = [...policyErrors];
  if (hibp.pwned) {
    allErrors.push(
      `Ce mot de passe a été retrouvé ${hibp.count.toLocaleString('fr-FR')} fois dans des fuites de données publiques. Choisis-en un autre.`,
    );
  }

  return NextResponse.json(
    {
      data: {
        ok: allErrors.length === 0,
        errors: allErrors,
        strength: scoreStrength(password),
      },
    },
    { status: 200 },
  );
}

/**
 * Score de force grossier (0-4) basé sur longueur + diversité.
 * Sert à afficher une jauge dans l'UI. NE remplace PAS la vraie validation.
 */
function scoreStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  const classes =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  if (classes >= 3) score++;
  if (classes === 4 && password.length >= 14) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}
