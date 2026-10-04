'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { FactList } from '@/components/app/FactList';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { consultantFinancialsSchema } from '@/lib/validators/v2';
import { formatEur, formatPct } from '@/lib/format';
import type { ConsultantFinancials } from '@/types';

/**
 * Données financières internes d'un consultant (TJM, CJM, marge cible).
 * Affichée uniquement aux rôles autorisés ; la RLS protège la table.
 */
export function ConsultantFinancialsCard({
  consultantId,
  dailyRate,
  canEdit,
  lang,
}: {
  consultantId: string;
  dailyRate: number | null;
  canEdit: boolean;
  lang: 'fr' | 'en';
}) {
  const fr = lang === 'fr';
  const { activeOrgId } = useOrganization();
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState('');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const { data, setData, loading } = useCachedQuery<ConsultantFinancials | null>(
    `consultant-fin:${consultantId}`,
    async () => {
      const { data: row, error } = await createClient().from('consultant_financials').select('*').eq('consultant_id', consultantId).maybeSingle();
      return error ? null : ((row as ConsultantFinancials | null) ?? null);
    },
    { enabled: !!consultantId },
  );

  const cjm = data?.daily_cost_eur != null ? Number(data.daily_cost_eur) : null;
  const margin = dailyRate && cjm != null ? ((dailyRate - cjm) / dailyRate) * 100 : null;
  const targetPct = data?.target_margin_pct != null ? Number(data.target_margin_pct) : null;
  const minRate = cjm != null && targetPct != null && targetPct < 100 ? cjm / (1 - targetPct / 100) : null;

  function startEdit() {
    setCost(cjm != null ? String(cjm) : '');
    setTarget(targetPct != null ? String(targetPct) : '');
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = consultantFinancialsSchema.safeParse({
      daily_cost_eur: cost === '' ? null : cost,
      target_margin_pct: target === '' ? null : target,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? (fr ? 'Valeurs invalides' : 'Invalid values'));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: row, error } = await supabase
      .from('consultant_financials')
      // organization_id est de toute façon réimposé par le trigger (org du consultant).
      .upsert({ consultant_id: consultantId, organization_id: activeOrgId, ...parsed.data, updated_by: user?.id ?? null })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setData(row as ConsultantFinancials);
    setEditing(false);
    toast.success(fr ? 'Données financières enregistrées' : 'Financial data saved');
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          {fr ? 'Finances' : 'Financials'}
        </CardTitle>
        {canEdit && !editing && (
          <Button variant="ghost" size="icon-sm" onClick={startEdit} aria-label={fr ? 'Modifier les finances' : 'Edit financials'}>
            <Pencil />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <Field label={fr ? 'CJM (€ HT / jour)' : 'Daily cost (€)'} htmlFor="fin-cost" hint={fr ? 'Coût journalier chargé.' : 'Fully loaded daily cost.'}>
              <Input id="fin-cost" type="number" min={0} step={1} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
            <Field label={fr ? 'Marge cible (%)' : 'Target margin (%)'} htmlFor="fin-target">
              <Input id="fin-target" type="number" min={-100} max={100} step={0.5} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {fr ? 'Annuler' : 'Cancel'}
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {fr ? 'Enregistrer' : 'Save'}
              </Button>
            </div>
          </form>
        ) : loading && !data ? (
          <div className="skeleton h-16 w-full" />
        ) : (
          <FactList
            facts={[
              { label: fr ? 'TJM de référence' : 'Reference day rate', value: dailyRate ? formatEur(dailyRate, lang) : null },
              { label: 'CJM', value: cjm != null ? formatEur(cjm, lang) : null },
              {
                label: fr ? 'Marge au TJM de référence' : 'Margin at reference rate',
                value: margin != null ? <span className={margin < (targetPct ?? 0) ? 'text-warning' : ''}>{formatPct(margin, lang)}</span> : null,
              },
              {
                label: fr ? 'Marge cible' : 'Target margin',
                value: targetPct != null ? formatPct(targetPct, lang) : null,
                hint: minRate ? (fr ? `TJM plancher : ${formatEur(minRate, lang)}` : `Floor rate: ${formatEur(minRate, lang)}`) : undefined,
              },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
