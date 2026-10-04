/**
 * Helpers partagés pour la présence "Google Docs style" :
 * - couleur stable dérivée de l'user id (palette fixe)
 * - initiales à partir du prénom/nom (fallback sur l'email)
 *
 * NB Tailwind : toutes les classes utilisées par la palette doivent rester
 * en strings littérales (sinon le JIT ne les voit pas). On les écrit donc
 * une fois ici, sans interpolation dynamique.
 */

export type PresenceColor = {
  /** Couleur de fond du pastille (bg). */
  bg: string;
  /** Halo / ring quand l'utilisateur est en "drag" sur une colonne. */
  ring: string;
  /** Couleur de bordure plus marquée. */
  border: string;
  /** Couleur de halo (rgba) — pour shadow inline. */
  glow: string;
  /** Texte clair lisible sur le fond saturé. */
  text: string;
  /** Nom court (debug / tooltip éventuel). */
  name: string;
};

const PALETTE: PresenceColor[] = [
  { bg: 'bg-primary',  ring: 'ring-primary/60',  border: 'border-primary/70',  glow: 'rgba(139,92,246,0.55)',  text: 'text-white', name: 'violet' },
  { bg: 'bg-info',     ring: 'ring-info/60',     border: 'border-info/70',     glow: 'rgba(14,165,233,0.55)',  text: 'text-white', name: 'sky' },
  { bg: 'bg-success', ring: 'ring-success/60', border: 'border-success/70', glow: 'rgba(16,185,129,0.55)',  text: 'text-white', name: 'emerald' },
  { bg: 'bg-warning',   ring: 'ring-warning/60',   border: 'border-warning/70',   glow: 'rgba(245,158,11,0.55)',  text: 'text-white', name: 'amber' },
  { bg: 'bg-destructive',    ring: 'ring-destructive/60',    border: 'border-destructive/70',    glow: 'rgba(244,63,94,0.55)',   text: 'text-white', name: 'rose' },
  { bg: 'bg-primary', ring: 'ring-primary/60', border: 'border-primary/70', glow: 'rgba(217,70,239,0.55)',  text: 'text-white', name: 'fuchsia' },
  { bg: 'bg-info',    ring: 'ring-info/60',    border: 'border-info/70',    glow: 'rgba(6,182,212,0.55)',   text: 'text-white', name: 'cyan' },
  { bg: 'bg-warning',  ring: 'ring-warning/60',  border: 'border-warning/70',  glow: 'rgba(249,115,22,0.55)',  text: 'text-white', name: 'orange' },
];

/** Couleur stable pour un utilisateur (même id → même couleur). */
export function presenceColor(userId: string): PresenceColor {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/**
 * Initiales toujours sur 2 lettres si possible.
 *
 *   "Jean Dupont", null               → "JD"
 *   "Salim", null                     → "SA"  (2 lettres du prénom)
 *   null, null, "salim.elrs@gmail.com"→ "SE"  (S de salim, E de elrs)
 *   null, null, "alice@a.com"         → "AL"  (2 lettres du local part)
 *   null, null, null                  → "?"
 */
export function presenceInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined,
): string {
  const f = (firstName ?? '').trim();
  const l = (lastName ?? '').trim();
  if (f && l) {
    return (f[0]! + l[0]!).toUpperCase();
  }
  if (f && f.length >= 2) {
    return (f[0]! + f[1]!).toUpperCase();
  }
  if (f) {
    return f[0]!.toUpperCase();
  }
  const e = (email ?? '').trim().toLowerCase();
  if (e) {
    const local = e.split('@')[0] ?? '';
    // Cherche un séparateur dans la partie locale pour reconstituer "prénom.nom"
    const parts = local.split(/[._+\-]/).filter(Boolean);
    if (parts.length >= 2 && parts[0]!.length > 0 && parts[1]!.length > 0) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    if (local.length >= 2) {
      return (local[0]! + local[1]!).toUpperCase();
    }
    if (local.length === 1) {
      return local[0]!.toUpperCase();
    }
  }
  return '?';
}

/** "Jean", "Dupont", fallback "jean@a.com" → "Jean Dupont" / "jean@a.com" */
export function presenceDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined,
): string {
  const full = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  if (full) return full;
  return (email ?? '').trim() || 'Anonyme';
}
