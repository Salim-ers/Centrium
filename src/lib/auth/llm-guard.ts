import 'server-only';
import { NextResponse } from 'next/server';

import { requireOrg, type AuthContext } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/ratelimit/in-memory';
import type { UserRole } from '@/types';

// =========================================================================
// Garde commun des routes IA (Anthropic / VirusTotal)
// -------------------------------------------------------------------------
// Ces routes étaient accessibles SANS authentification : n'importe qui sur
// internet pouvait consommer les quotas ANTHROPIC_API_KEY / VirusTotal.
// Désormais chaque route IA exige :
//   1. une session + une organisation active (requireOrg — inclut le gating
//      d'abonnement : org impayée/expirée → redirect /billing)
//   2. un rôle interne autorisé (par défaut admin/BM/recruteur — les
//      consultants du portail n'ont pas vocation à appeler ces outils)
//   3. un rate-limit par utilisateur (défaut 20 appels/min) pour borner la
//      consommation même en usage légitime.
//
// Usage dans une route :
//   const guard = await guardLlmRoute();
//   if ('response' in guard) return guard.response;
//   const { ctx } = guard;
// =========================================================================

const DEFAULT_ROLES: UserRole[] = ['admin', 'business_manager', 'recruiter'];

type GuardResult = { ctx: AuthContext } | { response: NextResponse };

export async function guardLlmRoute(options?: {
  /** Rôles autorisés (défaut : admin, business_manager, recruiter). */
  roles?: UserRole[];
  /** Appels max par utilisateur par minute (défaut 20). */
  limitPerMinute?: number;
  /** Clé de rate-limit distincte par famille d'outil (défaut 'llm'). */
  bucket?: string;
}): Promise<GuardResult> {
  // requireOrg redirige vers /login (pas de session) ou /billing (abonnement
  // inactif) — un fetch() client suit la redirection et échoue proprement.
  const ctx = await requireOrg();

  const roles = options?.roles ?? DEFAULT_ROLES;
  if (!roles.includes(ctx.role)) {
    return {
      response: NextResponse.json(
        { error: 'forbidden', message: 'Rôle non autorisé pour cet outil.' },
        { status: 403 },
      ),
    };
  }

  const bucket = options?.bucket ?? 'llm';
  const rl = rateLimit({
    key: `${bucket}:${ctx.user.id}`,
    limit: options?.limitPerMinute ?? 20,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return {
      response: NextResponse.json(
        {
          error: 'too_many_requests',
          message: 'Trop d\'appels IA — réessaie dans une minute.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.max(
              1,
              Math.ceil((rl.resetAt - Date.now()) / 1000),
            ).toString(),
          },
        },
      ),
    };
  }

  return { ctx };
}
