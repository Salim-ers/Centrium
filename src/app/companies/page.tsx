'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  Users,
  Briefcase,
  Receipt,
  MapPin,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import { CompanyFormDialog } from '@/components/companies/CompanyFormDialog';
import type { Company } from '@/types';
import { PageHeader, AppCard, AppCardBody, EmptyState, StatusBadge } from '@/components/app';

// =========================================================================
// /companies — gestion centralisée des sociétés clientes / partenaires.
// -------------------------------------------------------------------------
// Auparavant les sociétés n'existaient que comme références créées à la volée
// (aucune fiche ni vue d'ensemble). Cet écran agrège pour chaque société :
// ses contacts, ses missions et ses factures (CA facturé), et donne une fiche
// détaillée avec les rattachements.
// =========================================================================

type CompanyRow = {
  id: string;
  name: string;
  kind: string | null;
  industry: string | null;
  size: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  website: string | null;
  linkedin_url: string | null;
  notes: string | null;
};
type ContactRow = { id: string; first_name: string; last_name: string; company_id: string | null; job_title: string | null };
type MissionRow = { id: string; title: string | null; company_id: string | null; status: string | null };
type InvoiceRow = { id: string; invoice_number: string; company_id: string | null; amount_ttc: number | null; status: string | null; party: string };

type Loaded = {
  companies: CompanyRow[];
  contacts: ContactRow[];
  missions: MissionRow[];
  invoices: InvoiceRow[];
};

const KIND_LABEL: Record<string, string> = {
  client: 'Client',
  esn_partner: 'ESN partenaire',
  prospect: 'Prospect',
};

export default function CompaniesPage() {
  const { activeOrgId } = useOrganization();
  const { format: formatCurrency } = useCurrency();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CompanyRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const { data, loading, reload } = useCachedQuery<Loaded>(
    `companies-overview:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const [companies, contacts, missions, invoices] = await Promise.all([
        supabase.from('companies').select('id, name, kind, industry, size, city, country, address, website, linkedin_url, notes').eq('archived', false).order('name'),
        supabase.from('contacts').select('id, first_name, last_name, company_id, job_title').eq('archived', false),
        supabase.from('missions').select('id, title, company_id, status').eq('archived', false),
        supabase.from('invoices').select('id, invoice_number, company_id, amount_ttc, status, party').eq('archived', false).eq('party', 'client'),
      ]);
      return {
        companies: (companies.data ?? []) as CompanyRow[],
        contacts: (contacts.data ?? []) as ContactRow[],
        missions: (missions.data ?? []) as MissionRow[],
        invoices: (invoices.data ?? []) as InvoiceRow[],
      };
    },
    { enabled: !!activeOrgId },
  );

  const companies = data?.companies ?? [];

  // Agrégats par société (contacts, missions, CA facturé).
  const stats = useMemo(() => {
    const m = new Map<string, { contacts: number; missions: number; invoices: number; revenue: number }>();
    for (const c of companies) m.set(c.id, { contacts: 0, missions: 0, invoices: 0, revenue: 0 });
    for (const c of data?.contacts ?? []) if (c.company_id && m.has(c.company_id)) m.get(c.company_id)!.contacts++;
    for (const mi of data?.missions ?? []) if (mi.company_id && m.has(mi.company_id)) m.get(mi.company_id)!.missions++;
    for (const inv of data?.invoices ?? []) {
      if (inv.company_id && m.has(inv.company_id)) {
        const s = m.get(inv.company_id)!;
        s.invoices++;
        s.revenue += Number(inv.amount_ttc ?? 0);
      }
    }
    return m;
  }, [companies, data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.trim().toLowerCase();
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.city ?? '').toLowerCase().includes(q) || (c.industry ?? '').toLowerCase().includes(q),
    );
  }, [companies, search]);

  const totalRevenue = companies.reduce((s, c) => s + (stats.get(c.id)?.revenue ?? 0), 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Commercial"
        title={
          <>
            Sociétés <span className="qc-italic-accent font-editorial italic">clientes.</span>
          </>
        }
        description="Vue d’ensemble de vos clients et ESN partenaires, avec leurs contacts, missions et facturation."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle société
          </Button>
        }
      />

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        organizationId={activeOrgId ?? ''}
        company={editing}
        onSaved={() => reload()}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sociétés" value={String(companies.length)} />
        <Stat label="Contacts" value={String((data?.contacts ?? []).filter((c) => c.company_id).length)} />
        <Stat label="Missions liées" value={String((data?.missions ?? []).filter((m) => m.company_id).length)} />
        <Stat label="CA facturé (TTC)" value={formatCurrency(totalRevenue)} />
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une société…" className="pl-9" />
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-xl surface-1 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune société"
          description="Les sociétés apparaissent ici dès que tu en crées une (facture, contrat ou offre)."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => {
            const s = stats.get(c.id) ?? { contacts: 0, missions: 0, invoices: 0, revenue: 0 };
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                className="group text-left"
              >
                <AppCard variant="default" tone="violet" interactive className="h-full">
                  <AppCardBody size="md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{c.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          {c.kind && <StatusBadge tone={c.kind === 'client' ? 'success' : c.kind === 'prospect' ? 'warning' : 'info'}>{KIND_LABEL[c.kind] ?? c.kind}</StatusBadge>}
                          {c.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {c.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-violet-glow/10 text-violet-glow">
                        <Building2 className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <MiniStat icon={Users} value={s.contacts} label="contacts" />
                      <MiniStat icon={Briefcase} value={s.missions} label="missions" />
                      <MiniStat icon={Receipt} value={s.invoices} label="factures" />
                    </div>
                    {s.revenue > 0 && (
                      <div className="mt-3 text-right text-xs text-muted-foreground">
                        CA facturé : <span className="font-medium text-foreground">{formatCurrency(s.revenue)}</span>
                      </div>
                    )}
                  </AppCardBody>
                </AppCard>
              </motion.button>
            );
          })}
        </div>
      )}

      <CompanyDetailDialog
        company={selected}
        data={data}
        formatCurrency={formatCurrency}
        onClose={() => setSelected(null)}
        onEdit={(c) => {
          setSelected(null);
          setEditing(c as unknown as Company);
          setFormOpen(true);
        }}
      />
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-xl font-light tracking-tight">{value}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="rounded-lg bg-foreground/[0.03] py-2">
      <Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function CompanyDetailDialog({
  company,
  data,
  formatCurrency,
  onClose,
  onEdit,
}: {
  company: CompanyRow | null;
  data: Loaded | null;
  formatCurrency: (n: number) => string;
  onClose: () => void;
  onEdit: (c: CompanyRow) => void;
}) {
  if (!company) return null;
  const contacts = (data?.contacts ?? []).filter((c) => c.company_id === company.id);
  const missions = (data?.missions ?? []).filter((m) => m.company_id === company.id);
  const invoices = (data?.invoices ?? []).filter((i) => i.company_id === company.id);

  return (
    <Dialog open={!!company} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-glow" />
            {company.name}
          </DialogTitle>
          <DialogDescription>
            {[KIND_LABEL[company.kind ?? ''] ?? company.kind, company.industry, company.city].filter(Boolean).join(' · ')}
            {company.website && (
              <>
                {' · '}
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-glow hover:underline">
                  Site <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Section title={`Contacts (${contacts.length})`} icon={Users}>
          {contacts.length === 0 ? (
            <Empty>Aucun contact rattaché.</Empty>
          ) : (
            contacts.map((c) => (
              <Row key={c.id}>
                <span>{c.first_name} {c.last_name}</span>
                <span className="text-muted-foreground">{c.job_title ?? ''}</span>
              </Row>
            ))
          )}
          <Link href="/contacts" className="mt-1.5 inline-flex items-center gap-1 text-xs text-violet-glow hover:underline">
            Gérer les contacts <ArrowRight className="h-3 w-3" />
          </Link>
        </Section>

        <Section title={`Missions (${missions.length})`} icon={Briefcase}>
          {missions.length === 0 ? (
            <Empty>Aucune mission liée.</Empty>
          ) : (
            missions.map((m) => (
              <Row key={m.id}>
                <span className="truncate">{m.title ?? 'Sans titre'}</span>
                {m.status && <StatusBadge tone={m.status === 'active' ? 'success' : 'neutral'}>{m.status}</StatusBadge>}
              </Row>
            ))
          )}
        </Section>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onEdit(company)}>
            <Pencil className="h-3.5 w-3.5" />
            Éditer la fiche
          </Button>
        </div>

        <Section title={`Factures (${invoices.length})`} icon={Receipt}>
          {invoices.length === 0 ? (
            <Empty>Aucune facture.</Empty>
          ) : (
            invoices.map((inv) => (
              <Row key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="font-mono text-xs hover:text-foreground hover:underline">
                  {inv.invoice_number}
                </Link>
                <span className="tabular-nums">{formatCurrency(Number(inv.amount_ttc ?? 0))}</span>
              </Row>
            ))
          )}
        </Section>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-1.5 text-sm">
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground italic">{children}</p>;
}
