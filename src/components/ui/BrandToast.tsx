'use client';

import {
  Check,
  Pencil,
  Trash2,
  Info,
  AlertTriangle,
  Sparkles,
  XCircle,
  ArrowRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Toasts Centrium — design « haut de gamme » :
 *   - carte sombre uniforme (pas de gradient par variant)
 *   - hairline 1px gauche colorée comme seul signal de variant
 *   - icône monochrome dans pastille discrète
 *   - titre normal-case (pas capitalisé arbitrairement)
 *   - largeur 300px, dismiss bouton visible au hover seulement
 *
 * Variants :
 *   - success      → création simple (vert hairline)         — 1800ms
 *   - update       → modification simple (violet hairline)   — 1800ms
 *   - destructive  → action destructive réussie (rouge)      — 2500ms
 *   - milestone    → état pipeline changé / cross-vue        — 3000ms
 *   - error        → vraie erreur (rouge accent + bg tint)   — 5000ms
 *   - warning      → quota / avertissement (ambre)           — 4000ms
 *   - info         → info neutre (cyan)                      — 2000ms
 *   - celebration  → promotion (gradient brand)              — 6000ms
 *
 * NOTE design : success/update/info/destructive/milestone restent monochromes
 * avec juste un trait gauche coloré. error/warning/celebration sont les
 * SEULS variants à peser visuellement (l'utilisateur DOIT les voir).
 */
export type BrandToastVariant =
  | 'success'
  | 'update'
  | 'destructive'
  | 'milestone'
  | 'error'
  | 'warning'
  | 'info'
  | 'celebration';

type ToastConfig = {
  /** Couleur du trait gauche + (pour error/warning/celebration) du bg tint. */
  accent: string;
  /** Couleur de l'icône. */
  iconColor: string;
  /** Tint de background — undefined = neutre sombre uniforme. */
  bgTintAlpha?: number;
  /** Icône Lucide. */
  Icon: typeof Check;
  /** Si true → bg tinté + halo (variants visuellement « lourds »). */
  loud: boolean;
};

const VARIANTS: Record<BrandToastVariant, ToastConfig> = {
  success: { accent: '#10b981', iconColor: '#6ee7b7', Icon: Check, loud: false },
  update: { accent: '#8b5cf6', iconColor: '#c4b5fd', Icon: Pencil, loud: false },
  destructive: { accent: '#f43f5e', iconColor: '#fda4af', Icon: Trash2, loud: false },
  milestone: { accent: '#22d3ee', iconColor: '#a5f3fc', Icon: ArrowRight, loud: false },
  info: { accent: '#0ea5e9', iconColor: '#7dd3fc', Icon: Info, loud: false },
  warning: {
    accent: '#f59e0b',
    iconColor: '#fbbf24',
    Icon: AlertTriangle,
    loud: true,
    bgTintAlpha: 0.08,
  },
  error: {
    accent: '#ef4444',
    iconColor: '#fca5a5',
    Icon: XCircle,
    loud: true,
    bgTintAlpha: 0.1,
  },
  celebration: {
    accent: '#e11d74',
    iconColor: '#f9a8d4',
    Icon: Sparkles,
    loud: true,
    bgTintAlpha: 0.14,
  },
};

const NEUTRAL_BG = 'rgba(11,11,13,0.95)';
const NEUTRAL_BORDER = 'rgba(255,255,255,0.08)';

type Props = {
  variant: BrandToastVariant;
  title: string;
  description?: string;
  toastId: string | number;
};

/** Couleur RGB depuis un hex. Pour construire les tints proprement. */
function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function BrandToastInner({ variant, title, description, toastId }: Props) {
  const cfg = VARIANTS[variant];
  const Icon = cfg.Icon;
  const [r, g, b] = hexToRgb(cfg.accent);
  const bg = cfg.loud && cfg.bgTintAlpha
    ? `linear-gradient(180deg, rgba(${r},${g},${b},${cfg.bgTintAlpha}) 0%, ${NEUTRAL_BG} 100%)`
    : NEUTRAL_BG;
  const border = cfg.loud
    ? `1px solid rgba(${r},${g},${b},0.25)`
    : `1px solid ${NEUTRAL_BORDER}`;

  return (
    <div
      className="group relative w-[300px] max-w-[88vw] overflow-hidden rounded-lg backdrop-blur-md"
      style={{
        background: bg,
        border,
        boxShadow: cfg.loud
          ? `0 4px 16px -4px rgba(${r},${g},${b},0.18), 0 2px 4px rgba(0,0,0,0.3)`
          : '0 4px 16px -6px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
      }}
    >
      {/* Trait gauche 2px — seul signal de variant pour les variants discrets */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ background: cfg.accent, opacity: cfg.loud ? 1 : 0.7 }}
      />

      <div className="flex items-start gap-2.5 pl-3.5 pr-2 py-2.5">
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-px"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: cfg.iconColor }} />
        </div>

        <div className="flex-1 min-w-0 pt-px">
          <div className="text-[13px] font-medium leading-snug text-white/95 normal-case">
            {title}
          </div>
          {description && (
            <p className="text-[11.5px] text-white/55 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="shrink-0 h-5 w-5 rounded inline-flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/[0.06] transition opacity-0 group-hover:opacity-100"
          aria-label="Fermer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export type BrandToastOptions = {
  description?: string;
  duration?: number;
};

/** Durée par défaut selon le variant — privilégie les variants discrets à
 *  une durée courte (moins de noise visuel), les loud variants restent
 *  plus longtemps pour que l'utilisateur ait le temps de lire. */
const DEFAULT_DURATION: Record<BrandToastVariant, number> = {
  success: 1800,
  update: 1800,
  destructive: 2500,
  milestone: 3000,
  info: 2000,
  warning: 4000,
  error: 5000,
  celebration: 6000,
};

export function showBrandToast(
  variant: BrandToastVariant,
  title: string,
  opts: BrandToastOptions = {},
) {
  const { description, duration } = opts;
  const effectiveDuration = duration ?? DEFAULT_DURATION[variant];
  return toast.custom(
    (id) => (
      <BrandToastInner
        variant={variant}
        title={title}
        description={description}
        toastId={id}
      />
    ),
    { duration: effectiveDuration },
  );
}
