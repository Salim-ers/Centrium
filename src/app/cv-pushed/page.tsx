'use client';

import Link from 'next/link';
import {
  Send,
  Eye,
  Search,
  CheckCircle2,
  Undo2,
  Briefcase,
  Loader2,
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
import { SENIORITY_LABEL } from '@/constants';
import { formatCurrency, relativeDate } from '@/lib/utils';
import { notifyDestructive, notifyError, notifyCreated } from '@/lib/notify';

/**
 * Onglet "CV poussés" — une ligne = une mission en statut `proposed`.
 *
 * Source de vérité : table `missions` (filtre status='proposed').
 * Un profil peut apparaître plusieurs fois s'il est positionné sur
 * plusieurs offres simultanément.
 *
 * Actions :
 * - Valider  → mission passe à `active`. Le profil bascule dans /en-mission
 *   et est compté dans le KPI "En mission" du dashboard.
 * - Retirer  → mission supprimée. Le profil revient dans /consultants.
 */
type PushedRow = {
  mission_id: string;
  mission_title: string;
  daily_rate_eur: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  job_offer_title: string | null;
  consultant_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  seniority: string;
  is_prospect: boolean;
};

export default function CvPushedPage() {
  const { activeOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: pushedData,
    loading,
    setData,
    reload,
  } = useCachedQuery<PushedRow[]>(
    `cv-pushed-missions:${activeOrgId ?? 'none'}:${search.toLowerCase()}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('missions')
        .select(
          `id, title, daily_rate_eur, start_date, end_date, created_at,
           consultant:consultants!consultant_id (
             id, first_name, last_name, job_title, seniority, is_prospect
           ),
           job_offer:job_offers (title)`,
        )
        .eq('status', 'proposed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows: PushedRow[] = (data ?? [])
        .filter((m: any) => m.consultant)
        .map((m: any) => ({
          mission_id: m.id,
          mission_title: m.title,
          daily_rate_eur: m.daily_rate_eur,
          start_date: m.start_date,
          end_date: m.end_date,
          created_at: m.created_at,
          job_offer_title: m.job_offer?.title ?? null,
          consultant_id: m.consultant.id,
          first_name: m.consultant.first_name,
          last_name: m.consultant.last_name,
          job_title: m.consultant.job_title,
          seniority: m.consultant.seniority,
          is_prospect: m.consultant.is_prospect,
        }));
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
  const pushed = pushedData ?? [];

  async function validateMission(row: PushedRow) {
    if (
      !confirm(
        `Valider la mission "${row.mission_title}" pour ${row.first_name} ${row.last_name} au TJM ${formatCurrency(row.daily_rate_eur ?? 0)} ?\n\nLa mission devient active et sera comptabilisée dans le dashboard.`,
      )
    ) {
      return;
    }
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Validation impossible');
        return;
      }
      notifyCreated(
        `Mission validée pour ${row.first_name} ${row.last_name} — visible dans "En Mission"`,
      );
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  async function unmark(row: PushedRow) {
    if (
      !confirm(
        `Retirer la proposition "${row.mission_title}" pour ${row.first_name} ${row.last_name} ?\n\nLa mission proposée sera supprimée et le profil revient dans l'onglet Consultants.`,
      )
    ) {
      return;
    }
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        notifyError(body.message ?? 'Suppression impossible');
        return;
      }
      notifyDestructive(`${row.first_name} ${row.last_name} retiré des CV poussés`);
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
      <TalentTabs active="cv-pushed" counts={{ cvPushed: pushed.length }} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Send className="h-7 w-7 text-magenta-neon" />
            CV poussés
          </h1>
          <p className="text-muted-foreground mt-1">
            {pushed.length} positionnement{pushed.length > 1 ? 's' : ''} en attente de validation
            — TJM négocié, offre sélectionnée
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => reload()}>
          Rafraîchir
        </Button>
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
                <TableHead>Poussé</TableHead>
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
              ) : pushed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <Send className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium">Aucun CV poussé pour le moment</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Depuis l&apos;onglet Consultants, clique sur « Pousser CV » pour positionner
                      un profil sur une offre. Tu valideras le TJM puis tu retrouveras la
                      proposition ici, en attente de validation client.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                pushed.map((r) => {
                  const busy = busyId === r.mission_id;
                  return (
                    <TableRow key={r.mission_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-qc-gradient-pink flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                            {r.first_name[0]}
                            {r.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {r.first_name} {r.last_name}
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
                      <TableCell className="text-xs text-muted-foreground">
                        {relativeDate(r.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/consultants/${r.consultant_id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              Voir
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => validateMission(r)}
                            disabled={busy}
                            title="Valider la mission — passe à actif et entre dans le dashboard"
                            className="text-emerald-300 hover:bg-emerald-500/10"
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => unmark(r)}
                            disabled={busy}
                            title="Retirer cette proposition — supprime la mission"
                            className="text-amber-300 hover:bg-amber-500/10"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Retirer
                          </Button>
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
    </AppShell>
  );
}
