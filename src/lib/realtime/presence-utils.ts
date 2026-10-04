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
  /** Anneau quand l'utilisateur manipule un élément. */
  ring: string;
  /** Couleur de bordure plus marquée. */
  border: string;
  /** Couleur brute (styles inline). */
  hex: string;
  /** Ombre légère (rgba) — conservée pour compatibilité. */
  glow: string;
  /** Texte lisible sur le fond. */
  text: string;
  /** Nom court (debug / tooltip éventuel). */
  name: string;
};

// Teintes chaudes et désaturées, distinguables entre elles (contraste AA
// du texte blanc sur chaque fond).
const PALETTE: PresenceColor[] = [
  { bg: 'bg-[#B0503A]', ring: 'ring-[#B0503A]/60', border: 'border-[#B0503A]/70', hex: '#B0503A', glow: 'rgba(176,80,58,0.35)', text: 'text-white', name: 'terracotta' },
  { bg: 'bg-[#3F6A8A]', ring: 'ring-[#3F6A8A]/60', border: 'border-[#3F6A8A]/70', hex: '#3F6A8A', glow: 'rgba(63,106,138,0.35)', text: 'text-white', name: 'acier' },
  { bg: 'bg-[#5E6E3A]', ring: 'ring-[#5E6E3A]/60', border: 'border-[#5E6E3A]/70', hex: '#5E6E3A', glow: 'rgba(94,110,58,0.35)', text: 'text-white', name: 'olive' },
  { bg: 'bg-[#8A5A1F]', ring: 'ring-[#8A5A1F]/60', border: 'border-[#8A5A1F]/70', hex: '#8A5A1F', glow: 'rgba(138,90,31,0.35)', text: 'text-white', name: 'ocre' },
  { bg: 'bg-[#7A4E63]', ring: 'ring-[#7A4E63]/60', border: 'border-[#7A4E63]/70', hex: '#7A4E63', glow: 'rgba(122,78,99,0.35)', text: 'text-white', name: 'prune' },
  { bg: 'bg-[#2F6B5E]', ring: 'ring-[#2F6B5E]/60', border: 'border-[#2F6B5E]/70', hex: '#2F6B5E', glow: 'rgba(47,107,94,0.35)', text: 'text-white', name: 'sapin' },
  { bg: 'bg-[#6B5D52]', ring: 'ring-[#6B5D52]/60', border: 'border-[#6B5D52]/70', hex: '#6B5D52', glow: 'rgba(107,93,82,0.35)', text: 'text-white', name: 'taupe' },
  { bg: 'bg-[#9D4432]', ring: 'ring-[#9D4432]/60', border: 'border-[#9D4432]/70', hex: '#9D4432', glow: 'rgba(157,68,50,0.35)', text: 'text-white', name: 'brique' },
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
