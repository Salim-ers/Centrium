import { describe, expect, it } from 'vitest';
import {
  averageMarginPct,
  bookedRevenue,
  endingBucket,
  forecastRevenue,
  monthlySeries,
  occupancyAt,
  opportunityAmount,
  pipelineByStage,
  realizedRevenue,
  revenueByClient,
  weightedPipeline,
  type MissionLite,
  type TimesheetLite,
} from '@/lib/pilotage/metrics';
import { probabilityForMove, stageOf } from '@/lib/crm/pipeline';

const TODAY = new Date(2026, 9, 5); // lundi 5 octobre 2026

const missions: MissionLite[] = [
  { id: 'm1', consultant_id: 'c1', company_id: 'acme', status: 'active', start_date: '2026-09-01', end_date: '2026-10-30', daily_rate_eur: 700 },
  { id: 'm2', consultant_id: 'c2', company_id: 'globex', status: 'active', start_date: '2026-10-19', end_date: null, daily_rate_eur: 500 },
  { id: 'm3', consultant_id: 'c3', company_id: 'acme', status: 'proposed', start_date: '2026-10-01', end_date: null, daily_rate_eur: 900 },
];
const cost = (m: MissionLite) => (m.id === 'm1' ? 500 : null);

describe('indicateurs de pilotage', () => {
  it('CA signé : jours ouvrés restants × TJM des missions actives', () => {
    // m1 : 5 → 30 oct = 20 j ; m2 : 19 → 31 oct (sans fin → fin de mois) = 10 j
    expect(bookedRevenue(missions, TODAY)).toBe(20 * 700 + 10 * 500);
  });

  it('CA prévisionnel du mois', () => {
    // octobre 2026 : 22 j ouvrés ; m1 1→30 = 22 j ; m2 19→31 = 10 j
    expect(forecastRevenue(missions, 2026, 10)).toBe(22 * 700 + 10 * 500);
    expect(forecastRevenue(missions, 2026, 12)).toBe(22 * 500); // décembre : 22 j ouvrés, m2 seule
  });

  it('marge moyenne pondérée, uniquement sur les coûts connus', () => {
    expect(averageMarginPct(missions, cost)).toEqual({ pct: 28.6, covered: 1, total: 2 });
    expect(averageMarginPct(missions, () => null).pct).toBeNull();
  });

  it('occupation : effectif hors indisponibles, prospects et archivés', () => {
    const consultants = [
      { id: 'c1', status: 'on_mission' },
      { id: 'c2', status: 'available' },
      { id: 'c3', status: 'available' },
      { id: 'c4', status: 'unavailable' },
      { id: 'c5', status: 'available', is_prospect: true },
    ];
    expect(occupancyAt(consultants, missions, TODAY)).toEqual({ rate: 33.3, staffed: 1, capacity: 3, bench: 2 });
  });

  it('pipeline pondéré et montant estimé', () => {
    const opps = [
      { id: 'o1', status: 'discussion' as const, expected_revenue: 100000, probability: 25, daily_rate_eur: null, duration_months: null },
      { id: 'o2', status: 'negotiation' as const, expected_revenue: null, probability: 80, daily_rate_eur: 600, duration_months: 6 },
      { id: 'o3', status: 'won' as const, expected_revenue: 50000, probability: 100, daily_rate_eur: null, duration_months: null },
    ];
    expect(opportunityAmount(opps[1]!)).toBe(72000);
    expect(weightedPipeline(opps)).toBe(25000 + 57600);
    const stages = pipelineByStage(opps);
    expect(stages.find((s) => s.stage === 'qualified')).toMatchObject({ count: 1, amount: 100000 });
    expect(stages.some((s) => s.stage === 'won')).toBe(false);
  });

  it('CA réalisé : uniquement les CRA validés', () => {
    const ts: TimesheetLite[] = [
      { mission_id: 'm1', period_year: 2026, period_month: 9, days_validated: 21, days_worked: 21, status: 'client_validated' },
      { mission_id: 'm1', period_year: 2026, period_month: 9, days_validated: 0, days_worked: 3, status: 'submitted' },
    ];
    const byId = new Map(missions.map((m) => [m.id, m]));
    expect(realizedRevenue(ts, byId, 2026, 9)).toBe(21 * 700);
    expect(revenueByClient(ts, missions, { year: 2026, month: 1 }).get('acme')).toBe(21 * 700);

    const series = monthlySeries(missions, ts, cost, TODAY, 1, 1);
    expect(series.map((p) => p.key)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(series[0]).toMatchObject({ realized: 14700, forecast: null, margin: 21 * 200 });
    expect(series[2]!.realized).toBeNull();
  });

  it('tranches d’échéance 15 / 30 / 60 / 90 jours', () => {
    expect(endingBucket('2026-10-12', TODAY)).toBe(15);
    expect(endingBucket('2026-11-01', TODAY)).toBe(30);
    expect(endingBucket('2026-12-01', TODAY)).toBe(60);
    expect(endingBucket('2026-12-30', TODAY)).toBe(90);
    expect(endingBucket('2027-03-01', TODAY)).toBeNull();
    expect(endingBucket('2026-09-01', TODAY)).toBeNull();
  });
});

describe('pipeline V2', () => {
  it('projette les statuts historiques sur les 7 étapes', () => {
    expect(stageOf('new')).toBe('prospect');
    expect(stageOf('contacted')).toBe('prospect');
    expect(stageOf('cv_sent')).toBe('proposal');
    expect(stageOf('client_interview')).toBe('meeting');
    expect(stageOf('on_hold')).toBeNull();
  });

  it('ajuste la probabilité au changement d’étape', () => {
    expect(probabilityForMove(null, 'meeting')).toBe(40);
    expect(probabilityForMove(60, 'meeting')).toBe(60);
    expect(probabilityForMove(60, 'won')).toBe(100);
    expect(probabilityForMove(60, 'lost')).toBe(0);
  });
});
