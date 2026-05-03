import { toast as sonnerToast } from 'sonner';

/**
 * Helpers de notifications. Un wrapper léger sur Sonner qui fixe la
 * sémantique (création / édition / destructif / etc.) à un seul endroit
 * pour que tout le produit ait la même cohérence visuelle.
 *
 * Sonner est configuré globalement avec `richColors`, donc :
 *   - success → vert
 *   - warning → orange (utilisé pour "modification appliquée")
 *   - error   → rouge (utilisé aussi pour les actions destructives
 *               réussies, parce que la couleur est la signalétique)
 *   - info    → bleu
 */

type Opts = { duration?: number };

/** Création d'une ressource — vert. */
export function notifyCreated(message: string, opts?: Opts) {
  return sonnerToast.success(message, opts);
}

/** Édition / mise à jour — orange (signal "modification"). */
export function notifyUpdated(message: string, opts?: Opts) {
  return sonnerToast.warning(message, opts);
}

/**
 * Action destructive réussie (archive, suppression, retrait du vivier) —
 * rouge. Sémantiquement on utilise `error` parce que c'est ce qui rend
 * un toast rouge avec richColors ; le contenu reste positif.
 */
export function notifyDestructive(message: string, opts?: Opts) {
  return sonnerToast.error(message, opts);
}

/** Promotion d'un prospect en consultant — vert (succès important). */
export function notifyPromoted(message: string, opts?: Opts) {
  return sonnerToast.success(message, { duration: 6000, ...opts });
}

/** Erreur réelle (réseau, validation serveur, etc.) — rouge. */
export function notifyError(message: string, opts?: Opts) {
  return sonnerToast.error(message, opts);
}

/** Avertissement (limite atteinte, lien copié manuellement…) — orange. */
export function notifyWarning(message: string, opts?: Opts) {
  return sonnerToast.warning(message, opts);
}

/** Info neutre — bleu. */
export function notifyInfo(message: string, opts?: Opts) {
  return sonnerToast.info(message, opts);
}
