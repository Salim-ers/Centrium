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
    hairline: 'bg-success',
    chip: 'bg-success/10 border-success/20',
    icon: 'text-success ',
  },
  update: {
    Icon: Pencil,
    loud: false,
    hairline: 'bg-primary',
    chip: 'bg-primary/10 border-primary/20',
    icon: 'text-primary ',
  },
  destructive: {
    Icon: Trash2,
    loud: false,
    hairline: 'bg-destructive',
    chip: 'bg-destructive/10 border-destructive/20',
    icon: 'text-destructive ',
  },
  milestone: {
    Icon: ArrowRight,
    loud: false,
    hairline: 'bg-info',
    chip: 'bg-info/10 border-info/20',
    icon: 'text-info ',
  },
  info: {
    Icon: Info,
    loud: false,
    hairline: 'bg-info',
    chip: 'bg-info/10 border-info/20',
    icon: 'text-info ',
  },
  loading: {
    Icon: Loader2,
    loud: false,
    hairline: 'bg-primary',
    chip: 'bg-primary/10 border-primary/20',
    icon: 'text-primary ',
  },
  warning: {
    Icon: AlertTriangle,
    loud: true,
    hairline: 'bg-warning',
    chip: 'bg-warning/15 border-warning/25',
    icon: 'text-warning ',
    wash: 'from-warning/[0.10]',
    loudBorder: 'border-warning/40 ',
  },
  error: {
    Icon: XCircle,
    loud: true,
    hairline: 'bg-destructive',
    chip: 'bg-destructive/15 border-destructive/25',
    icon: 'text-destructive ',
    wash: 'from-destructive/[0.10]',
    loudBorder: 'border-destructive/40 ',
  },
  celebration: {
    Icon: Sparkles,
    loud: true,
    hairline: 'bg-primary',
    chip: 'bg-primary/15 border-primary/25',
    icon: 'text-primary ',
    wash: 'from-primary/[0.12]',
    loudBorder: 'border-primary/40 ',
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
        'group relative w-[340px] max-w-[92vw] overflow-hidden rounded-xl border ',
        // Carte : crème opaque en light, verre sombre en dark.
        'bg-muted ',
        'shadow-[0_16px_48px_-16px_rgba(30,15,10,0.25),0_2px_8px_rgba(30,15,10,0.08)]',
        'dark:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.8),0_2px_8px_rgba(0,0,0,0.4)]',
        cfg.loud && cfg.loudBorder
          ? cfg.loudBorder
          : 'border-border ',
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
          <div className="text-[13.5px] font-semibold leading-snug text-foreground ">
            {title}
          </div>
          {description && (
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className={cn(
            'shrink-0 h-6 w-6 rounded-md inline-flex items-center justify-center transition',
            'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]',
            '',
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
