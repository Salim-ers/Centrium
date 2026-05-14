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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';

type MissionRow = {
  id: string;
  title: string;
  daily_rate_eur: number;
  company: { name: string } | null;
};

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function PortalCraNewPage() {
  const router = useRouter();
  const brandName = useBrandName();
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
      toast.error(`Aucune mission active. Contacte ton référent ${brandName}.`);
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
      toast.error('Mission introuvable');
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
      toast.error('Erreur : ' + error.message);
      return;
    }
    toast.success('CRA créé en brouillon');
    router.push(`/portal/cra/${data.id}`);
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/portal/cra">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nouveau CRA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Mission *</Label>
              {loading ? (
                <div className="h-10 rounded-md bg-white/[0.02] animate-pulse" />
              ) : (
                <>
                  <Select
                    value={missionId}
                    onChange={(e) => setMissionId(e.target.value)}
                    required
                  >
                    {missions.length === 0 && <option value="">Aucune mission active</option>}
                    {missions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                        {m.company ? ` (${m.company.name})` : ''}
                      </option>
                    ))}
                  </Select>
                  {missions.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">
                      Aucune mission active n&apos;est rattachée à ton profil. Contacte ton
                      référent {brandName}.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Mois *</Label>
                <Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Année *</Label>
                <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Jours travaillés *</Label>
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
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Congés, jours fériés, précisions…"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => router.push('/portal/cra')}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !missionId}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le CRA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
