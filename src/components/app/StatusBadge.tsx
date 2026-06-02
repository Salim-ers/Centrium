import { cn } from '@/lib/utils';

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'magenta'
  | 'violet'
  | 'pending';

const TONES: Record<StatusTone, { bg: string; text: string; border: string; dot: string }> = {
  success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  danger: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/25', dot: 'bg-rose-400' },
  info: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/25', dot: 'bg-cyan-400' },
  neutral: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/25', dot: 'bg-slate-400' },
  magenta: { bg: 'bg-magenta/10', text: 'text-magenta-neon', border: 'border-magenta/30', dot: 'bg-magenta-neon' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/25', dot: 'bg-violet-400' },
  pending: { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/25', dot: 'bg-indigo-400' },
};

type Props = {
  tone: StatusTone;
  children: React.ReactNode;
  /** Affiche un point de couleur à gauche du label */
  dot?: boolean;
  /** Active le pulse sur le dot (pour les statuts "live") */
  pulse?: boolean;
  className?: string;
};

/**
 * Badge de statut uniformisé pour TOUS les modules.
 *
 * Tones :
 *   - success : signé, payé, validé, actif
 *   - warning : en attente, à valider, partiellement payé
 *   - danger  : refusé, en retard, erreur
 *   - info    : en cours
 *   - magenta : highlight produit Centrium (CV optimisé, IA suggérée)
 *   - violet  : feature IA (matching, extraction)
 *   - pending : nouveau, brouillon
 *   - neutral : inactif, archivé
 */
export function StatusBadge({ tone, children, dot = true, pulse = false, className }: Props) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-tight',
        t.bg,
        t.text,
        t.border,
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            t.dot,
            pulse && 'animate-pulse shadow-[0_0_8px_currentColor]',
          )}
        />
      )}
      {children}
    </span>
  );
}
