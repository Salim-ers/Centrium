'use client';

import {
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Info,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export type BrandToastVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'celebration';

type ToastConfig = {
  /** Couleur d'accent — bordure latérale et icône. */
  accent: string;
  /** Couleur de l'icône (souvent dérivée de l'accent). */
  iconColor: string;
  /** Icône Lucide à utiliser. */
  Icon: typeof CheckCircle2;
};

const VARIANTS: Record<BrandToastVariant, ToastConfig> = {
  success: {
    accent: '#10b981',
    iconColor: '#34d399',
    Icon: CheckCircle2,
  },
  warning: {
    accent: '#f59e0b',
    iconColor: '#fbbf24',
    Icon: AlertTriangle,
  },
  error: {
    accent: '#f43f5e',
    iconColor: '#fb7185',
    Icon: Trash2,
  },
  info: {
    accent: '#0ea5e9',
    iconColor: '#38bdf8',
    Icon: Info,
  },
  celebration: {
    accent: '#a855f7',
    iconColor: '#c084fc',
    Icon: Sparkles,
  },
};

type Props = {
  variant: BrandToastVariant;
  title: string;
  description?: string;
  toastId: string | number;
};

/**
 * Toast minimaliste, design "Linear / Vercel" :
 * - Largeur réduite, padding équilibré
 * - Glass card neutre (bg-card/95 + backdrop-blur)
 * - Trait coloré 2px à gauche pour la signalétique variant
 * - Icône inline 14px, pas de pastille, pas de halo, pas de pulse
 * - Close button discret aligné en haut à droite
 *
 * Plus de gradient agressif ni d'aura — le contraste de la teinte sur
 * le trait gauche + la couleur d'icône suffisent à identifier la nature
 * du message.
 */
function BrandToastInner({ variant, title, description, toastId }: Props) {
  const cfg = VARIANTS[variant];
  const Icon = cfg.Icon;

  return (
    <div
      className="group relative w-[340px] max-w-[90vw] overflow-hidden rounded-xl border border-hairline bg-card/95 backdrop-blur-xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)]"
    >
      {/* Trait coloré à gauche — l'unique signalétique visuelle */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ background: cfg.accent }}
      />

      <div className="flex items-start gap-2.5 pl-4 pr-3 py-3">
        <Icon
          className="h-3.5 w-3.5 mt-[2px] shrink-0"
          style={{ color: cfg.iconColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium leading-snug text-foreground">
            {title}
          </div>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="shrink-0 -mt-0.5 -mr-1 h-6 w-6 rounded-md inline-flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.05] transition"
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
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
