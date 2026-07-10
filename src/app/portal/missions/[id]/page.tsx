'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  ClipboardCheck,
  Coins,
  FileSignature,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusTone } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Mission, Timesheet } from '@/types';

// =========================================================================
// /portal/missions/[id] — détail d'une mission côté consultant.
// -------------------------------------------------------------------------
// Lecture seule : le statut d'une mission est piloté par l'organisation
// (proposed = CV poussé chez le client ; c'est le client final qui tranche,
// pas le consultant — pas d'accepter/refuser ici, par design).
// RLS missions_self_select : le consultant ne peut charger QUE ses
// missions ; un id étranger → introuvable.
// =========================================================================

const MONTHS = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MISSION_STATUS: Record<Mission['status'], { label: string; label_en: string; tone: StatusTone }> = {
  proposed: { label: 'CV envoyé', label_en: 'CV sent', tone: 'pending' },
  active: { label: 'En cours', label_en: 'Active', tone: 'success' },
  ended: { label: 'Terminée', label_en: 'Ended', tone: 'neutral' },
  suspended: { label: 'Suspendue', label_en: 'Suspended', tone: 'warning' },
  rejected: { label: 'Non retenue', label_en: 'Not selected', tone: 'danger' },
};

const CRA_STATUS: Record<Timesheet['status'], { label: string; label_en: string; tone: StatusTone }> = {
  draft: { label: 'Brouillon', label_en: 'Draft', tone: 'pending' },
  submitted: { label: 'En attente', label_en: 'Pending', tone: 'warning' },
  client_validated: { label: 'Validé', label_en: 'Validated', tone: 'success' },
  rejected: { label: 'À corriger', label_en: 'To revise', tone: 'danger' },
};

type MissionWithCompany = Mission & {
  company: { name: string } | { name: string }[] | null;
};

export default function PortalMissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [mission, setMission] = useState<MissionWithCompany | null>(null);
  const [cras, setCras] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [{ data: m, error }, { data: tsRows }] = await Promise.all([
        supabase
          .from('missions')
          // Le nom du client peut être bloqué par RLS (companies non
          // exposées aux consultants) → fallback silencieux sur '—'.
          .select('*, company:companies(name)')
          .eq('id', params.id)
          .maybeSingle(),
        supabase
          .from('timesheets')
          .select('*')
          .eq('mission_id', params.id)
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false }),
      ]);
      if (cancelled) return;
      if (error || !m) {
        toast.error(isEn ? 'Mission not found or access denied' : 'Mission introuvable ou accès refusé');
        router.push('/portal/missions');
        return;
      }
      setMission(m as MissionWithCompany);
      setCras((tsRows ?? []) as Timesheet[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id, router]);

  if (loading || !mission) {
    return <div className="h-60 rounded-xl surface-1 animate-pulse" />;
  }

  const companyRel = Array.isArray(mission.company) ? mission.company[0] : mission.company;
  const clientName = companyRel?.name ?? null;
  const st = MISSION_STATUS[mission.status];
  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/missions">
            <ArrowLeft className="h-4 w-4" />
            {isEn ? 'My missions' : 'Mes missions'}
          </Link>
        </Button>
        {mission.status === 'active' && (
          <Button size="sm" asChild>
            <Link href="/portal/cra/new">
              <Plus className="h-4 w-4" />
              {isEn ? 'New CRA' : 'Nouveau CRA'}
            </Link>
          </Button>
        )}
      </div>

      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-glow/30 bg-violet-glow/15 text-violet-glow">
                <Briefcase className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight">{mission.title}</h1>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                  <StatusBadge tone={st.tone}>{isEn ? st.label_en : st.label}</StatusBadge>
                  {mission.contract_number && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <FileSignature className="h-3.5 w-3.5" />
                      {mission.contract_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-hairline surface-1 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Client
              </div>
              <div className="mt-0.5 font-medium">{clientName ?? '—'}</div>
            </div>
            <div className="rounded-lg border border-hairline surface-1 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {isEn ? 'Period' : 'Période'}
              </div>
              <div className="mt-0.5 font-medium">
                {fmtDate(mission.start_date) ?? '—'}
                {mission.end_date ? ` → ${fmtDate(mission.end_date)}` : isEn ? ' → ongoing' : ' → en cours'}
              </div>
            </div>
            <div className="rounded-lg border border-hairline surface-1 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5" />
                TJM
              </div>
              <div className="mt-0.5 font-medium">
                {mission.daily_rate_eur
                  ? `${mission.daily_rate_eur} ${isEn ? '€ excl. VAT/day' : '€ HT/j'}`
                  : '—'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-violet-glow" />
            {isEn ? 'CRA for this mission' : 'CRA de cette mission'}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {cras.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isEn ? 'No CRA for this mission yet.' : "Aucun CRA pour cette mission pour l'instant."}
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {cras.map((t) => {
                const cs = CRA_STATUS[t.status];
                return (
                  <li key={t.id}>
                    <Link
                      href={`/portal/cra/${t.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg hover-surface transition"
                    >
                      <span className="font-medium text-sm">
                        {(isEn ? MONTHS_EN : MONTHS)[t.period_month - 1]} {t.period_year}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {Number(t.days_worked)} {isEn ? 'd' : 'j'}
                        </span>
                        <StatusBadge tone={cs.tone} dot={false} className="px-2 py-0.5 text-[10px]">
                          {isEn ? cs.label_en : cs.label}
                        </StatusBadge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
