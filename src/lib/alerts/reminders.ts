// =========================================================================
// Relances — décision d'envoi idempotente (logique pure, testable)
// -------------------------------------------------------------------------
// La source de vérité anti-doublon est le journal notification_deliveries :
// « dernier envoi réussi pour (org, dedupe_key, canal) ». Rejouer le cron
// dix fois le même jour n'envoie jamais deux fois la même notification, et
// une relance part exactement tous les N jours tant que l'alerte est active.
// =========================================================================

import type { AlertPriority } from '@/types';

export type ReminderDecision = {
  send: boolean;
  /** true si c'est une relance (≥ 1 envoi passé), false si premier envoi. */
  isReminder: boolean;
  reason: 'first_send' | 'interval_elapsed' | 'too_soon' | 'inactive_status';
};

/**
 * Décide si une notification doit partir pour une alerte donnée.
 *
 * @param alertStatus   statut courant ('new' | 'in_progress' | autres)
 * @param lastSentAt    date du dernier envoi réussi sur ce canal (null = jamais)
 * @param intervalDays  cadence de relance en jours (org-configurable)
 * @param now           horloge injectée (tests)
 */
export function shouldNotify(
  alertStatus: string,
  lastSentAt: Date | null,
  intervalDays: number,
  now: Date = new Date(),
): ReminderDecision {
  // Résolue / ignorée / reportée / expirée → plus aucune relance.
  if (alertStatus !== 'new' && alertStatus !== 'in_progress') {
    return { send: false, isReminder: false, reason: 'inactive_status' };
  }
  if (lastSentAt === null) {
    return { send: true, isReminder: false, reason: 'first_send' };
  }
  const elapsedDays = (now.getTime() - lastSentAt.getTime()) / 86_400_000;
  if (elapsedDays >= intervalDays) {
    return { send: true, isReminder: true, reason: 'interval_elapsed' };
  }
  return { send: false, isReminder: true, reason: 'too_soon' };
}

/**
 * Escalade de priorité selon le nombre de relances déjà envoyées :
 * après `escalateAfter` relances sans résolution, la priorité monte d'un
 * cran (medium→high→critical) — et l'audience s'élargit aux admins.
 */
export function escalatePriority(
  base: AlertPriority,
  reminderCount: number,
  escalateAfter: number,
): AlertPriority {
  if (escalateAfter <= 0 || reminderCount < escalateAfter) return base;
  const ladder: AlertPriority[] = ['low', 'medium', 'high', 'critical'];
  const idx = ladder.indexOf(base);
  const bump = Math.floor(reminderCount / escalateAfter);
  return ladder[Math.min(ladder.length - 1, idx + bump)];
}

/**
 * Corps SMS court et sans donnée sensible (exigence RGPD/sécurité) :
 * ≤ 160 caractères, jamais de montant détaillé, d'IBAN ni de pièce jointe.
 */
export function buildSmsBody(title: string, appUrl: string): string {
  const base = `Centrium : ${title}`;
  const suffix = ` → ${appUrl}`;
  const budget = 160 - suffix.length;
  const clipped = base.length > budget ? base.slice(0, budget - 1) + '…' : base;
  return clipped + suffix;
}
