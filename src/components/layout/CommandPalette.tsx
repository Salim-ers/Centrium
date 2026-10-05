'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Search,
  Building2,
  UserRound,
  Users,
  Briefcase,
  Target,
  FileText,
  Receipt,
  Plus,
  CornerDownLeft,
  Sparkles,
  ArrowRight,
  Loader2,
  Clock,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { HIDDEN_PAGES, NAV_ITEMS, SECONDARY_ITEMS, SECTION_TABS, SETTINGS_SECTIONS, canSeeNavItem } from '@/lib/navigation';
import { useOrganizationSafe } from '@/lib/auth/context';
import { pushRecent, readRecents, type Recent } from '@/lib/recents';
import { globalSearch, type SearchKind, type SearchResult } from '@/lib/search/global-search';
import type { Permission } from '@/lib/auth/permissions';
import { AssistantAnswer } from '@/components/assistant/AssistantAnswer';

const OPEN_EVENT = 'centrium:command-palette';

/** Ouvre la palette depuis n'importe quel composant. */
export function openCommandPalette(initialQuery?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: initialQuery ?? '' }));
}

type Entry = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
};

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  client: Building2,
  contact: UserRound,
  consultant: Users,
  mission: Briefcase,
  opportunity: Target,
  document: FileText,
  quote: Receipt,
};

const KIND_LABEL: Record<SearchKind, { fr: string; en: string }> = {
  client: { fr: 'Clients', en: 'Clients' },
  contact: { fr: 'Contacts', en: 'Contacts' },
  consultant: { fr: 'Consultants', en: 'Consultants' },
  mission: { fr: 'Missions', en: 'Missions' },
  opportunity: { fr: 'Opportunités', en: 'Opportunities' },
  document: { fr: 'Documents', en: 'Documents' },
  quote: { fr: 'Devis', en: 'Quotes' },
};

type QuickAction = {
  id: string;
  label: { fr: string; en: string };
  href: string;
  permission: Permission;
  keywords: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-client', label: { fr: 'Créer un client', en: 'Create a client' }, href: '/clients?new=1', permission: 'clients.edit', keywords: 'nouveau société compte' },
  { id: 'new-contact', label: { fr: 'Créer un contact', en: 'Create a contact' }, href: '/contacts?new=1', permission: 'crm.edit', keywords: 'nouveau interlocuteur personne' },
  { id: 'new-opportunity', label: { fr: 'Créer une opportunité', en: 'Create an opportunity' }, href: '/crm?new=1', permission: 'opportunities.edit', keywords: 'nouveau besoin affaire deal' },
  { id: 'new-consultant', label: { fr: 'Ajouter un consultant', en: 'Add a consultant' }, href: '/consultants?new=1', permission: 'consultants.edit', keywords: 'nouveau talent cv' },
  { id: 'new-mission', label: { fr: 'Créer une mission', en: 'Create a mission' }, href: '/missions?new=1', permission: 'missions.edit', keywords: 'nouvelle affectation' },
  { id: 'new-quote', label: { fr: 'Créer un devis', en: 'Create a quote' }, href: '/documents/quotes/new', permission: 'documents.edit', keywords: 'nouveau proposition' },
  { id: 'new-timesheet', label: { fr: 'Saisir un CRA', en: 'Enter a timesheet' }, href: '/timesheets?new=1', permission: 'timesheets.validate', keywords: 'compte rendu activité temps' },
  { id: 'new-document', label: { fr: 'Ajouter un document', en: 'Add a document' }, href: '/documents?new=1', permission: 'documents.edit', keywords: 'contrat pièce fichier' },
  { id: 'new-dossier', label: { fr: 'Générer un dossier de compétences', en: 'Generate a skills dossier' }, href: '/cv-optimizer', permission: 'consultants.view', keywords: 'cv optimizer dossier export pdf word' },
  { id: 'see-staffing', label: { fr: 'Voir le staffing', en: 'Open staffing' }, href: '/staffing', permission: 'staffing.view', keywords: 'planning disponibilités' },
];

const RECENT_ICON: Record<string, LucideIcon> = { client: Building2, contact: UserRound, consultant: Users, mission: Briefcase, opportunity: Target, document: FileText, quote: Receipt, timesheet: ClipboardCheck };

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** Une phrase interrogative déclenche le mode assistant. */
function looksLikeQuestion(q: string) {
  const n = normalize(q.trim());
  return (
    n.endsWith('?') ||
    /^(quel|quelle|quels|quelles|qui|combien|trouve|liste|resume|montre|which|what|who|how many|find|list|show|summari[sz]e)\b/.test(n)
  );
}

export function CommandPalette() {
  const router = useRouter();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can } = usePermissions();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [assistantQuestion, setAssistantQuestion] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const [recents, setRecents] = React.useState<Recent[]>([]);
  const supabase = React.useMemo(() => createClient(), []);

  // Raccourci clavier Ctrl/Cmd + K et ouverture programmatique.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = (e: Event) => {
      setQuery((e as CustomEvent<string>).detail ?? '');
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  React.useEffect(() => {
    if (open) setRecents(readRecents(orgId));
    if (!open) {
      setQuery('');
      setResults([]);
      setAssistantQuestion(null);
    }
  }, [open, orgId]);

  // Recherche serveur avec anti-rebond.
  React.useEffect(() => {
    setAssistantQuestion(null);
    const q = query.trim();
    if (q.length < 2 || looksLikeQuestion(q)) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = window.setTimeout(async () => {
      const r = await globalSearch(supabase, q, can);
      setResults(r);
      setSearching(false);
    }, 180);
    return () => window.clearTimeout(id);
    // `can` change d'identité à chaque rendu : on ne relance pas pour ça.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, supabase]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const entries: Entry[] = React.useMemo(() => {
    const q = normalize(query.trim());
    const out: Entry[] = [];
    const isQuestion = query.trim().length > 3 && looksLikeQuestion(query);

    if (!q) {
      for (const r of recents) {
        out.push({
          id: `recent:${r.href}`,
          group: lang === 'fr' ? 'Récemment consulté' : 'Recently viewed',
          label: r.label,
          hint: r.kind && r.kind in KIND_LABEL ? KIND_LABEL[r.kind as SearchKind][lang] : undefined,
          icon: (r.kind && RECENT_ICON[r.kind]) || Clock,
          run: () => go(r.href),
        });
      }
    }

    if (query.trim().length > 3) {
      out.push({
        id: 'assistant',
        group: lang === 'fr' ? 'Assistant' : 'Assistant',
        label: lang === 'fr' ? `Demander : « ${query.trim()} »` : `Ask: “${query.trim()}”`,
        hint: lang === 'fr' ? 'Réponse calculée sur vos données' : 'Answered from your data',
        icon: Sparkles,
        run: () => setAssistantQuestion(query.trim()),
      });
    }

    if (!isQuestion) {
      for (const r of results) {
        out.push({
          id: `${r.kind}:${r.id}`,
          group: KIND_LABEL[r.kind][lang],
          label: r.title,
          hint: r.subtitle,
          icon: KIND_ICON[r.kind],
          run: () => {
            pushRecent(orgId, { href: r.href, label: r.title, kind: r.kind });
            go(r.href);
          },
        });
      }
    }

    const actions = QUICK_ACTIONS.filter(
      (a) => can(a.permission) && (!q || normalize(`${a.label[lang]} ${a.keywords}`).includes(q)),
    );
    for (const a of actions) {
      out.push({
        id: a.id,
        group: lang === 'fr' ? 'Actions rapides' : 'Quick actions',
        label: a.label[lang],
        icon: Plus,
        run: () => go(a.href),
      });
    }

    const goTo = lang === 'fr' ? 'Aller à' : 'Go to';
    const pages = [
      ...NAV_ITEMS.map((i) => ({ id: i.id, label: i.label[lang], hint: undefined as string | undefined, href: i.href, icon: i.icon, item: i, keywords: i.keywords ?? [] })),
      ...(Object.entries(SECTION_TABS) as Array<[string, (typeof SECTION_TABS)[keyof typeof SECTION_TABS]]>).flatMap(([sid, tabs]) => {
        const parent = NAV_ITEMS.find((n) => n.id === sid);
        return tabs.map((t) => ({ id: `${sid}:${t.href}`, label: t.label[lang], hint: parent?.label[lang], href: t.href, icon: parent?.icon ?? ArrowRight, item: t, keywords: [] as string[] }));
      }),
      ...HIDDEN_PAGES.map((i) => ({ id: i.id, label: i.label[lang], hint: undefined as string | undefined, href: i.href, icon: i.icon, item: i, keywords: i.keywords ?? [] })),
      ...SECONDARY_ITEMS.map((i) => ({ id: i.id, label: i.label[lang], hint: undefined as string | undefined, href: i.href, icon: i.icon, item: i, keywords: i.keywords ?? [] })),
      // Sections des Paramètres : « branding », « équipe », « abonnement »…
      ...SETTINGS_SECTIONS.filter((t) => t.href !== '/settings').map((t) => ({ id: `settings:${t.href}`, label: t.label[lang], hint: lang === 'fr' ? 'Paramètres' : 'Settings', href: t.href, icon: t.icon, item: t, keywords: [] as string[] })),
    ];
    const seen = new Set<string>();
    for (const p of pages) {
      if (seen.has(p.href + p.label) || !canSeeNavItem(p.item, can)) continue;
      seen.add(p.href + p.label);
      const hay = normalize(`${p.label} ${p.hint ?? ''} ${p.keywords.join(' ')}`);
      if (q && !hay.includes(q)) continue;
      out.push({ id: `nav:${p.id}`, group: goTo, label: p.label, hint: p.hint, icon: p.icon, run: () => go(p.href) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, results, lang, go, recents]);

  React.useEffect(() => setActive(0), [query, results.length]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (assistantQuestion) {
      if (e.key === 'Backspace' && query === assistantQuestion) setAssistantQuestion(null);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(entries.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      entries[active]?.run();
    }
  }

  let lastGroup = '';
  const activeId = entries[active] ? `cmd-${entries[active]!.id}` : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[#191817]/25 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label={lang === 'fr' ? 'Palette de commandes' : 'Command palette'}
          className="fixed left-1/2 top-[12vh] z-[61] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]"
        >
          <DialogPrimitive.Title className="sr-only">
            {lang === 'fr' ? 'Rechercher ou lancer une action' : 'Search or run an action'}
          </DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded
              aria-controls="cmd-list"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              placeholder={
                lang === 'fr'
                  ? 'Rechercher un client, un consultant, une mission… ou poser une question'
                  : 'Search a client, consultant, mission… or ask a question'
              }
              className="h-12 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80"
            />
            <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              Esc
            </kbd>
          </div>

          {assistantQuestion ? (
            <AssistantAnswer question={assistantQuestion} onNavigate={go} />
          ) : (
            <div ref={listRef} id="cmd-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
              {entries.length === 0 && !searching && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {lang === 'fr' ? 'Aucun résultat.' : 'No results.'}
                </div>
              )}
              {entries.map((entry, i) => {
                const showGroup = entry.group !== lastGroup;
                lastGroup = entry.group;
                const Icon = entry.icon;
                const isActive = i === active;
                return (
                  <React.Fragment key={entry.id}>
                    {showGroup && (
                      <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium text-muted-foreground">{entry.group}</div>
                    )}
                    <div
                      id={`cmd-${entry.id}`}
                      data-index={i}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActive(i)}
                      onClick={() => entry.run()}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px]',
                        isActive ? 'bg-muted text-foreground' : 'text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                          entry.id === 'assistant'
                            ? 'border-brand-100 bg-brand-50 text-primary'
                            : 'border-border bg-card text-muted-foreground',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{entry.label}</span>
                        {entry.hint && <span className="block truncate text-xs text-muted-foreground">{entry.hint}</span>}
                      </span>
                      {isActive && (
                        entry.id.startsWith('nav:') || entry.id.includes(':') ? (
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">
              ↑↓ {lang === 'fr' ? 'naviguer' : 'navigate'} · ↵ {lang === 'fr' ? 'ouvrir' : 'open'}
            </span>
            <span>
              {lang === 'fr'
                ? 'Résultats limités aux données auxquelles vous avez accès'
                : 'Results limited to data you can access'}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
