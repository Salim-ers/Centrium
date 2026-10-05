'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { onViewsChange, readViews, removeView, sameFilters, saveView, type SavedView, type ViewFilters } from '@/lib/saved-views';
import { cn } from '@/lib/utils';

/**
 * Vues enregistrées d'une liste : appliquer en un clic, enregistrer les
 * filtres courants sous un nom, supprimer. Mémorisées sur cet appareil.
 */
export function SavedViews({ page, current, defaults, onApply }: { page: string; current: ViewFilters; defaults: ViewFilters; onApply: (filters: ViewFilters) => void }) {
  const orgId = useOrganizationSafe()?.activeOrgId;
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!orgId) return;
    const sync = () => setViews(readViews(orgId, page));
    sync();
    return onViewsChange(sync);
  }, [orgId, page]);

  const active = views.find((v) => sameFilters(v.filters, current)) ?? null;
  const isDefault = sameFilters(current, defaults);
  const canSave = !isDefault && name.trim().length > 0;

  function save() {
    if (!canSave) return;
    saveView(orgId, page, name, current);
    setName('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" aria-label={fr ? 'Vues enregistrées' : 'Saved views'}>
          <Bookmark className={cn(active && 'fill-primary text-primary')} />
          <span className="max-w-[10rem] truncate">{active ? active.name : fr ? 'Vues' : 'Views'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[300px] rounded-2xl p-2">
        <div className="px-2 pb-1.5 pt-1 text-[12px] font-medium text-muted-foreground">{fr ? 'Vues enregistrées' : 'Saved views'}</div>
        {views.length === 0 ? (
          <p className="px-2 pb-2 text-[12.5px] text-muted-foreground">
            {fr ? 'Filtrez la liste, puis enregistrez la vue pour la retrouver en un clic.' : 'Filter the list, then save the view to find it again in one click.'}
          </p>
        ) : (
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {views.map((v) => (
              <li key={v.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onApply({ ...defaults, ...v.filters });
                    setOpen(false);
                  }}
                  className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted', active?.id === v.id && 'font-medium text-primary-deep')}
                >
                  <Check className={cn('h-3.5 w-3.5 shrink-0', active?.id === v.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{v.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeView(orgId, page, v.id)}
                  aria-label={fr ? `Supprimer la vue « ${v.name} »` : `Delete view “${v.name}”`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-1.5 flex items-center gap-1.5 border-t border-border px-1 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isDefault ? (fr ? 'Filtrez d’abord la liste' : 'Filter the list first') : fr ? 'Nom de la vue' : 'View name'}
            disabled={isDefault}
            aria-label={fr ? 'Nom de la vue' : 'View name'}
            className="h-8 text-[13px]"
            maxLength={60}
          />
          <Button type="submit" size="sm" disabled={!canSave}>
            {fr ? 'Enregistrer' : 'Save'}
          </Button>
        </form>
        {!isDefault && (
          <button
            type="button"
            onClick={() => {
              onApply(defaults);
              setOpen(false);
            }}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {fr ? 'Effacer les filtres' : 'Clear filters'}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
