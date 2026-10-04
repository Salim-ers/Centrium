'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { periodLabel } from '@/lib/status';
import type { PortalMission } from '@/types';
import { usePortalConsultant } from '../../portal-context';

/**
 * Création d'un CRA : mission + mois. Le détail jour par jour (travaillé,
 * télétravail, congés, absences) se saisit ensuite sur le calendrier.
 * Si un CRA existe déjà pour la période, on l'ouvre au lieu d'en créer un.
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

  useEffect(() => {
    const supabase = createClient();
    void Promise.all([fetchMyMissions(supabase), fetchMyProfile(supabase)]).then(([list, profile]) => {
      const active = list.filter((m) => m.status === 'active');
      setMissions(active);
      setOrgId(profile?.organization_id ?? null);
      const wanted = search.get('mission');
      setMissionId(active.find((m) => m.id === wanted)?.id ?? active[0]?.id ?? '');
    });
  }, [search]);

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

  async function create() {
    if (!missionId || !orgId) return;
    const [y, m] = period.split('-').map(Number) as [number, number];
    setSaving(true);
    const supabase = createClient();
    const { data: existing } = await supabase
      .from('timesheets')
      .select('id')
      .eq('mission_id', missionId)
      .eq('period_month', m)
      .eq('period_year', y)
      .eq('archived', false)
      .maybeSingle();
    if (existing) {
      setSaving(false);
      router.replace(`/portal/cra/${existing.id}`);
      return;
    }
    const { data, error } = await supabase
      .from('timesheets')
      .insert({ organization_id: orgId, mission_id: missionId, consultant_id: consultantId, period_month: m, period_year: y, days_worked: 0, days_validated: 0, status: 'draft' })
      .select('id')
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(fr ? 'Création impossible. Réessayez ou contactez votre référent.' : 'Could not create. Try again or contact your manager.');
      return;
    }
    router.replace(`/portal/cra/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link href="/portal/cra" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← {fr ? 'Mes CRA' : 'My timesheets'}
        </Link>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Nouveau CRA' : 'New timesheet'}</h1>
        <p className="text-[13.5px] text-muted-foreground">
          {fr ? 'Choisissez la mission et le mois, puis remplissez le calendrier.' : 'Pick the mission and month, then fill in the calendar.'}
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-5">
          {missions === null ? (
            <Skeleton className="h-24 w-full" />
          ) : missions.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">
              {fr ? `Aucune mission en cours n’est rattachée à votre profil. Contactez votre référent ${brandName}.` : `No ongoing mission is linked to your profile. Contact your ${brandName} manager.`}
            </p>
          ) : (
            <>
              <Field label="Mission" htmlFor="cra-mission">
                <Select id="cra-mission" value={missionId} onChange={(e) => setMissionId(e.target.value)}>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                      {m.company_name ? ` — ${m.company_name}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={fr ? 'Mois' : 'Month'} htmlFor="cra-period">
                <Select id="cra-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {periods.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button className="w-full" onClick={() => void create()} loading={saving} disabled={!missionId || !orgId}>
                {fr ? 'Continuer' : 'Continue'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
