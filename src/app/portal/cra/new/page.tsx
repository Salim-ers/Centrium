'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type MissionRow = {
  id: string;
  title: string;
  daily_rate_eur: number;
  company: { name: string } | null;
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PortalCraNewPage() {
  const router = useRouter();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const months = isEn ? MONTHS_EN : MONTHS_FR;
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [missionId, setMissionId] = useState<string>('');
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [days, setDays] = useState<number>(20);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('missions')
        .select('id, title, daily_rate_eur, company:companies(name)')
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      const list = (data ?? []) as unknown as MissionRow[];
      setMissions(list);
      if (list.length > 0) setMissionId(list[0].id);
      setLoading(false);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!missionId) {
      toast.error(
        isEn
          ? `No active mission. Contact your ${brandName} manager.`
          : `Aucune mission active. Contacte ton référent ${brandName}.`
      );
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // L'insert doit inclure consultant_id. RLS vérifie que c'est bien celui du user.
    // On récupère le consultant_id depuis la mission (lien consultant → mission).
    const { data: mission } = await supabase
      .from('missions')
      .select('consultant_id, organization_id')
      .eq('id', missionId)
      .single();

    if (!mission) {
      toast.error(isEn ? 'Mission not found' : 'Mission introuvable');
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('timesheets')
      .insert({
        organization_id: mission.organization_id,
        mission_id: missionId,
        consultant_id: mission.consultant_id,
        period_month: month,
        period_year: year,
        days_worked: days,
        days_validated: 0,
        status: 'draft',
        notes: notes || null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + error.message);
      return;
    }
    toast.success(isEn ? 'CRA created as draft' : 'CRA créé en brouillon');
    router.push(`/portal/cra/${data.id}`);
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/portal/cra">
          <ArrowLeft className="h-4 w-4" />
          {isEn ? 'Back' : 'Retour'}
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto mb-6">
        <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-2">
          {isEn ? 'My space' : 'Mon espace'}
        </div>
        <h1 className="font-display font-light tracking-[-0.03em] leading-[1.05] text-[clamp(1.75rem,3.5vw,2.5rem)]">
          {isEn ? 'New' : 'Nouveau'} <span className="qc-italic-accent font-editorial italic">CRA.</span>
        </h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="sr-only">{isEn ? 'New CRA' : 'Nouveau CRA'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{isEn ? 'Mission *' : 'Mission *'}</Label>
              {loading ? (
                <div className="h-10 rounded-md bg-white/[0.02] animate-pulse" />
              ) : (
                <>
                  <Combobox
                    value={missionId}
                    onChange={(v) => setMissionId(v)}
                    options={[
                      ...(missions.length === 0
                        ? [{ value: '', label: isEn ? 'No active mission' : 'Aucune mission active' }]
                        : []),
                      ...missions.map((m) => ({
                        value: m.id,
                        label: `${m.title}${m.company ? ` (${m.company.name})` : ''}`,
                      })),
                    ]}
                  />
                  {missions.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">
                      {isEn ? (
                        <>No active mission is linked to your profile. Contact your {brandName} manager.</>
                      ) : (
                        <>
                          Aucune mission active n&apos;est rattachée à ton profil. Contacte ton
                          référent {brandName}.
                        </>
                      )}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{isEn ? 'Month *' : 'Mois *'}</Label>
                <Combobox
                  value={String(month)}
                  onChange={(v) => setMonth(Number(v))}
                  options={months.map((m, i) => ({ value: String(i + 1), label: m }))}
                />
              </div>
              <div>
                <Label>{isEn ? 'Year *' : 'Année *'}</Label>
                <Combobox
                  value={String(year)}
                  onChange={(v) => setYear(Number(v))}
                  options={years.map((y) => ({ value: String(y), label: String(y) }))}
                />
              </div>
              <div>
                <Label>{isEn ? 'Days worked *' : 'Jours travaillés *'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={31}
                  step={0.5}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <Label>{isEn ? 'Notes' : 'Notes'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={isEn ? 'Leave, public holidays, details…' : 'Congés, jours fériés, précisions…'}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => router.push('/portal/cra')}>
                {isEn ? 'Cancel' : 'Annuler'}
              </Button>
              <Button type="submit" disabled={saving || !missionId}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEn ? 'Create CRA' : 'Créer le CRA'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
