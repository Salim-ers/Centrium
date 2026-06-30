'use client';

import Link from 'next/link';
import {
  BriefcaseBusiness,
  Eye,
  Search,
  Briefcase,
  Loader2,
  CircleStop,
  CalendarDays,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TalentTabs } from '@/components/consultants/TalentTabs';

import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import { SENIORITY_LABEL } from '@/constants';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { notifyError, notifyMilestone } from '@/lib/notify';

/**
 * Onglet "En Mission" — une ligne = une mission active.
 *
 * Source de vérité : table `missions` (filtre status='active').
 * Synchronisé avec le KPI "En mission" du dashboard via la RPC
 * `dashboard_kpis` qui compte les missions proposed+active.
 *
 * Actions :
 * - Terminer  → status='ended'. Le profil revient dans /consultants.
 */
type OnMissionRow = {
  mission_id: string;
  mission_title: string;
  status: string;
  archived: boolean;
  daily_rate_eur: number | null;
  start_date: string | null;
  end_date: string | null;
  job_offer_title: string | null;
  consultant_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  seniority: string;
  is_prospect: boolean;
};

export default function EnMissionPage() {
  const { activeOrgId } = useOrganization();
  const { format: formatCurrency } = useCurrency();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const {
    data: onMissionData,
    loading,
    setData,
    reload,
  } = useCachedQuery<OnMissionRow[]>(
    `on-mission:${activeOrgId ?? 'none'}:${showArchived ? 'arch' : 'live'}:${search.toLowerCase()}`,
    async () => {
      const supabase = createClient();
      let query = supabase
        .from('missions')
        .select(
          `id, title, status, archived, daily_rate_eur, start_date, end_date,
           consultant:consultants!consultant_id (
             id, first_name, last_name, job_title, seniority, is_prospect
           ),
           job_offer:job_offers (title)`,
        );
      if (showArchived) {
        query = query.eq('archived', true);
      } else {
        query = query.eq('status', 'active').eq('archived', false);
      }
      const { data, error } = await query.order('start_date', { ascending: false });
      if (error) throw error;
      const rows: OnMissionRow[] = (data ?? [])
        .filter((m: any) => m.consultant)
        .map((m: any) => ({
          mission_id: m.id,
          mission_title: m.title,
          status: m.status,
          archived: m.archived,
          daily_rate_eur: m.daily_rate_eur,
          start_date: m.start_date,
          end_date: m.end_date,
          job_offer_title: m.job_offer?.title ?? null,
          consultant_id: m.consultant.id,
          first_name: m.consultant.first_name,
          last_name: m.consultant.last_name,
          job_title: m.consultant.job_title,
          seniority: m.consultant.seniority,
          is_prospect: m.consultant.is_prospect,
        }));
      // Tri alphabétique par nom du consultant (nom, prénom).
      rows.sort((a, b) => {
        const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.toLowerCase();
        const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.toLowerCase();
        return an.localeCompare(bn, 'fr');
      });
      const q = search.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter(
        (r) =>
          r.first_name.toLowerCase().includes(q) ||
          r.last_name.toLowerCase().includes(q) ||
          r.job_title?.toLowerCase().includes(q) ||
          r.mission_title?.toLowerCase().includes(q) ||
          r.job_offer_title?.toLowerCase().includes(q),
      );
    },
    { enabled: !!activeOrgId },
  );
  const onMission = onMissionData ?? [];

  useRealtimeReload(['missions', 'consultants'], () => reload());

  const pagination = usePagination(onMission.length, {
    storageKey: 'en-mission-page-size',
  });
  const paginatedMissions = pagination.paginate(onMission);

  const totalDailyRevenue = onMission.reduce(
    (sum, r) => sum + (r.daily_rate_eur ?? 0),
    0,
  );

  async function endMission(row: OnMissionRow) {
    if (
      !confirm(
        `Terminer la mission "${row.mission_title}" pour ${row.first_name} ${row.last_name} ?\n\nLa mission passe à "terminée" et le profil revient dans l'onglet Consultants.`,
      )
    ) {
      return;
    }
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Impossible de terminer la mission');
        return;
      }
      notifyMilestone(
        `Mission terminée — ${row.first_name} ${row.last_name} revient dans Consultants`,
      );
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  async function archiveMission(row: OnMissionRow) {
    if (
      !confirm(
        `Archiver la mission "${row.mission_title}" ?\n\nElle disparaît du dashboard et du KPI "En mission". Elle reste consultable depuis "Voir les archivées".`,
      )
    ) {
      return;
    }
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Archivage impossible');
        return;
      }
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  async function unarchiveMission(row: OnMissionRow) {
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Restauration impossible');
        return;
      }
      notifyMilestone(
        `Mission restaurée — "${row.mission_title}"`,
        { description: 'De retour dans "En Mission"' },
      );
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  async function hardDelete(row: OnMissionRow) {
    if (
      !confirm(
        `⚠️ Supprimer DÉFINITIVEMENT la mission "${row.mission_title}" ?\n\nIrréversible. Échouera si un CRA ou une facture y est rattaché.`,
      )
    ) {
      return;
    }
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Suppression impossible');
        return;
      }
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('fr-FR');
    } catch {
      return iso;
    }
  }

  return (
    <AppShell>
      <TalentTabs active="on-mission" counts={{ onMission: onMission.length }} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <BriefcaseBusiness className="h-7 w-7 text-emerald-400" />
            {showArchived ? 'Missions archivées' : 'En Mission'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {showArchived
              ? `${onMission.length} mission${onMission.length > 1 ? 's' : ''} archivée${onMission.length > 1 ? 's' : ''} — hors dashboard`
              : `${onMission.length} mission${onMission.length > 1 ? 's' : ''} active${onMission.length > 1 ? 's' : ''} — ${formatCurrency(totalDailyRevenue)} / jour cumulé`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
            title={showArchived ? 'Voir les missions actives' : 'Voir les missions archivées'}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Voir les actives
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Voir les archivées
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => reload()}>
            Rafraîchir
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par nom, intitulé, mission, offre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultant</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>Mission / Offre</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : onMission.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <BriefcaseBusiness className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium">Aucune mission active</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Quand tu validas un CV poussé depuis l&apos;onglet précédent, la mission
                      passe « active » et apparaît ici. Elle est aussi comptabilisée dans le
                      dashboard.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMissions.map((r) => {
                  const busy = busyId === r.mission_id;
                  return (
                    <TableRow key={r.mission_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-qc-gradient flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                            {r.first_name[0]}
                            {r.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              <span className="uppercase">{r.last_name}</span>{' '}
                              {r.first_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {r.job_title}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SENIORITY_LABEL[r.seniority as keyof typeof SENIORITY_LABEL] ?? r.seniority}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="font-medium text-sm truncate">{r.mission_title}</div>
                        {r.job_offer_title ? (
                          <div className="text-xs text-violet-300 inline-flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" />
                            AO · {r.job_offer_title}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic mt-0.5">
                            Mission libre (sans AO)
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(r.daily_rate_eur ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="inline-flex items-center gap-1 text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/consultants/${r.consultant_id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              Voir
                            </Link>
                          </Button>
                          {showArchived ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => unarchiveMission(r)}
                                disabled={busy}
                                title="Restaurer la mission"
                                className="text-emerald-300 hover:bg-emerald-500/10"
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArchiveRestore className="h-3.5 w-3.5" />
                                )}
                                Restaurer
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => hardDelete(r)}
                                disabled={busy}
                                title="Supprimer définitivement"
                                className="text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => endMission(r)}
                                disabled={busy}
                                title="Terminer la mission — le profil revient dans Consultants"
                                className="text-amber-300 hover:bg-amber-500/10"
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CircleStop className="h-3.5 w-3.5" />
                                )}
                                Terminer
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => archiveMission(r)}
                                disabled={busy}
                                title="Archiver — retire du dashboard, garde l'historique"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => hardDelete(r)}
                                disabled={busy}
                                title="Supprimer définitivement la mission"
                                className="text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationFooter
        pagination={pagination}
        total={onMission.length}
        itemLabel="mission"
      />
    </AppShell>
  );
}
