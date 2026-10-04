'use client';

import Link from 'next/link';
import { Kanban, List, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ComboboxOption } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';

type Props = {
  lang: 'fr' | 'en';
  /** Vue affichée : tableau par étape (/crm) ou liste (/opportunities). */
  view: 'board' | 'list';
  query: string;
  onQuery: (q: string) => void;
  owner: string;
  onOwner: (owner: string) => void;
  members: ComboboxOption[];
  /** Filtres propres à la vue (ex. étape, en liste). */
  children?: React.ReactNode;
};

/** Barre d'outils commune au tableau et à la liste des opportunités. */
export function CrmToolbar({ lang, view, query, onQuery, owner, onOwner, members, children }: Props) {
  const fr = lang === 'fr';
  const views = [
    { id: 'board', href: '/crm', icon: Kanban, label: fr ? 'Tableau' : 'Board' },
    { id: 'list', href: '/opportunities', icon: List, label: fr ? 'Liste' : 'List' },
  ] as const;
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={fr ? 'Rechercher une opportunité, un client' : 'Search an opportunity, a client'}
          className="pl-9"
          aria-label={fr ? 'Rechercher une opportunité' : 'Search opportunities'}
        />
      </div>
      <Select value={owner} onChange={(e) => onOwner(e.target.value)} className="sm:w-52" aria-label={fr ? 'Responsable' : 'Owner'}>
        <option value="all">{fr ? 'Toute l’équipe' : 'Whole team'}</option>
        <option value="mine">{fr ? 'Mes opportunités' : 'My opportunities'}</option>
        {members.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      {children}
      <div
        role="group"
        aria-label={fr ? 'Affichage' : 'View'}
        className="inline-flex h-9 items-center gap-0.5 self-start rounded-lg border border-border bg-muted p-0.5 text-muted-foreground sm:ml-auto sm:self-auto"
      >
        {views.map((v) => (
          <Link
            key={v.id}
            href={v.href}
            aria-current={view === v.id ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-focus',
              view === v.id ? 'bg-card text-foreground shadow-xs' : 'hover:text-foreground',
            )}
          >
            <v.icon className="h-3.5 w-3.5" />
            {v.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
