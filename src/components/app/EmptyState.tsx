'use client';

import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/**
 * Empty state élégant — halo violet/rose + icône + titre éditorial.
 * À utiliser dans toutes les pages quand une liste / table est vide.
 *
 * Usage :
 *   <EmptyState
 *     icon={Users}
 *     title="Aucun consultant pour l'instant"
 *     description="Importez votre première bibliothèque ou créez-en un manuellement."
 *     action={<Button>Importer un CV</Button>}
 *   />
 */
export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-hairline bg-card/40 backdrop-blur-md px-6 py-14 text-center',
        className,
      )}
    >
      {/* Halo doux derrière l'icône — DARK uniquement (pas d'aura rose en light).
          En light, l'EmptyState reste sobre sur fond crème, juste l'icône
          terracotta + le titre éditorial. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 dark:opacity-100"
      >
        <div className="h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(225,29,116,0.18),rgba(168,85,247,0.1),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-4">
        {Icon && (
          <div className="rounded-2xl border border-magenta/30 bg-magenta/[0.06] p-4 text-magenta">
            <Icon className="h-7 w-7" />
          </div>
        )}
        <h3 className="font-display font-light tracking-[-0.02em] text-xl text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
