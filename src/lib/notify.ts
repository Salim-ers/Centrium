import { toast as sonnerToast } from 'sonner';

import {
  showBrandToast,
  type BrandToastOptions,
} from '@/components/ui/BrandToast';

/**
 * Helpers de notifications. Tous passent maintenant par le toast custom
 * `BrandToast` (gradient border, glass card, halos, pastille icône) pour
 * une signalétique Centrium homogène.
 *
 *   - notifyCreated     → variant success (vert/teal)
 *   - notifyUpdated     → variant warning (ambre/orange)
 *   - notifyDestructive → variant error (rose/rouge)
 *   - notifyPromoted    → variant celebration (violet/magenta brand)
 *   - notifyError       → variant error
 *   - notifyWarning     → variant warning
 *   - notifyInfo        → variant info (bleu/cyan)
 *
 * `description` est facultatif : si fourni, il s'affiche en sous-ligne
 * sous le titre principal.
 */

type Opts = {
  duration?: number;
  description?: string;
};

function pack(opts?: Opts): BrandToastOptions {
  return {
    duration: opts?.duration,
    description: opts?.description,
  };
}

/** Création d'une ressource — vert (icône Check). */
export function notifyCreated(message: string, opts?: Opts) {
  return showBrandToast('success', message, pack(opts));
}

/** Édition / mise à jour — violet (icône Pencil). */
export function notifyUpdated(message: string, opts?: Opts) {
  return showBrandToast('update', message, pack(opts));
}

/** Action destructive réussie (archive, suppression) — rouge (icône Trash). */
export function notifyDestructive(message: string, opts?: Opts) {
  return showBrandToast('destructive', message, pack(opts));
}

/** Promotion d'un prospect en consultant — célébration brand. */
export function notifyPromoted(message: string, opts?: Opts) {
  return showBrandToast('celebration', message, { duration: 6000, ...pack(opts) });
}

/** Erreur réelle (réseau, validation serveur, etc.) — rouge XCircle. */
export function notifyError(message: string, opts?: Opts) {
  return showBrandToast('error', message, pack(opts));
}

/** Avertissement (quota, action déconseillée) — ambre AlertTriangle. */
export function notifyWarning(message: string, opts?: Opts) {
  return showBrandToast('warning', message, pack(opts));
}

/** Info neutre — bleu. */
export function notifyInfo(message: string, opts?: Opts) {
  return showBrandToast('info', message, pack(opts));
}

/**
 * Pipeline state change qui déplace une ligne d'une vue à une autre
 * (ex: Mission terminée → consultant revient dans /consultants, Proposition
 * acceptée → CV passe en mission). Discret mais visible — l'utilisateur a
 * besoin de savoir OÙ la ligne est partie. Icône ArrowRight, cyan, 3s.
 *
 * Différence avec notifyCreated/notifyUpdated : ces derniers sont RESERVED
 * aux events sans changement de vue (et la plupart ont été retirés — le
 * dialog qui se ferme / la ligne qui disparaît est un signal de succès
 * suffisant en soi).
 */
export function notifyMilestone(message: string, opts?: Opts) {
  return showBrandToast('milestone', message, pack(opts));
}

/**
 * Echappatoire : permet aux call-sites externes de fermer un toast par
 * ID. Identique à sonner.toast.dismiss.
 */
export const dismissToast = sonnerToast.dismiss;
