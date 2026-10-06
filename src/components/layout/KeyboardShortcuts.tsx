'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Permission } from '@/lib/auth/permissions';

const OPEN_EVENT = 'centrium:shortcuts-help';
/** Délai pour la seconde touche d'une séquence « G puis … ». */
const SEQUENCE_MS = 1200;

/** Ouvre l'aide des raccourcis depuis n'importe où (palette, menu d'aide). */
export function openShortcutsHelp() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type GoTo = { key: string; href: string; label: { fr: string; en: string }; permission?: Permission[] };

// Peu de raccourcis, faciles à retenir : les quatre destinations du quotidien.
const GO_TO: GoTo[] = [
  { key: 'd', href: '/dashboard', label: { fr: 'Dashboard', en: 'Dashboard' } },
  { key: 'c', href: '/crm', label: { fr: 'CRM', en: 'CRM' }, permission: ['crm.view', 'opportunities.view'] },
  { key: 't', href: '/consultants', label: { fr: 'Talents', en: 'Talents' }, permission: ['consultants.view'] },
  { key: 'm', href: '/missions', label: { fr: 'Missions', en: 'Missions' }, permission: ['missions.view'] },
];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

/**
 * Raccourcis globaux de l'application : « G puis D / C / T / M » pour
 * naviguer, « ? » pour l'aide. ⌘K / Ctrl K (recherche) et C (créer) sont
 * gérés par la palette et le bouton Créer.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const [open, setOpen] = useState(false);
  const pending = useRef(0);
  const allowed = GO_TO.filter((g) => !g.permission || g.permission.some((p) => can(p)));
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;
  // « [ » replie ou déplie la barre latérale (comme la flèche de son bord).
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const sidebarRef = useRef({ collapsed, setCollapsed });
  sidebarRef.current = { collapsed, setCollapsed };

  useEffect(() => {
    const onOpen = () => setOpen(true);
    // Phase de capture : la seconde touche d'une séquence (« G puis C ») ne
    // doit pas aussi déclencher le raccourci simple (« C » = créer).
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (pending.current && Date.now() - pending.current < SEQUENCE_MS) {
        pending.current = 0;
        const target = allowedRef.current.find((g) => g.key === key);
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          router.push(target.href);
        }
        return;
      }
      if (key === 'g') {
        pending.current = Date.now();
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        sidebarRef.current.setCollapsed(!sidebarRef.current.collapsed);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [router]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const rows: Array<{ keys: string[][]; label: string }> = [
    { keys: [[isMac ? '⌘' : 'Ctrl', 'K']], label: fr ? 'Rechercher, ouvrir, créer' : 'Search, open, create' },
    { keys: [['C']], label: fr ? 'Créer' : 'Create' },
    { keys: [['[']], label: fr ? 'Replier ou déplier la barre latérale' : 'Collapse or expand the sidebar' },
    ...allowed.map((g) => ({ keys: [['G'], [g.key.toUpperCase()]], label: `${fr ? 'Aller à' : 'Go to'} ${g.label[lang]}` })),
    { keys: [['?']], label: fr ? 'Afficher cette aide' : 'Show this help' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fr ? 'Raccourcis clavier' : 'Keyboard shortcuts'}</DialogTitle>
          <DialogDescription>{fr ? 'Hors d’un champ de saisie.' : 'Outside of a text field.'}</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]">
              <span>{r.label}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                {r.keys.map((combo, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span>{fr ? 'puis' : 'then'}</span>}
                    {combo.map((k) => (
                      <kbd key={k} className="min-w-[1.6rem] rounded-md border border-border bg-muted px-1.5 py-0.5 text-center font-sans text-[11.5px] font-medium text-foreground">
                        {k}
                      </kbd>
                    ))}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
