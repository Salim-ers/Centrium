'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, ClipboardCheck, FileText, Plus, Receipt, Target, UserRound, Users, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Permission } from '@/lib/auth/permissions';

type CreateItem = { id: string; label: { fr: string; en: string }; hint: { fr: string; en: string }; href: string; icon: LucideIcon; permission: Permission };

/** Tout ce qui se crée dans Centrium, depuis un seul bouton. */
export const CREATE_ITEMS: CreateItem[] = [
  { id: 'client', label: { fr: 'Client', en: 'Client' }, hint: { fr: 'Société cliente', en: 'Client company' }, href: '/clients?new=1', icon: Building2, permission: 'clients.edit' },
  { id: 'contact', label: { fr: 'Contact', en: 'Contact' }, hint: { fr: 'Interlocuteur', en: 'Person' }, href: '/contacts?new=1', icon: UserRound, permission: 'crm.edit' },
  { id: 'opportunity', label: { fr: 'Opportunité', en: 'Opportunity' }, hint: { fr: 'Besoin client', en: 'Client need' }, href: '/crm?new=1', icon: Target, permission: 'opportunities.edit' },
  { id: 'consultant', label: { fr: 'Consultant', en: 'Consultant' }, hint: { fr: 'Profil, CV', en: 'Profile, CV' }, href: '/consultants?new=1', icon: Users, permission: 'consultants.edit' },
  { id: 'mission', label: { fr: 'Mission', en: 'Mission' }, hint: { fr: 'Affectation', en: 'Assignment' }, href: '/missions?new=1', icon: Briefcase, permission: 'missions.edit' },
  { id: 'timesheet', label: { fr: 'CRA', en: 'Timesheet' }, hint: { fr: 'Saisie du mois', en: 'Monthly entry' }, href: '/timesheets?new=1', icon: ClipboardCheck, permission: 'timesheets.validate' },
  { id: 'quote', label: { fr: 'Devis', en: 'Quote' }, hint: { fr: 'Proposition chiffrée', en: 'Priced proposal' }, href: '/documents/quotes/new', icon: Receipt, permission: 'documents.edit' },
  { id: 'document', label: { fr: 'Document', en: 'Document' }, hint: { fr: 'Contrat, pièce', en: 'Contract, file' }, href: '/documents?new=1', icon: FileText, permission: 'documents.edit' },
];

const OPEN_EVENT = 'centrium-open-quick-create';

/** Ouvre la feuille de création depuis n'importe où (raccourci « C »). */
export function openQuickCreate() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

/** Bouton « + Créer » : une feuille de création, filtrée par les droits. */
export function QuickCreate() {
  const router = useRouter();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const [open, setOpen] = useState(false);
  const items = CREATE_ITEMS.filter((i) => can(i.permission));

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="h-9 rounded-xl px-3.5" aria-keyshortcuts="C">
          <Plus />
          <span className="hidden sm:inline">{lang === 'fr' ? 'Créer' : 'Create'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] rounded-2xl p-2">
        <div className="px-2 pb-2 pt-1 text-[12px] font-medium text-muted-foreground">
          {lang === 'fr' ? 'Créer' : 'Create'}
          <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10.5px]">C</kbd>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(it.href);
              }}
              className={cn(
                'group flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-app-peach-light focus-visible:bg-app-peach-light focus-visible:outline-none',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-peach-light text-app-terra transition-colors group-hover:bg-app-terra group-hover:text-white">
                <it.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-foreground">{it.label[lang]}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{it.hint[lang]}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
