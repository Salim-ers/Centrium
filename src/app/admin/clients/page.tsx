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
  LogOut,
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
import { notifyDestructive, notifyError } from '@/lib/notify';
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
  created_at: string;
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

const STATUS_LABEL: Record<QuoteRequest['status'], string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  quoted: 'Devis envoyé',
  won: 'Converti ✓',
  lost: 'Perdu',
};

const STATUS_TONE: Record<QuoteRequest['status'], StatusTone> = {
  new: 'violet',
  contacted: 'info',
  quoted: 'warning',
  won: 'success',
  lost: 'neutral',
};

const STATUS_STYLE: Record<QuoteRequest['status'], string> = {
  new: 'bg-violet-glow/15 text-violet-200 border-violet-glow/40',
  contacted: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
  quoted: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  won: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  lost: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export default function AdminClientsPage() {
  const [items, setItems] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisionFrom, setProvisionFrom] = useState<QuoteRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/quote-requests');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Chargement impossible');
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
      notifyError('Mise à jour du statut impossible');
      setItems(prev);
    }
  }

  async function removeRequest(id: string, companyName: string) {
    if (
      !confirm(
        `Supprimer définitivement la demande de "${companyName}" ?\n\nCette action est irréversible.`,
      )
    ) {
      return;
    }
    const prev = items;
    setItems((list) => list.filter((it) => it.id !== id));
    const res = await fetch(`/api/admin/quote-requests/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      notifyError('Suppression impossible');
      setItems(prev);
      return;
    }
    notifyDestructive(`Demande "${companyName}" supprimée`);
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
      <header className="border-b border-hairline bg-card/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-magenta" />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">
                Console super-admin
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Demandes de devis · Provisioning clients
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" asChild className="qc-cta">
              <a href="/admin/new-org" className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Nouvelle organisation
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/audit">Audit &amp; conformité</a>
            </Button>
            <Button variant="outline" size="sm" onClick={load}>
              Rafraîchir
            </Button>
            <form action="/api/auth/logout" method="POST" className="inline">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <PageHeader
          eyebrow="Admin"
          title={
            <>
              Clients{' '}
              <span className="qc-italic-accent font-editorial italic">Centrium.</span>
            </>
          }
          description="Pipeline des demandes de devis et provisioning des nouveaux clients."
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard
            label="Nouveau"
            value={counts['new'] ?? 0}
            icon={Sparkles}
            tone="magenta"
          />
          <KPICard
            label="Contacté"
            value={counts['contacted'] ?? 0}
            icon={Mail}
            tone="cyan"
          />
          <KPICard
            label="Devis envoyé"
            value={counts['quoted'] ?? 0}
            icon={Calendar}
            tone="amber"
          />
          <KPICard
            label="Converti"
            value={counts['won'] ?? 0}
            icon={CheckCircle2}
            tone="emerald"
          />
          <KPICard
            label="Perdu"
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
                Demandes{' '}
                <span className="qc-italic-accent font-editorial italic">
                  reçues.
                </span>
              </>
            }
            description="Les prospects qui remplissent /devis apparaissent ici."
          />
          <AppCard variant="default" tone="violet">
            <AppCardBody size="sm" className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Société</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Profil</TableHead>
                    <TableHead>Reçu</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="h-12 bg-white/[0.02] animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-4">
                        <EmptyState
                          icon={Inbox}
                          title="Aucune demande pour le moment"
                          description="Les prospects qui remplissent /devis apparaîtront ici."
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
                                title="Ouvrir le logo"
                                className="shrink-0"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={it.logo_url}
                                  alt={`Logo ${it.company_name}`}
                                  className="h-10 w-10 rounded bg-white/[0.04] object-contain p-1 border border-hairline hover:border-magenta/40"
                                />
                              </a>
                            ) : (
                              <div className="h-10 w-10 rounded bg-white/[0.04] flex items-center justify-center shrink-0 border border-hairline">
                                <Building2 className="h-4 w-4 text-magenta/70" />
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
                          {it.team_size && <div>Équipe: {it.team_size}</div>}
                          {it.consultants_count && (
                            <div>Consultants: {it.consultants_count}</div>
                          )}
                          {it.wanted_help && it.wanted_help.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {it.wanted_help.map((k) => (
                                <span
                                  key={k}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-magenta/15 text-magenta-neon border border-magenta/30"
                                >
                                  {HELP_LABELS[k] ?? k}
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
                            {new Date(it.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <StatusBadge tone={STATUS_TONE[it.status]} dot>
                              {STATUS_LABEL[it.status]}
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
                                    {STATUS_LABEL[s]}
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
                                className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                                Provisionner
                              </Button>
                            ) : (
                              <StatusBadge tone="success">
                                <CheckCircle2 className="h-3 w-3" />
                                Client actif
                              </StatusBadge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeRequest(it.id, it.company_name)}
                              title="Supprimer définitivement"
                              className="text-red-400 hover:bg-red-500/10"
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
