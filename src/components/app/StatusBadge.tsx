import { StatusPill, type StatusTone as PillTone } from '@/components/ui/status-pill';

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'magenta'
  | 'violet'
  | 'pending';

// Les anciens tons « magenta / violet / pending » deviennent l'accent de marque.
const MAP: Record<StatusTone, PillTone> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  neutral: 'neutral',
  magenta: 'brand',
  violet: 'brand',
  pending: 'brand',
};

type Props = {
  tone: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  /** Conservé pour compatibilité (pas d'animation en V2). */
  pulse?: boolean;
  className?: string;
};

/** Badge de statut historique — délègue à StatusPill. */
export function StatusBadge({ tone, children, dot = true, className }: Props) {
  return (
    <StatusPill tone={MAP[tone]} dot={dot} className={className}>
      {children}
    </StatusPill>
  );
}
