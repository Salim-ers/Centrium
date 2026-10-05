'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMarginPolicy } from '@/hooks/useMarginPolicy';
import { createClient } from '@/lib/supabase/client';
import { marginLevel, simulateMargin, type MarginLevel } from '@/lib/finance/margin-policy';
import { formatEur, formatPct } from '@/lib/format';

type Positioned = { id: string; name: string; cost: number | null; target: number | null };

const LEVEL: Record<MarginLevel, { tone: StatusTone; fr: string; en: string }> = {
  low: { tone: 'danger', fr: 'Faible', en: 'Low' },
  fair: { tone: 'warning', fr: 'Correcte', en: 'Correct' },
  good: { tone: 'success', fr: 'Bonne', en: 'Good' },
};

const DAYS_PER_MONTH = 20;

async function loadPositioned(opportunityId: string): Promise<Positioned[]> {
  const supabase = createClient();
  const { data: rows } = await supabase.from('opportunity_consultants').select('consultant_id, consultants(first_name, last_name)').eq('opportunity_id', opportunityId);
  const list = (rows ?? []) as unknown as Array<{ consultant_id: string; consultants: { first_name: string; last_name: string } | null }>;
  if (list.length === 0) return [];
  // Coûts sous RLS : lisibles seulement avec les droits financiers.
  const { data: costs } = await supabase
    .from('consultant_financials')
    .select('consultant_id, daily_cost_eur, target_margin_pct')
    .in(
      'consultant_id',
      list.map((r) => r.consultant_id),
    );
  const byId = new Map(((costs ?? []) as Array<{ consultant_id: string; daily_cost_eur: number | null; target_margin_pct: number | null }>).map((c) => [c.consultant_id, c]));
  return list.map((r) => ({
    id: r.consultant_id,
    name: r.consultants ? `${r.consultants.first_name} ${r.consultants.last_name}` : '—',
    cost: byId.get(r.consultant_id)?.daily_cost_eur != null ? Number(byId.get(r.consultant_id)!.daily_cost_eur) : null,
    target: byId.get(r.consultant_id)?.target_margin_pct != null ? Number(byId.get(r.consultant_id)!.target_margin_pct) : null,
  }));
}

/**
 * Simulateur de marge d'une opportunité : TJM client et CJM consultant →
 * marge par jour, en %, et sur un mois, qualifiée selon la politique de
 * marge de l'organisation (ou l'objectif propre du consultant choisi).
 */
export function MarginSimulator({ opportunityId, rate, lang }: { opportunityId: string; rate: number | null; lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const { policy } = useMarginPolicy();
  const { data: positioned } = useCachedQuery<Positioned[]>(`opp-positioned-costs:${opportunityId}`, () => loadPositioned(opportunityId));
  const [tjm, setTjm] = useState(rate != null ? String(rate) : '');
  const [cjm, setCjm] = useState('');
  const [consultantId, setConsultantId] = useState('');

  useEffect(() => {
    if (rate != null) setTjm(String(rate));
  }, [rate]);

  const chosen = (positioned ?? []).find((p) => p.id === consultantId) ?? null;
  const num = (v: string) => {
    const n = Number(v.replace(',', '.'));
    return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const r = num(tjm);
  const c = num(cjm);
  const sim = useMemo(() => (r != null && c != null && r > 0 ? simulateMargin(r, c, DAYS_PER_MONTH) : null), [r, c]);
  const level = sim?.pct != null ? marginLevel(sim.pct, policy, chosen?.target) : null;
  const target = chosen?.target ?? policy.target;
  const withCost = (positioned ?? []).filter((p) => p.cost != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          {fr ? 'Simulateur de marge' : 'Margin simulator'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {withCost.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="sim-consultant">{fr ? 'Consultant positionné' : 'Positioned consultant'}</Label>
            <select
              id="sim-consultant"
              value={consultantId}
              onChange={(e) => {
                setConsultantId(e.target.value);
                const p = withCost.find((x) => x.id === e.target.value);
                if (p?.cost != null) setCjm(String(p.cost));
              }}
              className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-[13.5px]"
            >
              <option value="">{fr ? 'Saisie libre' : 'Manual entry'}</option>
              {withCost.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sim-tjm">{fr ? 'TJM client (€)' : 'Client day rate (€)'}</Label>
            <Input id="sim-tjm" inputMode="decimal" value={tjm} onChange={(e) => setTjm(e.target.value)} placeholder="650" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-cjm">{fr ? 'CJM consultant (€)' : 'Consultant daily cost (€)'}</Label>
            <Input
              id="sim-cjm"
              inputMode="decimal"
              value={cjm}
              onChange={(e) => {
                setCjm(e.target.value);
                setConsultantId('');
              }}
              placeholder="480"
            />
          </div>
        </div>

        {sim ? (
          <div className="space-y-3" aria-live="polite">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 px-2 py-2">
                <dt className="text-[11px] text-muted-foreground">{fr ? 'Marge / jour' : 'Margin / day'}</dt>
                <dd className="num text-[15px] font-semibold">{formatEur(sim.perDay, lang)}</dd>
              </div>
              <div className="rounded-lg bg-muted/50 px-2 py-2">
                <dt className="text-[11px] text-muted-foreground">{fr ? 'Marge' : 'Margin'}</dt>
                <dd className="num text-[15px] font-semibold">{sim.pct != null ? formatPct(sim.pct, lang) : '—'}</dd>
              </div>
              <div className="rounded-lg bg-muted/50 px-2 py-2">
                <dt className="text-[11px] text-muted-foreground">{fr ? 'Par mois' : 'Per month'}</dt>
                <dd className="num text-[15px] font-semibold">{formatEur(sim.monthly, lang)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
              {level && <StatusPill tone={LEVEL[level].tone}>{fr ? `Marge ${LEVEL[level].fr.toLowerCase()}` : `${LEVEL[level].en} margin`}</StatusPill>}
              <span>
                {fr
                  ? `Objectif ${formatPct(target, lang, 0)} · bonne dès ${formatPct(Math.max(policy.good, target), lang, 0)} · ${DAYS_PER_MONTH} j / mois`
                  : `Target ${formatPct(target, lang, 0)} · good from ${formatPct(Math.max(policy.good, target), lang, 0)} · ${DAYS_PER_MONTH} d / month`}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">{fr ? 'Renseignez le TJM client et le CJM pour simuler la marge.' : 'Enter the client day rate and the daily cost to simulate the margin.'}</p>
        )}
      </CardContent>
    </Card>
  );
}
