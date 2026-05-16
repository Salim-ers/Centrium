'use client';

import {
  Check,
  Pencil,
  Trash2,
  Info,
  AlertTriangle,
  Sparkles,
  XCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Sémantique des variants :
 *   - success  → création (vert)        ex: "X ajouté"
 *   - update   → modification (violet)  ex: "X mis à jour", "X partagé"
 *   - destructive → destructive réussie (rouge)  ex: "X supprimé"
 *   - error    → erreur réelle (rouge bordeau)   ex: "Mise à jour impossible"
 *   - warning  → avertissement (ambre)            ex: "Quota presque atteint"
 *   - info     → info neutre (bleu)
 *   - celebration → événement spécial (violet/magenta brand)
 *
 * Icônes choisies pour matcher le verbe — pas d'AlertTriangle pour une
 * simple modif, Trash2 réservé aux suppressions, etc.
 */
export type BrandToastVariant =
  | 'success'
  | 'update'
  | 'destructive'
  | 'error'
  | 'warning'
  | 'info'
  | 'celebration';

type ToastConfig = {
  /** Couleur d'accent principale (CSS hex). */
  accent: string;
  /** Couleur de l'icône (souvent plus claire que l'accent). */
  iconColor: string;
  /** Couleur du titre — saturée pour ressortir sur le bg tinté. */
  titleColor: string;
  /** Background rgba — un léger voile de la couleur du variant. */
  bgTint: string;
  /** Border rgba — couleur du variant atténuée. */
  borderColor: string;
  /** Shadow rgba pour le glow vers le bas. */
  shadow: string;
  /** Bg de la pastille icône. */
  iconBg: string;
  /** Icône Lucide. */
  Icon: typeof Check;
};

const VARIANTS: Record<BrandToastVariant, ToastConfig> = {
  success: {
    accent: '#10b981',
    iconColor: '#a7f3d0',
    titleColor: '#d1fae5',
    bgTint: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(13,14,22,0.95) 60%)',
    borderColor: 'rgba(16,185,129,0.45)',
    shadow: 'rgba(16,185,129,0.30)',
    iconBg: 'rgba(16,185,129,0.20)',
    Icon: Check,
  },
  update: {
    accent: '#8b5cf6',
    iconColor: '#ddd6fe',
    titleColor: '#ede9fe',
    bgTint: 'linear-gradient(135deg, rgba(139,92,246,0.20) 0%, rgba(13,14,22,0.95) 60%)',
    borderColor: 'rgba(139,92,246,0.50)',
    shadow: 'rgba(139,92,246,0.35)',
    iconBg: 'rgba(139,92,246,0.22)',
    Icon: Pencil,
  },
  destructive: {
    accent: '#f43f5e',
    iconColor: '#fecdd3',
    titleColor: '#ffe4e6',
    bgTint: 'linear-gradient(135deg, rgba(244,63,94,0.20) 0%, rgba(13,14,22,0.95) 60%)',
    borderColor: 'rgba(244,63,94,0.50)',
    shadow: 'rgba(244,63,94,0.35)',
    iconBg: 'rgba(244,63,94,0.22)',
    Icon: Trash2,
  },
  error: {
    accent: '#dc2626',
    iconColor: '#fecaca',
    titleColor: '#fee2e2',
    bgTint: 'linear-gradient(135deg, rgba(220,38,38,0.22) 0%, rgba(13,14,22,0.95) 60%)',
    borderColor: 'rgba(220,38,38,0.55)',
    shadow: 'rgba(220,38,38,0.40)',
    iconBg: 'rgba(220,38,38,0.24)',
    Icon: XCircle,
  },
  warning: {
    accent: '#f59e0b',
    iconColor: '#fed7aa',
    titleColor: '#fef3c7',
    bgTint: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(13,14,22,0.95) 60%)',
    borderColor: 'rgba(245,158,11,0.50)',
    shadow: 'rgba(245,158,11,0.30)',
    iconBg: 'rgba(245,158,11,0.22)',
    Icon: AlertTriangle,
  },
  info: {
    accent: '#0ea5e9',
    iconColor: '#bae6fd',
    titleColor: '#e0f2fe',
    bgTint: 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(13,14,22,0.95) 60%)',
    borderColor: 'rgba(14,165,233,0.50)',
    shadow: 'rgba(14,165,233,0.30)',
    iconBg: 'rgba(14,165,233,0.22)',
    Icon: Info,
  },
  celebration: {
    accent: '#e11d74',
    iconColor: '#fbcfe8',
    titleColor: '#fdf4ff',
    bgTint: 'linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(225,29,116,0.18) 50%, rgba(13,14,22,0.95) 100%)',
    borderColor: 'rgba(225,29,116,0.55)',
    shadow: 'rgba(225,29,116,0.40)',
    iconBg: 'rgba(225,29,116,0.22)',
    Icon: Sparkles,
  },
};

/** Met une majuscule sur le premier caractère sans toucher au reste —
 *  important pour les titres comme "tessst ajouté" → "Tessst ajouté". */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Props = {
  variant: BrandToastVariant;
  title: string;
  description?: string;
  toastId: string | number;
};

/**
 * Toast Centrium : carte sombre tintée par variant, pastille icône bien
 * visible, titre saturé pour ressortir sur fond coloré. Largeur 360px,
 * trait latéral 3px qui matche l'accent.
 *
 * Le titre est capitalisé automatiquement (1re lettre en majuscule).
 */
function BrandToastInner({ variant, title, description, toastId }: Props) {
  const cfg = VARIANTS[variant];
  const Icon = cfg.Icon;

  return (
    <div
      className="group relative w-[360px] max-w-[90vw] overflow-hidden rounded-xl backdrop-blur-xl"
      style={{
        background: cfg.bgTint,
        border: `1px solid ${cfg.borderColor}`,
        boxShadow: `0 8px 32px -8px ${cfg.shadow}, 0 2px 6px -2px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Trait coloré épais à gauche */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: cfg.accent }}
      />

      <div className="flex items-start gap-3 pl-4 pr-3 py-3.5">
        {/* Pastille icône colorée pour la lisibilité */}
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: cfg.iconBg,
            border: `1px solid ${cfg.borderColor}`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: cfg.iconColor }} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div
            className="text-sm font-semibold leading-snug tracking-tight"
            style={{ color: cfg.titleColor }}
          >
            {capitalize(title)}
          </div>
          {description && (
            <p className="text-[12px] text-white/70 mt-1 leading-snug">
              {capitalize(description)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="shrink-0 h-6 w-6 rounded-md inline-flex items-center justify-center text-white/40 hover:text-white/90 hover:bg-white/[0.08] transition"
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
