'use client';

import { Archive, Trash2, X, Undo2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type Action = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
  busy?: boolean;
};

type Props = {
  /** Nombre d'éléments sélectionnés. La barre s'affiche si > 0. */
  count: number;
  /** Nom singulier de l'entité (ex: "consultant", "offre"). */
  entityLabel: string;
  /** Actions disponibles dans la barre. */
  actions: Action[];
  /** Désélectionne tout (× à droite). */
  onClear: () => void;
};

/**
 * Barre d'actions groupées qui se colle en bas de l'écran (sticky) dès
 * qu'au moins 1 élément est sélectionné. Inspirée de Gmail / Linear.
 *
 * Pattern :
 *   <BulkActionBar
 *     count={selectedCount}
 *     entityLabel="consultant"
 *     onClear={clear}
 *     actions={[
 *       { label: 'Archiver', icon: <Archive/>, onClick: handleBulkArchive },
 *       { label: 'Supprimer', icon: <Trash2/>, onClick: handleBulkDelete, variant: 'destructive' },
 *     ]}
 *   />
 */
export function BulkActionBar({ count, entityLabel, actions, onClear }: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  if (count === 0) return null;
  const plural = count > 1 ? 's' : '';

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-primary/40 bg-card/95 px-4 py-2 shadow-[0_8px_30px_-10px_rgba(225,29,116,0.4)]">
        <div className="flex items-center gap-2 pr-3 border-r border-hairline">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold tabular-nums">
            {count}
          </span>
          <span className="text-sm text-foreground/90 font-medium">
            {entityLabel}
            {plural} {isEn ? 'selected' : `sélectionné${plural}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {actions.map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => void action.onClick()}
              disabled={action.busy}
              className={cn(
                action.variant === 'destructive'
                  ? 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                  : '',
              )}
            >
              {action.busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <span className="mr-1.5">{action.icon}</span>
              )}
              {action.label}
            </Button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="ml-1 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title={isEn ? 'Clear selection' : 'Désélectionner'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Icônes pré-exportées pour ne pas avoir à les ré-importer côté caller
export { Archive, Trash2, Undo2 };
