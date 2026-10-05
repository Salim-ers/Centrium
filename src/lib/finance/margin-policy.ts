// =========================================================================
// Politique de marge de l'organisation : un objectif (sous lequel une marge
// est « faible » et signalée) et un seuil de « bonne » marge. Réglée dans
// Paramètres → Facturation ; un consultant peut avoir son propre objectif,
// qui prime. Ce sont des repères de pilotage : rien n'est jamais bloqué.
// =========================================================================

import { z } from 'zod';

export type MarginPolicy = { target: number; good: number };

export const DEFAULT_MARGIN_POLICY: MarginPolicy = { target: 20, good: 30 };

export const marginPolicySchema = z
  .object({
    target: z.number().min(0).max(90),
    good: z.number().min(0).max(95),
  })
  .refine((p) => p.good > p.target, { message: 'Le seuil de bonne marge doit dépasser l’objectif.', path: ['good'] });

/** Politique stockée, sinon valeurs par défaut (stockage absent ou invalide). */
export function resolveMarginPolicy(raw: unknown): MarginPolicy {
  const parsed = marginPolicySchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_MARGIN_POLICY;
}

export type MarginLevel = 'low' | 'fair' | 'good';

/** Faible sous l'objectif, correcte jusqu'au seuil de bonne marge, bonne au-delà. */
export function marginLevel(pct: number, policy: MarginPolicy, ownTarget?: number | null): MarginLevel {
  const target = ownTarget ?? policy.target;
  if (pct < target) return 'low';
  if (pct < Math.max(policy.good, target)) return 'fair';
  return 'good';
}

/** Marge par jour, en %, et sur un mois de `days` jours facturés. */
export function simulateMargin(rate: number, cost: number, days = 20): { perDay: number; pct: number | null; monthly: number } {
  const perDay = rate - cost;
  return { perDay, pct: rate > 0 ? (perDay / rate) * 100 : null, monthly: perDay * days };
}
