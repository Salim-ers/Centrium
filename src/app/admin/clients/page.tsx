'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  Building2,
  Mail,
  Phone,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProvisionClientDialog } from '@/components/admin/ProvisionClientDialog';
import { AdminConsoleHeader } from '@/components/admin/AdminConsoleHeader';
import { notifyDestructive, notifyError } from '@/lib/notify';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import {
  PageHeader,
  SectionHeader,
  KPICard,
  AppCard,
  AppCardBody,
  StatusBadge,
  type StatusTone,
  EmptyState,
} from '@/components/app';

type QuoteRequest = {
  id: string;
  company_name: string;
  industry: string | null;
  team_size: string | null;
  consultants_count: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  contact_role: string | null;
  message: string | null;
  source: string | null;
  status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
  converted_to_organization_id: string | null;
  wanted_help: string[] | null;
  logo_url: string | null;
  plan_id: 'starter' | 'growth' | 'enterprise' | null;
  created_at: string;
};

const PLAN_LABELS: Record<NonNullable<QuoteRequest['plan_id']>, string> = {
  starter: 'Starter · 74,99 €',
  growth: 'Medium · 149,99 €',
  enterprise: 'Illimité · 299,99 €',
};

const PLAN_LABELS_EN: Record<NonNullable<QuoteRequest['plan_id']>, string> = {
  starter: 'Starter · €74.99',
  growth: 'Medium · €149.99',
  enterprise: 'Unlimited · €299.99',
};

const HELP_LABELS: Record<string, string> = {
  cv_template: 'Template CV',
  contract_template: 'Template contrat',
  logo: 'Logo',
  brand_colors: 'Charte couleurs',
  mentions_legales: 'Mentions légales',
  signature: 'Signature',
  fiche_poste: 'Fiche de poste',
  autre: 'Autre',
};

const HELP_LABELS_EN: Record<string, string> = {
  cv_template: 'CV template',
  contract_template: 'Contract template',
  logo: 'Logo',
  brand_colors: 'Color palette',
  mentions_legales: 'Legal notices',
  signature: 'Signature',
  fiche_poste: 'Job description',
  autre: 'Other',
};

const STATUS_LABEL: Record<QuoteRequest['status'], string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  quoted: 'Devis envoyé',
  won: 'Converti ✓',
  lost: 'Perdu',
};

const STATUS_LABEL_EN: Record<QuoteRequest['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quote sent',
  won: 'Converted ✓',
  lost: 'Lost',
};

const STATUS_TONE: Record<QuoteRequest['status'], StatusTone> = {
  new: 'violet',
  contacted: 'info',
  quoted: 'warning',
  won: 'success',
  lost: 'neutral',
};

const STATUS_STYLE: Record<QuoteRequest['status'], string> = {
  new: 'bg-primary/15 text-primary border-primary/40',
  contacted: 'bg-info/15 text-info border-info/30',
  quoted: 'bg-warning/15 text-warning border-warning/30',
  won: 'bg-success/15 text-success border-success/30',
  lost: 'bg-muted text-muted-foreground border-border',
};

export default function AdminClientsPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const planLabels = isEn ? PLAN_LABELS_EN : PLAN_LABELS;
  const helpLabels = isEn ? HELP_LABELS_EN : HELP_LABELS;
  const statusLabel = isEn ? STATUS_LABEL_EN : STATUS_LABEL;
  const [items, setItems] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisionFrom, setProvisionFrom] = useState<QuoteRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/quote-requests');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? (isEn ? 'Unable to load' : 'Chargement impossible'));
        return;
      }
      setItems(body.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, next: QuoteRequest['status']) {
    const prev = items;
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, status: next } : it)),
    );
    const res = await fetch(`/api/admin/quote-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      notifyError(isEn ? 'Unable to update status' : 'Mise à jour du statut impossible');
      setItems(prev);
    }
  }

  async function removeRequest(id: string, companyName: string) {
    if (
      !confirm(
        isEn
          ? `Permanently delete the request from "${companyName}"?\n\nThis action cannot be undone.`
          : `Supprimer définitivement la demande de "${companyName}" ?\n\nCette action est irréversible.`,
      )
    ) {
      return;
    }
    const prev = items;
    setItems((list) => list.filter((it) => it.id !== id));
    const res = await fetch(`/api/admin/quote-requests/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      notifyError(isEn ? 'Unable to delete' : 'Suppression impossible');
      setItems(prev);
      return;
    }
    notifyDestructive(
      isEn ? `Request "${companyName}" deleted` : `Demande "${companyName}" supprimée`,
    );
  }

  const counts = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, it) => {
        acc[it.status] = (acc[it.status] ?? 0) + 1;
        return acc;
      }, {}),
    [items],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminConsoleHeader
        title={isEn ? 'Super-admin console' : 'Console super-admin'}
        subtitle={isEn ? 'Quote requests · Client provisioning' : 'Demandes de devis · Provisioning clients'}
        actions={
          <>
            <Button size="sm" asChild className="qc-cta">
              <a href="/admin/new-org" className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {isEn ? 'New organization' : 'Nouvelle organisation'}
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={load}>
              {isEn ? 'Refresh' : 'Rafraîchir'}
            </Button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <PageHeader
          eyebrow="Admin"
          title={
            <>
              {isEn ? 'Centrium' : 'Clients'}{' '}
              <span className="text-primary font-display ">
                {isEn ? 'clients.' : 'Centrium.'}
              </span>
            </>
          }
          description={
            isEn
              ? 'Quote-request pipeline and provisioning of new clients.'
              : 'Pipeline des demandes de devis et provisioning des nouveaux clients.'
          }
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard
            label={isEn ? 'New' : 'Nouveau'}
            value={counts['new'] ?? 0}
            icon={Sparkles}
            tone="magenta"
          />
          <KPICard
            label={isEn ? 'Contacted' : 'Contacté'}
            value={counts['contacted'] ?? 0}
            icon={Mail}
            tone="cyan"
          />
          <KPICard
            label={isEn ? 'Quote sent' : 'Devis envoyé'}
            value={counts['quoted'] ?? 0}
            icon={Calendar}
            tone="amber"
          />
          <KPICard
            label={isEn ? 'Converted' : 'Converti'}
            value={counts['won'] ?? 0}
            icon={CheckCircle2}
            tone="emerald"
          />
          <KPICard
            label={isEn ? 'Lost' : 'Perdu'}
            value={counts['lost'] ?? 0}
            icon={XCircle}
            tone="rose"
          />
        </div>

        <section>
          <SectionHeader
            eyebrow="Pipeline"
            title={
              <>
                {isEn ? 'Requests' : 'Demandes'}{' '}
                <span className="text-primary font-display ">
                  {isEn ? 'received.' : 'reçues.'}
                </span>
              </>
            }
            description={
              isEn
                ? 'Prospects who fill in /devis show up here.'
                : 'Les prospects qui remplissent /devis apparaissent ici.'
            }
          />
          <AppCard variant="default" tone="violet">
            <AppCardBody size="sm" className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isEn ? 'Company' : 'Société'}</TableHead>
                    <TableHead>{isEn ? 'Contact' : 'Contact'}</TableHead>
                    <TableHead>{isEn ? 'Profile' : 'Profil'}</TableHead>
                    <TableHead>{isEn ? 'Received' : 'Reçu'}</TableHead>
                    <TableHead>{isEn ? 'Status' : 'Statut'}</TableHead>
                    <TableHead className="text-right">{isEn ? 'Actions' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="h-12 bg-card animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-4">
                        <EmptyState
                          icon={Inbox}
                          title={isEn ? 'No request yet' : 'Aucune demande pour le moment'}
                          description={
                            isEn
                              ? 'Prospects who fill in /devis will appear here.'
                              : 'Les prospects qui remplissent /devis apparaîtront ici.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="max-w-[260px]">
                          <div className="flex items-start gap-2">
                            {it.logo_url ? (
                              <a
                                href={it.logo_url}
                                target="_blank"
                                rel="noreferrer"
                                title={isEn ? 'Open logo' : 'Ouvrir le logo'}
                                className="shrink-0"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={it.logo_url}
                                  alt={`Logo ${it.company_name}`}
                                  className="h-10 w-10 rounded bg-card object-contain p-1 border border-hairline hover:border-primary/40"
                                />
                              </a>
                            ) : (
                              <div className="h-10 w-10 rounded bg-card flex items-center justify-center shrink-0 border border-hairline">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{it.company_name}</div>
                              {it.industry && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {it.industry}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{it.contact_name}</div>
                          {it.contact_role && (
                            <div className="text-muted-foreground">{it.contact_role}</div>
                          )}
                          <div className="inline-flex items-center gap-1 text-muted-foreground mt-0.5">
                            <Mail className="h-3 w-3" />
                            {it.contact_email}
                          </div>
                          {it.contact_phone && (
                            <div className="inline-flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {it.contact_phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground space-y-0.5 max-w-[260px]">
                          {it.plan_id && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                              <Sparkles className="h-2.5 w-2.5" />
                              {planLabels[it.plan_id]}
                            </div>
                          )}
                          {it.team_size && (
                            <div>{isEn ? 'Team' : 'Équipe'}: {it.team_size}</div>
                          )}
                          {it.consultants_count && (
                            <div>{isEn ? 'Consultants' : 'Consultants'}: {it.consultants_count}</div>
                          )}
                          {it.wanted_help && it.wanted_help.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {it.wanted_help.map((k) => (
                                <span
                                  key={k}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30"
                                >
                                  {helpLabels[k] ?? k}
                                </span>
                              ))}
                            </div>
                          )}
                          {it.message && (
                            <div
                              className="text-[10px] mt-1 italic line-clamp-2"
                              title={it.message}
                            >
                              « {it.message} »
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(it.created_at).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <StatusBadge tone={STATUS_TONE[it.status]} dot>
                              {statusLabel[it.status]}
                            </StatusBadge>
                            <select
                              value={it.status}
                              onChange={(e) =>
                                updateStatus(it.id, e.target.value as QuoteRequest['status'])
                              }
                              disabled={it.status === 'won'}
                              className={cn(
                                'h-7 px-2 rounded-md border text-[11px] font-medium',
                                STATUS_STYLE[it.status],
                              )}
                            >
                              {(['new', 'contacted', 'quoted', 'won', 'lost'] as const).map(
                                (s) => (
                                  <option key={s} value={s}>
                                    {statusLabel[s]}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {it.status !== 'won' ? (
                              <Button
                                size="sm"
                                onClick={() => setProvisionFrom(it)}
                                className="bg-gradient-to-r from-primary to-primary hover:opacity-95"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                                {isEn ? 'Provision' : 'Provisionner'}
                              </Button>
                            ) : (
                              <StatusBadge tone="success">
                                <CheckCircle2 className="h-3 w-3" />
                                {isEn ? 'Active client' : 'Client actif'}
                              </StatusBadge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeRequest(it.id, it.company_name)}
                              title={isEn ? 'Delete permanently' : 'Supprimer définitivement'}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </AppCardBody>
          </AppCard>
        </section>
      </main>

      <ProvisionClientDialog
        open={!!provisionFrom}
        onOpenChange={(v) => {
          if (!v) setProvisionFrom(null);
        }}
        quoteRequest={provisionFrom}
        onProvisioned={() => {
          load();
        }}
      />
    </div>
  );
}
