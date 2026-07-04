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
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

/**
 * Toasts Centrium — design « haut de gamme », THÈME-AWARE :
 *   - light : carte crème/blanche opaque, ombre douce, accents terracotta
 *   - dark  : carte verre sombre, ombre profonde
 *   - trait gauche coloré = signal de variant
 *   - pastille d'icône teintée, titre + description hiérarchisés
 *   - dismiss visible au hover, largeur 340px
 *
 * Variants : success / update / destructive / milestone (discrets),
 * error / warning / celebration (loud : wash teinté + bord coloré),
 * loading (spinner, dismiss manuel).
 */
export type BrandToastVariant =
  | 'success'
  | 'update'
  | 'destructive'
  | 'milestone'
  | 'error'
  | 'warning'
  | 'info'
  | 'celebration'
  | 'loading';

type ToastConfig = {
  Icon: typeof Check;
  /** Variant « lourd » : wash teinté + bordure colorée (doit être VU). */
  loud: boolean;
  /** Trait gauche. */
  hairline: string;
  /** Pastille icône (fond + bordure), light + dark. */
  chip: string;
  /** Couleur icône, light + dark. */
  icon: string;
  /** Wash de fond pour les variants loud (dégradé haut → transparent). */
  wash?: string;
  /** Bordure carte pour les variants loud. */
  loudBorder?: string;
};

const VARIANTS: Record<BrandToastVariant, ToastConfig> = {
  success: {
    Icon: Check,
    loud: false,
    hairline: 'bg-emerald-500',
    chip: 'bg-emerald-500/10 border-emerald-500/20',
    icon: 'text-emerald-600 dark:text-emerald-300',
  },
  update: {
    Icon: Pencil,
    loud: false,
    hairline: 'bg-violet-500',
    chip: 'bg-violet-500/10 border-violet-500/20',
    icon: 'text-violet-600 dark:text-violet-300',
  },
  destructive: {
    Icon: Trash2,
    loud: false,
    hairline: 'bg-rose-500',
    chip: 'bg-rose-500/10 border-rose-500/20',
    icon: 'text-rose-600 dark:text-rose-300',
  },
  milestone: {
    Icon: ArrowRight,
    loud: false,
    hairline: 'bg-cyan-500',
    chip: 'bg-cyan-500/10 border-cyan-500/20',
    icon: 'text-cyan-600 dark:text-cyan-300',
  },
  info: {
    Icon: Info,
    loud: false,
    hairline: 'bg-sky-500',
    chip: 'bg-sky-500/10 border-sky-500/20',
    icon: 'text-sky-600 dark:text-sky-300',
  },
  loading: {
    Icon: Loader2,
    loud: false,
    hairline: 'bg-violet-500',
    chip: 'bg-violet-500/10 border-violet-500/20',
    icon: 'text-violet-600 dark:text-violet-300',
  },
  warning: {
    Icon: AlertTriangle,
    loud: true,
    hairline: 'bg-amber-500',
    chip: 'bg-amber-500/15 border-amber-500/25',
    icon: 'text-amber-600 dark:text-amber-300',
    wash: 'from-amber-500/[0.10]',
    loudBorder: 'border-amber-500/40 dark:border-amber-400/25',
  },
  error: {
    Icon: XCircle,
    loud: true,
    hairline: 'bg-rose-500',
    chip: 'bg-rose-500/15 border-rose-500/25',
    icon: 'text-rose-600 dark:text-rose-300',
    wash: 'from-rose-500/[0.10]',
    loudBorder: 'border-rose-500/40 dark:border-rose-400/25',
  },
  celebration: {
    Icon: Sparkles,
    loud: true,
    hairline: 'bg-magenta',
    chip: 'bg-magenta/15 border-magenta/25',
    icon: 'text-magenta dark:text-pink-300',
    wash: 'from-magenta/[0.12]',
    loudBorder: 'border-magenta/40 dark:border-magenta/30',
  },
};

type Props = {
  variant: BrandToastVariant;
  title: React.ReactNode;
  description?: React.ReactNode;
  toastId: string | number;
};

function BrandToastInner({ variant, title, description, toastId }: Props) {
  const cfg = VARIANTS[variant];
  const Icon = cfg.Icon;

  return (
    <div
      role="status"
      className={cn(
        'group relative w-[340px] max-w-[92vw] overflow-hidden rounded-xl border backdrop-blur-xl',
        // Carte : crème opaque en light, verre sombre en dark.
        'bg-white/95 dark:bg-[#0d0d12]/95',
        'shadow-[0_16px_48px_-16px_rgba(30,15,10,0.25),0_2px_8px_rgba(30,15,10,0.08)]',
        'dark:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.8),0_2px_8px_rgba(0,0,0,0.4)]',
        cfg.loud && cfg.loudBorder
          ? cfg.loudBorder
          : 'border-neutral-200/90 dark:border-white/[0.08]',
      )}
    >
      {/* Wash teinté (variants loud uniquement) */}
      {cfg.loud && cfg.wash && (
        <div
          aria-hidden
          className={cn('absolute inset-0 bg-gradient-to-b to-transparent', cfg.wash)}
        />
      )}

      {/* Trait gauche — signal du variant */}
      <div
        aria-hidden
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[3px]',
          cfg.hairline,
          cfg.loud ? 'opacity-100' : 'opacity-80',
        )}
      />

      <div className="relative flex items-start gap-3 pl-4 pr-2.5 py-3">
        <div
          className={cn(
            'h-8 w-8 rounded-lg border flex items-center justify-center shrink-0',
            cfg.chip,
          )}
        >
          <Icon
            className={cn('h-4 w-4', cfg.icon, variant === 'loading' && 'animate-spin')}
          />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[13.5px] font-semibold leading-snug text-neutral-900 dark:text-white/95">
            {title}
          </div>
          {description && (
            <p className="text-[12px] text-neutral-500 dark:text-white/55 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className={cn(
            'shrink-0 h-6 w-6 rounded-md inline-flex items-center justify-center transition',
            'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-900/[0.06]',
            'dark:text-white/30 dark:hover:text-white/80 dark:hover:bg-white/[0.08]',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          )}
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export type BrandToastOptions = {
  description?: React.ReactNode;
  duration?: number;
};

/** Durée par défaut selon le variant — courts pour les discrets, plus
 *  longs pour les loud (l'utilisateur doit avoir le temps de lire). */
const DEFAULT_DURATION: Record<BrandToastVariant, number> = {
  success: 1800,
  update: 1800,
  destructive: 2500,
  milestone: 3000,
  info: 2500,
  warning: 5000,
  error: 6000,
  celebration: 6000,
  loading: 60_000, // dismiss manuel attendu (toast.dismiss après l'opération)
};

export function showBrandToast(
  variant: BrandToastVariant,
  title: React.ReactNode,
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
