'use client';

import { useEffect, useState } from 'react';

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export type DetailTab = { id: string; label: string; content: React.ReactNode };

/**
 * Tiroir de détail (droite, ≈ 560 px) : on consulte un objet sans quitter
 * son contexte (kanban, tableau). En-tête, actions, onglets, corps qui
 * défile seul.
 */
export function DetailDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  badges,
  actions,
  tabs,
  footer,
  initialTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  tabs: DetailTab[];
  footer?: React.ReactNode;
  initialTab?: string;
}) {
  const [tab, setTab] = useState(initialTab ?? tabs[0]?.id ?? '');
  // Nouvel objet ouvert : on revient au premier onglet.
  useEffect(() => {
    if (open) setTab(initialTab ?? tabs[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title]);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-[560px]">
        <div className="shrink-0 border-b border-border px-5 pb-3 pt-4 pr-12">
          <DrawerTitle className="text-[18px] leading-snug">{title}</DrawerTitle>
          {subtitle && <DrawerDescription className="mt-0.5">{subtitle}</DrawerDescription>}
          {badges && <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div>}
          {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
          {tabs.length > 1 && (
            <div role="tablist" aria-label="Sections" className="no-scrollbar -mb-3 mt-3 flex gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={current?.id === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    '-mb-px shrink-0 border-b-2 px-2.5 pb-2.5 pt-1 text-[13px] font-semibold transition-colors',
                    current?.id === t.id ? 'border-app-terra text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {current?.content}
        </div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </DrawerContent>
    </Drawer>
  );
}
