'use client';

import Link from 'next/link';
import {
  Send,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  Network,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  /** TJM facturé au client sur la mission (sur quoi on cape la prop). */
  daily_rate_eur: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  job_offer_title: string | null;
  /** Nom du client : company.name, sinon fallback offre. */
  client_name: string | null;
  /** Type de source : 'client' (direct) ou 'esn' (partenaire qui sous-traite). */
  client_kind: 'client' | 'esn' | null;
  consultant_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  /** TJM standard du consultant (≈ ce qu'il touche), pour comparer la marge. */
  consultant_rate: number | null;
};

export default function CvPushedPage() {
  const { activeOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Mode "Voir les refusés" : on liste les status='rejected' au lieu
   *  des status='proposed', avec actions Restaurer / Supprimer définitivement. */
  const [showRejected, setShowRejected] = useState(false);

  const {
    data: pushedData,
    loading,
    setData,
    reload,
  } = useCachedQuery<PushedRow[]>(
    `cv-pushed-missions:${activeOrgId ?? 'none'}:${showRejected ? 'rej' : 'live'}:${search.toLowerCase()}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('missions')
        .select(
          `id, title, daily_rate_eur, start_date, end_date, created_at,
           consultant:consultants!consultant_id (
             id, first_name, last_name, job_title, daily_rate_eur
           ),
           job_offer:job_offers (title, source, source_kind),
           company:companies!company_id (name)`,
        )
        .eq('status', showRejected ? 'rejected' : 'proposed')
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
          // Client = company.name si rattachée, sinon nom libre de l'offre
          // (champ `source` de l'AO — client final ou ESN partenaire).
          client_name:
            m.company?.name ?? m.job_offer?.source ?? null,
          // Type d'origine : si on a une `company`, on considère client direct ;
          // sinon on prend le source_kind explicitement choisi sur l'AO.
          client_kind: m.company?.name
            ? 'client'
            : (m.job_offer?.source_kind ?? null),
          consultant_id: m.consultant.id,
          first_name: m.consultant.first_name,
          last_name: m.consultant.last_name,
          job_title: m.consultant.job_title,
          consultant_rate: m.consultant.daily_rate_eur ?? null,
        }));
      const q = search.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter(
        (r) =>
          r.first_name.toLowerCase().includes(q) ||
          r.last_name.toLowerCase().includes(q) ||
          r.job_title?.toLowerCase().includes(q) ||
          r.mission_title?.toLowerCase().includes(q) ||
          r.job_offer_title?.toLowerCase().includes(q) ||
          r.client_name?.toLowerCase().includes(q),
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

  async function refuseMission(row: PushedRow) {
    if (
      !confirm(
        `Refuser la proposition "${row.mission_title}" pour ${row.first_name} ${row.last_name} ?\n\nLa mission est marquée comme refusée (proposed → rejected). Tu pourras la retrouver via "Voir les refusés". Le profil revient dans l'onglet Consultants.`,
      )
    ) {
      return;
    }
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Refus impossible');
        return;
      }
      notifyDestructive(`Proposition refusée pour ${row.first_name} ${row.last_name}`);
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  async function restoreMission(row: PushedRow) {
    setBusyId(row.mission_id);
    try {
      const res = await fetch(`/api/missions/${row.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'proposed' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Restauration impossible');
        return;
      }
      notifyCreated(`Proposition restaurée — ${row.first_name} ${row.last_name}`);
      setData((prev) => (prev ?? []).filter((r) => r.mission_id !== row.mission_id));
    } finally {
      setBusyId(null);
    }
  }

  async function hardDelete(row: PushedRow) {
    if (
      !confirm(
        `⚠️ Supprimer DÉFINITIVEMENT la proposition "${row.mission_title}" ?\n\nIrréversible. La trace de la proposition disparaît complètement.`,
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
      notifyDestructive(`Proposition supprimée`);
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
            {showRejected ? 'CV refusés' : 'CV poussés'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {showRejected
              ? `${pushed.length} proposition${pushed.length > 1 ? 's' : ''} refusée${pushed.length > 1 ? 's' : ''} — trace conservée pour reporting`
              : `${pushed.length} positionnement${pushed.length > 1 ? 's' : ''} en attente de validation — TJM négocié, offre sélectionnée`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRejected((v) => !v)}
            title={showRejected ? 'Revenir aux CV poussés en attente' : 'Voir les CV refusés'}
          >
            {showRejected ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Voir les en attente
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Voir les refusés
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
                <TableHead>Client</TableHead>
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
                    <p className="text-sm font-medium">
                      {showRejected
                        ? 'Aucune proposition refusée'
                        : 'Aucun CV poussé pour le moment'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      {showRejected
                        ? 'Quand tu refuseras un CV poussé, il apparaîtra ici. Tu pourras le restaurer ou le supprimer définitivement.'
                        : 'Depuis l\'onglet Consultants, clique sur « Pousser CV » pour positionner un profil sur une offre. Tu valideras le TJM puis tu retrouveras la proposition ici.'}
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
                      <TableCell className="max-w-[180px]">
                        {r.client_name ? (
                          <div
                            className="flex items-start gap-1.5 min-w-0 text-xs font-medium"
                            title={r.client_name}
                          >
                            {r.client_kind === 'esn' ? (
                              <Network className="h-3 w-3 text-amber-300 shrink-0 mt-0.5" />
                            ) : (
                              <Building2 className="h-3 w-3 text-violet-300 shrink-0 mt-0.5" />
                            )}
                            <span className="leading-tight break-words">
                              {r.client_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">— direct</span>
                        )}
                        {r.client_kind && r.client_name && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 pl-[18px]">
                            {r.client_kind === 'esn' ? 'ESN partenaire' : 'Client direct'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        {/* Mission et AO portent souvent le même intitulé. On
                            affiche le titre de l'AO (violet) si présent, sinon
                            le titre brut de la mission. Pas de doublon. */}
                        {r.job_offer_title ? (
                          <div
                            className="text-sm font-medium text-violet-300 leading-tight"
                            title={r.job_offer_title}
                          >
                            {r.job_offer_title}
                          </div>
                        ) : (
                          <>
                            <div
                              className="text-sm font-medium leading-tight"
                              title={r.mission_title}
                            >
                              {r.mission_title}
                            </div>
                            <div className="text-[11px] text-muted-foreground italic mt-0.5">
                              Mission libre (sans AO)
                            </div>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <DualTjm
                          client={r.daily_rate_eur ?? 0}
                          consultant={r.consultant_rate}
                        />
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
                          {showRejected ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => restoreMission(r)}
                                disabled={busy}
                                title="Restaurer la proposition (rejected → proposed)"
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
                                onClick={() => refuseMission(r)}
                                disabled={busy}
                                title="Refuser la proposition — le client a dit non. Retrouvable via Voir les refusés."
                                className="text-amber-300 hover:bg-amber-500/10"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Refuser
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
    </AppShell>
  );
}

/**
 * Affichage TJM en 3 lignes alignées :
 *   Client      280 €   (emerald, gros)
 *   Consultant  230 €   (gris)
 *   Marge       +50 €   (emerald si > 0, rouge si < 0)
 *
 * Les codes couleur sont conservés (emerald = gain, rouge = perte).
 */
function DualTjm({ client, consultant }: { client: number; consultant: number | null }) {
  const hasConsultant = consultant != null && consultant > 0;
  const margin = hasConsultant ? client - (consultant as number) : null;
  const marginTone =
    margin == null
      ? 'text-muted-foreground'
      : margin > 0
        ? 'text-emerald-300'
        : margin < 0
          ? 'text-red-300'
          : 'text-muted-foreground';
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs leading-tight items-baseline">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Client
      </span>
      <span className="text-sm font-semibold text-foreground text-right">
        {formatCurrency(client)}
      </span>

      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Consultant
      </span>
      {hasConsultant ? (
        <span className="text-violet-300 text-right font-medium">
          {formatCurrency(consultant as number)}
        </span>
      ) : (
        <span className="text-[10px] italic text-muted-foreground/70 text-right">
          non renseigné
        </span>
      )}

      {margin != null && (
        <>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Marge
          </span>
          <span className={`text-right font-medium ${marginTone}`}>
            {margin >= 0 ? '+' : ''}
            {formatCurrency(margin)}
          </span>
        </>
      )}
    </div>
  );
}
