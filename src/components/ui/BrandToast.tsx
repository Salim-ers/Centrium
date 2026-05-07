'use client';

import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export type BrandToastVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'celebration';

type ToastConfig = {
  /** Couleurs du dégradé de bordure (haut→bas). */
  border: [string, string];
  /** Couleur du halo gauche (rgba). */
  haloLeft: string;
  /** Couleur du halo droite (rgba). */
  haloRight: string;
  /** Couleur du fond de la pastille icône. */
  iconBg: string;
  /** Couleur de la bordure de la pastille icône. */
  iconBorder: string;
  /** Couleur de l'icône. */
  iconColor: string;
  /** Couleur du gros titre. */
  titleColor: string;
  /** Couleur de la pastille pulsante en haut à droite de l'icône. */
  pulseDot: string;
  /** Icône Lucide à utiliser. */
  Icon: typeof CheckCircle2;
};

const VARIANTS: Record<BrandToastVariant, ToastConfig> = {
  success: {
    border: ['#10b981', '#22d3ee'],
    haloLeft: 'rgba(16,185,129,0.45)',
    haloRight: 'rgba(34,211,238,0.40)',
    iconBg:
      'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(34,211,238,0.25))',
    iconBorder: 'rgba(16,185,129,0.4)',
    iconColor: '#6ee7b7',
    titleColor: '#a7f3d0',
    pulseDot: 'radial-gradient(circle, #d1fae5 0%, #10b981 70%)',
    Icon: CheckCircle2,
  },
  warning: {
    border: ['#f59e0b', '#fb923c'],
    haloLeft: 'rgba(245,158,11,0.45)',
    haloRight: 'rgba(251,146,60,0.40)',
    iconBg:
      'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,146,60,0.25))',
    iconBorder: 'rgba(245,158,11,0.45)',
    iconColor: '#fcd34d',
    titleColor: '#fde68a',
    pulseDot: 'radial-gradient(circle, #fef3c7 0%, #f59e0b 70%)',
    Icon: AlertTriangle,
  },
  error: {
    border: ['#f43f5e', '#ef4444'],
    haloLeft: 'rgba(244,63,94,0.45)',
    haloRight: 'rgba(239,68,68,0.40)',
    iconBg:
      'linear-gradient(135deg, rgba(244,63,94,0.25), rgba(239,68,68,0.25))',
    iconBorder: 'rgba(244,63,94,0.45)',
    iconColor: '#fda4af',
    titleColor: '#fecdd3',
    pulseDot: 'radial-gradient(circle, #fecdd3 0%, #f43f5e 70%)',
    Icon: ShieldAlert,
  },
  info: {
    border: ['#3b82f6', '#0ea5e9'],
    haloLeft: 'rgba(59,130,246,0.45)',
    haloRight: 'rgba(14,165,233,0.40)',
    iconBg:
      'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(14,165,233,0.25))',
    iconBorder: 'rgba(59,130,246,0.45)',
    iconColor: '#7dd3fc',
    titleColor: '#bae6fd',
    pulseDot: 'radial-gradient(circle, #dbeafe 0%, #3b82f6 70%)',
    Icon: Info,
  },
  celebration: {
    border: ['#8b5cf6', '#e11d74'],
    haloLeft: 'rgba(139,92,246,0.55)',
    haloRight: 'rgba(225,29,116,0.55)',
    iconBg:
      'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(225,29,116,0.25))',
    iconBorder: 'rgba(139,92,246,0.4)',
    iconColor: '#ddd6fe',
    titleColor: '#fff',
    pulseDot: 'radial-gradient(circle, #f5d0fe 0%, #e11d74 70%)',
    Icon: Sparkles,
  },
};

type Props = {
  variant: BrandToastVariant;
  title: string;
  description?: string;
  toastId: string | number;
};

function BrandToastInner({ variant, title, description, toastId }: Props) {
  const cfg = VARIANTS[variant];
  const Icon = cfg.Icon;

  return (
    <div
      className="relative w-[360px] max-w-[90vw] rounded-2xl p-[1.5px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.5)]"
      style={{
        background: `linear-gradient(135deg, ${cfg.border[0]} 0%, ${cfg.border[1]} 100%)`,
      }}
    >
      <div className="rounded-2xl bg-[#0d0e16]/95 backdrop-blur-xl px-4 py-3 flex items-start gap-3 overflow-hidden relative">
        {/* Halos doux */}
        <div
          aria-hidden
          className="absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${cfg.haloLeft}, transparent 70%)` }}
        />
        <div
          aria-hidden
          className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full opacity-30 blur-2xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${cfg.haloRight}, transparent 70%)` }}
        />

        {/* Pastille icône */}
        <div className="relative shrink-0">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: cfg.iconBg, border: `1px solid ${cfg.iconBorder}` }}
          >
            <Icon className="h-4 w-4" style={{ color: cfg.iconColor }} />
          </div>
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
            style={{
              background: cfg.pulseDot,
              boxShadow: `0 0 10px ${cfg.haloLeft}`,
            }}
          />
        </div>

        <div className="flex-1 min-w-0 relative">
          <div
            className="text-[13px] font-semibold leading-tight tracking-tight"
            style={{ color: cfg.titleColor }}
          >
            {title}
          </div>
          {description && (
            <p className="text-[11px] text-white/65 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="text-white/40 hover:text-white/80 transition text-sm leading-none -mr-1 -mt-1"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export type BrandToastOptions = {
  description?: string;
  duration?: number;
};

/**
 * Affiche un toast custom au design Centrium (border gradient, glass card,
 * halos, pastille icône). Variant détermine la palette + l'icône.
 */
export function showBrandToast(
  variant: BrandToastVariant,
  title: string,
  opts: BrandToastOptions = {},
) {
  const { description, duration = 4000 } = opts;
  return toast.custom(
    (id) => (
      <BrandToastInner
        variant={variant}
        title={title}
        description={description}
        toastId={id}
      />
    ),
    { duration },
  );
}
