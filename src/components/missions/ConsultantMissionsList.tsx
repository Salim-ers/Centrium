'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Loader2,
  Trash2,
  Calendar,
  Euro,
  FileSignature,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useMissionStatusLabels } from '@/lib/i18n/useBadges';

type MissionRow = {
  id: string;
  title: string;
  daily_rate_eur: number;
  start_date: string;
  end_date: string | null;
  status: string;
  job_offer_id: string | null;
  contract_number: string | null;
  job_offers?: { title: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  proposed: 'Proposée',
  active: 'Active',
  ended: 'Terminée',
  suspended: 'Suspendue',
  rejected: 'Refusée',
};

const STATUS_STYLE: Record<string, string> = {
  proposed: 'bg-warning/15 text-warning border-warning/30',
  active: 'bg-success/15 text-success border-success/30',
  ended: 'bg-muted text-muted-foreground border-border',
  suspended: 'bg-primary/15 text-primary border-primary/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

type Props = {
  consultantId: string;
  /** Côté admin : montre les actions de validation. */
  canManage?: boolean;
  /** Si fourni, le titre devient un lien vers `${linkBase}/${mission.id}`
   *  (utilisé par le portail consultant → /portal/missions/[id]). */
  linkBase?: string;
};

export function ConsultantMissionsList({ consultantId, canManage = false, linkBase }: Props) {
  const { format: formatCurrency } = useCurrency();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const missionStatus = useMissionStatusLabels();
  const statusLabel = (s: string) =>
    (missionStatus as Record<string, string>)[s] ?? STATUS_LABEL[s] ?? s;
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('missions')
      .select('id, title, daily_rate_eur, start_date, end_date, status, job_offer_id, contract_number, job_offers(title)')
      .eq('consultant_id', consultantId)
      .order('start_date', { ascending: false });
    setMissions((data as unknown as MissionRow[]) ?? []);
    setLoading(false);
  }, [consultantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function changeStatus(m: MissionRow, status: string) {
    setActingId(m.id);
    try {
      const res = await fetch(`/api/missions/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Action failed' : 'Action impossible'));
        return;
      }
      toast.success(`${isEn ? 'Status' : 'Statut'} → ${statusLabel(status)}`);
      reload();
    } finally {
      setActingId(null);
    }
  }

  async function remove(m: MissionRow) {
    if (
      !confirm(
        isEn
          ? `Permanently delete the mission "${m.title}"?`
          : `Supprimer définitivement la mission "${m.title}" ?`,
      )
    )
      return;
    setActingId(m.id);
    try {
      const res = await fetch(`/api/missions/${m.id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Deletion failed' : 'Suppression impossible'));
        return;
      }
      toast.success(isEn ? 'Mission deleted' : 'Mission supprimée');
      setMissions((prev) => prev.filter((x) => x.id !== m.id));
    } finally {
      setActingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Missions ({missions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-16 bg-card animate-pulse rounded" />
        ) : missions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {isEn ? (
              <>No mission. Assign a profile from the <Link href="/matching" className="text-primary hover:underline">Matching</Link> page.</>
            ) : (
              <>Aucune mission. Affecte un profil depuis la page <Link href="/matching" className="text-primary hover:underline">Matching</Link>.</>
            )}
          </p>
        ) : (
          <ul className="space-y-2">
            {missions.map((m) => {
              const acting = actingId === m.id;
              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-hairline bg-card p-3 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {linkBase ? (
                        <Link
                          href={`${linkBase}/${m.id}`}
                          className="font-medium truncate hover:text-primary hover:underline underline-offset-2 transition"
                        >
                          {m.title}
                        </Link>
                      ) : (
                        <div className="font-medium truncate">{m.title}</div>
                      )}
                      <Badge variant="outline" className={STATUS_STYLE[m.status] ?? ''}>
                        {statusLabel(m.status)}
                      </Badge>
                      {m.contract_number && (
                        <Badge variant="outline" className="gap-1">
                          <FileSignature className="h-3 w-3" />
                          {m.contract_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground mt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(m.start_date)}
                        {m.end_date ? ` → ${formatDate(m.end_date)}` : isEn ? ' → ongoing' : ' → en cours'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {formatCurrency(m.daily_rate_eur)} / {isEn ? 'day' : 'j'}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      {m.status === 'proposed' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => changeStatus(m, 'active')}
                            disabled={acting}
                            title={isEn ? 'Approve the mission' : 'Valider la mission'}
                          >
                            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {isEn ? 'Approve' : 'Valider'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => changeStatus(m, 'rejected')}
                            disabled={acting}
                            title={isEn ? 'Reject' : 'Refuser'}
                          >
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                      {m.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => changeStatus(m, 'suspended')}
                            disabled={acting}
                            title={isEn ? 'Suspend' : 'Suspendre'}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => changeStatus(m, 'ended')}
                            disabled={acting}
                            title={isEn ? 'Close' : 'Clôturer'}
                          >
                            {isEn ? 'Close' : 'Clôturer'}
                          </Button>
                        </>
                      )}
                      {m.status === 'suspended' && (
                        <Button
                          size="sm"
                          onClick={() => changeStatus(m, 'active')}
                          disabled={acting}
                          title={isEn ? 'Resume' : 'Reprendre'}
                        >
                          <Play className="h-3.5 w-3.5" />
                          {isEn ? 'Resume' : 'Reprendre'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(m)}
                        disabled={acting}
                        title={isEn ? 'Delete' : 'Supprimer'}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
