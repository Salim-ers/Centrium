'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, ExternalLink } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Segmented } from '@/components/app/Segmented';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SkeletonRows } from '@/components/ui/skeleton';
import { showBrandToast } from '@/components/ui/BrandToast';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { companyDuplicates, consultantDuplicates, contactDuplicates, type DuplicateGroup, type DuplicateReason } from '@/lib/duplicates/detect';
import { formatDate } from '@/lib/format';
import type { Permission } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

type Kind = 'contacts' | 'clients' | 'consultants';
type Row = { id: string; title: string; sub: string | null; created_at: string | null; href: string };

type ContactRow = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; company_id: string | null; job_title: string | null; created_at: string; companies: { name: string } | null };
type CompanyRow = { id: string; name: string; city: string | null; created_at: string };
type ConsultantRow = { id: string; first_name: string; last_name: string; email: string | null; job_title: string | null; created_at: string };

type Loaded = { contacts: ContactRow[]; clients: CompanyRow[]; consultants: ConsultantRow[] };

const REASON: Record<DuplicateReason, { fr: string; en: string }> = {
  email: { fr: 'Même email', en: 'Same email' },
  name: { fr: 'Même nom', en: 'Same name' },
  phone: { fr: 'Même téléphone', en: 'Same phone' },
};

const DISMISS_KEY = (org: string) => `centrium-duplicates-dismissed:${org}`;
const signature = (ids: string[]) => [...ids].sort().join('|');

async function load(orgId: string, can: (p: Permission) => boolean): Promise<Loaded> {
  const supabase = createClient();
  const tolerant = <T,>(enabled: boolean, q: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> =>
    enabled ? Promise.resolve(q()).then((r) => (r.error ? [] : ((r.data as T[] | null) ?? []))) : Promise.resolve([]);
  const [contacts, clients, consultants] = await Promise.all([
    tolerant<ContactRow>(can('crm.view'), () =>
      supabase.from('contacts').select('id, first_name, last_name, email, phone, company_id, job_title, created_at, companies(name)').eq('organization_id', orgId).eq('archived', false).limit(5000),
    ),
    tolerant<CompanyRow>(can('clients.view'), () => supabase.from('companies').select('id, name, city, created_at').eq('organization_id', orgId).eq('archived', false).limit(3000)),
    tolerant<ConsultantRow>(can('consultants.view'), () =>
      supabase.from('consultants').select('id, first_name, last_name, email, job_title, created_at').eq('organization_id', orgId).eq('archived', false).limit(3000),
    ),
  ]);
  return { contacts, clients, consultants };
}

/**
 * Doublons probables (contacts, clients, consultants). Les contacts se
 * fusionnent : tout leur historique passe sur la fiche gardée. Clients et
 * consultants portent des missions, des CRA et des factures : on archive
 * le doublon, sans rien déplacer. Toujours après confirmation.
 */
export default function DuplicatesPage() {
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const [kind, setKind] = useState<Kind>('contacts');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [keepOf, setKeepOf] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ kind: Kind; keep: Row; target: Row } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useCachedQuery<Loaded>(`duplicates:${activeOrgId ?? 'none'}`, () => load(activeOrgId!, can), { enabled: !!activeOrgId && ready });

  useEffect(() => {
    if (!activeOrgId) return;
    try {
      setDismissed(new Set(JSON.parse(window.localStorage.getItem(DISMISS_KEY(activeOrgId)) ?? '[]') as string[]));
    } catch {
      /* stockage indisponible */
    }
  }, [activeOrgId]);

  const groups = useMemo(() => {
    const toRows = <T,>(list: DuplicateGroup<T>[], map: (t: T) => Row) => list.map((g) => ({ key: signature(g.items.map((i) => map(i).id)), reasons: g.reasons, rows: g.items.map(map) }));
    const d = data ?? { contacts: [], clients: [], consultants: [] };
    const all = {
      contacts: toRows(contactDuplicates(d.contacts), (c) => ({
        id: c.id,
        title: `${c.first_name} ${c.last_name}`.trim(),
        sub: [c.companies?.name, c.job_title, c.email, c.phone].filter(Boolean).join(' · ') || null,
        created_at: c.created_at,
        // Même lien que la recherche globale : l’onglet contacts du client, sinon la recherche CRM.
        href: c.company_id ? `/clients/${c.company_id}?tab=contacts` : `/crm?tab=contacts&q=${encodeURIComponent(`${c.first_name} ${c.last_name}`.trim())}`,
      })),
      clients: toRows(companyDuplicates(d.clients), (c) => ({ id: c.id, title: c.name, sub: c.city, created_at: c.created_at, href: `/clients/${c.id}` })),
      consultants: toRows(consultantDuplicates(d.consultants), (c) => ({
        id: c.id,
        title: `${c.first_name} ${c.last_name}`.trim(),
        sub: [c.job_title, c.email].filter(Boolean).join(' · ') || null,
        created_at: c.created_at,
        href: `/consultants/${c.id}`,
      })),
    };
    return {
      contacts: all.contacts.filter((g) => !dismissed.has(g.key)),
      clients: all.clients.filter((g) => !dismissed.has(g.key)),
      consultants: all.consultants.filter((g) => !dismissed.has(g.key)),
    };
  }, [data, dismissed]);

  function dismiss(key: string) {
    const next = new Set(dismissed).add(key);
    setDismissed(next);
    try {
      if (activeOrgId) window.localStorage.setItem(DISMISS_KEY(activeOrgId), JSON.stringify([...next]));
    } catch {
      /* stockage indisponible */
    }
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'contacts') {
        const res = await fetch('/api/duplicates/contacts/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keepId: pending.keep.id, mergeId: pending.target.id }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          toast.error(body.message ?? (fr ? 'Fusion impossible' : 'Could not merge'));
          return;
        }
        showBrandToast('success', fr ? 'Contacts fusionnés' : 'Contacts merged', { description: fr ? `« ${pending.target.title} » a rejoint « ${pending.keep.title} ».` : `“${pending.target.title}” was merged into “${pending.keep.title}”.` });
      } else {
        const table = pending.kind === 'clients' ? 'companies' : 'consultants';
        const patch = pending.kind === 'consultants' ? { archived: true, status: 'archived' } : { archived: true };
        const { error } = await createClient().from(table).update(patch).eq('id', pending.target.id);
        if (error) {
          toast.error(error.message);
          return;
        }
        showBrandToast('success', fr ? 'Doublon archivé' : 'Duplicate archived', { description: pending.target.title });
      }
      setPending(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const list = groups[kind];
  const canAct = kind === 'contacts' ? can('crm.edit') : kind === 'clients' ? can('clients.edit') : can('consultants.edit');

  return (
    <AppShell>
      <PageHeader
        title={fr ? 'Doublons' : 'Duplicates'}
        description={fr ? 'Fiches qui partagent un email, un téléphone ou un nom. Rien n’est modifié sans votre confirmation.' : 'Records sharing an email, a phone number or a name. Nothing changes without your confirmation.'}
        tabs={
          <Segmented<Kind>
            label={fr ? 'Type de fiche' : 'Record type'}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'contacts', label: 'Contacts', count: groups.contacts.length },
              { value: 'clients', label: 'Clients', count: groups.clients.length },
              { value: 'consultants', label: 'Consultants', count: groups.consultants.length },
            ]}
          />
        }
      />

      {loading && !data ? (
        <div className="rounded-2xl border border-border bg-card">
          <SkeletonRows rows={6} />
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Copy} title={fr ? 'Aucun doublon probable' : 'No likely duplicates'} description={fr ? 'Les fiches de ce type sont toutes distinctes.' : 'All records of this type look distinct.'} />
      ) : (
        <div className="space-y-3">
          {list.map((g) => {
            const keepId = keepOf[g.key] ?? [...g.rows].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0]!.id;
            const keep = g.rows.find((r) => r.id === keepId)!;
            return (
              <section key={g.key} className="rounded-2xl border border-border bg-card">
                <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 sm:px-5">
                  {g.reasons.map((r) => (
                    <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-medium text-primary-deep">
                      {REASON[r][lang]}
                    </span>
                  ))}
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => dismiss(g.key)}>
                    {fr ? 'Pas des doublons' : 'Not duplicates'}
                  </Button>
                </header>
                <ul className="divide-y divide-border">
                  {g.rows.map((r) => {
                    const kept = r.id === keepId;
                    return (
                      <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                          <input
                            type="radio"
                            name={`keep-${g.key}`}
                            checked={kept}
                            onChange={() => setKeepOf((m) => ({ ...m, [g.key]: r.id }))}
                            className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                            aria-label={fr ? `Garder ${r.title}` : `Keep ${r.title}`}
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                              {r.title}
                              {kept && <span className="rounded-full bg-success-soft px-1.5 text-[11px] font-medium text-success">{fr ? 'Gardée' : 'Kept'}</span>}
                            </span>
                            {r.sub && <span className="block truncate text-[12.5px] text-muted-foreground">{r.sub}</span>}
                            {r.created_at && <span className="block text-[11.5px] text-muted-foreground">{fr ? `Créée le ${formatDate(r.created_at, lang)}` : `Created ${formatDate(r.created_at, lang)}`}</span>}
                          </span>
                        </label>
                        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={r.href}>
                              <ExternalLink />
                              {fr ? 'Ouvrir' : 'Open'}
                            </Link>
                          </Button>
                          {!kept && canAct && (
                            <Button variant="secondary" size="sm" onClick={() => setPending({ kind, keep, target: r })}>
                              {kind === 'contacts' ? (fr ? 'Fusionner' : 'Merge') : fr ? 'Archiver' : 'Archive'}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && !busy && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.kind === 'contacts' ? (fr ? 'Fusionner ces contacts ?' : 'Merge these contacts?') : fr ? 'Archiver ce doublon ?' : 'Archive this duplicate?'}</DialogTitle>
            <DialogDescription>
              {pending?.kind === 'contacts'
                ? fr
                  ? `Les interactions, étiquettes, opportunités, devis, notes et tâches de « ${pending.target.title} » passent sur « ${pending.keep.title} », qui récupère aussi ses coordonnées manquantes. « ${pending.target.title} » est ensuite archivé.`
                  : `Interactions, tags, opportunities, quotes, notes and tasks of “${pending.target.title}” move to “${pending.keep.title}”, which also gets its missing details. “${pending.target.title}” is then archived.`
                : pending
                  ? fr
                    ? `« ${pending.target.title} » sera archivé. Ses missions, CRA, documents et factures restent rattachés à cette fiche ; rien n’est déplacé vers « ${pending.keep.title} ».`
                    : `“${pending.target.title}” will be archived. Its missions, timesheets, documents and invoices stay attached to it; nothing moves to “${pending.keep.title}”.`
                  : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={() => void confirm()} loading={busy} className={cn(pending?.kind !== 'contacts' && 'bg-foreground text-background hover:bg-foreground/90')}>
              {pending?.kind === 'contacts' ? (fr ? 'Fusionner' : 'Merge') : fr ? 'Archiver' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
