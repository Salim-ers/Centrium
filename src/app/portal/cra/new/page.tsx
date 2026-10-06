'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions, fetchMyProfile } from '@/lib/portal/consultant-data';
import { runsInMonth } from '@/lib/portal/consultant-home';
import { timesheetService } from '@/lib/services';
import { missionLabel } from '@/lib/timesheets/approvals';
import { periodLabel } from '@/lib/status';
import type { PortalMission } from '@/types';
import { usePortalConsultant } from '../../portal-context';

/**
 * Création d'un CRA : mois puis mission (en cours ou terminée, tant qu'elle
 * couvre le mois). Les jours ouvrés de la mission sont pré-remplis, hors
 * jours fériés ; le détail se règle ensuite sur le calendrier. Si un CRA
 * existe déjà pour la période, on l'ouvre. Depuis un lien « Remplir »
 * (mission + mois), la création se fait directement.
 */
export default function PortalCraNewPage() {
  const router = useRouter();
  const search = useSearchParams();
  const brandName = useBrandName();
  const { consultantId } = usePortalConsultant();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const now = new Date();

  const [missions, setMissions] = useState<PortalMission[] | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [missionId, setMissionId] = useState('');
  const [period, setPeriod] = useState(() => {
    const m = Number(search.get('month'));
    const y = Number(search.get('year'));
    return m >= 1 && m <= 12 && y > 2000 ? `${y}-${m}` : `${now.getFullYear()}-${now.getMonth() + 1}`;
  });
  const [saving, setSaving] = useState(false);
  const autoStarted = useRef(false);

  // Mois courant, les deux précédents et le suivant.
  const periods = useMemo(() => {
    const out: Array<{ value: string; label: string }> = [];
    for (let d = -2; d <= 1; d++) {
      const dt = new Date(now.getFullYear(), now.getMonth() + d, 1);
      out.push({ value: `${dt.getFullYear()}-${dt.getMonth() + 1}`, label: periodLabel(dt.getMonth() + 1, dt.getFullYear(), lang) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const [year, month] = period.split('-').map(Number) as [number, number];
  const options = useMemo(
    () => (missions ?? []).filter((m) => (m.status === 'active' || m.status === 'ended') && runsInMonth(m, year, month)),
    [missions, year, month],
  );

  useEffect(() => {
    const supabase = createClient();
    void Promise.all([fetchMyMissions(supabase), fetchMyProfile(supabase)]).then(([list, profile]) => {
      setMissions(list);
      setOrgId(profile?.organization_id ?? null);
    });
  }, []);

  // Garde la sélection cohérente avec le mois choisi.
  useEffect(() => {
    if (!missions) return;
    if (options.some((m) => m.id === missionId)) return;
    const wanted = search.get('mission');
    setMissionId(options.find((m) => m.id === wanted)?.id ?? options[0]?.id ?? '');
  }, [missions, options, missionId, search]);

  async function create(targetMission: string, y: number, m: number) {
    const mission = (missions ?? []).find((x) => x.id === targetMission);
    if (!mission || !orgId) return;
    setSaving(true);
    const supabase = createClient();
    const { data: existing } = await supabase
      .from('timesheets')
      .select('id')
      .eq('mission_id', targetMission)
      .eq('period_month', m)
      .eq('period_year', y)
      .eq('archived', false)
      .maybeSingle();
    if (existing) {
      router.replace(`/portal/cra/${existing.id}`);
      return;
    }
    const { data, error } = await supabase
      .from('timesheets')
      .insert({ organization_id: orgId, mission_id: targetMission, consultant_id: consultantId, period_month: m, period_year: y, days_worked: 0, days_validated: 0, status: 'draft' })
      .select('id')
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error(fr ? 'Création impossible. Réessayez ou contactez votre référent.' : 'Could not create. Try again or contact your manager.');
      return;
    }
    // Pré-remplissage aligné sur la mission (jours hors période retirés, fériés marqués).
    await timesheetService.alignPrefill(data.id, { start_date: mission.start_date, end_date: mission.end_date });
    router.replace(`/portal/cra/${data.id}`);
  }

  // Lien « Remplir » : mission et mois connus, on crée (ou ouvre) directement.
  const wantedMission = search.get('mission');
  const direct = !!wantedMission && !!search.get('month') && periods.some((p) => p.value === period);
  useEffect(() => {
    if (!direct || autoStarted.current || !missions || !orgId) return;
    if (!options.some((m) => m.id === wantedMission)) return;
    autoStarted.current = true;
    void create(wantedMission!, year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direct, missions, orgId, options]);

  const directValid = direct && !!missions && !!orgId && options.some((m) => m.id === wantedMission);
  const opening = direct && (missions === null || saving || (directValid && !autoStarted.current));

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link href="/portal/cra" className="-my-2 inline-block py-2 text-[13px] text-muted-foreground hover:text-foreground">
          ← {fr ? 'Mes CRA' : 'My timesheets'}
        </Link>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Nouveau CRA' : 'New timesheet'}</h1>
        <p className="text-[13.5px] text-muted-foreground">
          {fr ? 'Choisissez le mois et la mission : les jours ouvrés sont pré-remplis, vous n’avez plus qu’à ajuster.' : 'Pick the month and the mission: working days are pre-filled, you only adjust.'}
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-5">
          {missions === null || opening ? (
            opening ? (
              <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {fr ? 'Ouverture du CRA…' : 'Opening the timesheet…'}
              </p>
            ) : (
              <Skeleton className="h-24 w-full" />
            )
          ) : (
            <>
              <Field label={fr ? 'Mois' : 'Month'} htmlFor="cra-period">
                <Select id="cra-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {periods.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {options.length === 0 ? (
                <p className="text-[13.5px] text-muted-foreground">
                  {fr
                    ? `Aucune de vos missions ne couvre ce mois. Une erreur ? Contactez votre référent ${brandName}.`
                    : `None of your missions covers this month. A mistake? Contact your ${brandName} manager.`}
                </p>
              ) : (
                <Field label="Mission" htmlFor="cra-mission">
                  <Select id="cra-mission" value={missionId} onChange={(e) => setMissionId(e.target.value)}>
                    {options.map((m) => (
                      <option key={m.id} value={m.id}>
                        {missionLabel(m.title, m.company_name)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Button className="w-full" onClick={() => void create(missionId, year, month)} loading={saving} disabled={!missionId || !orgId || options.length === 0}>
                {fr ? 'Continuer' : 'Continue'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
