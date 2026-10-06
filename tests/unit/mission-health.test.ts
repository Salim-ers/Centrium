import { describe, expect, it } from 'vitest';
import { missionHealth, type MissionHealthInput } from '@/lib/missions/health';

const TODAY = '2026-10-07';
const opts = { financials: true, marginTarget: 20 };

const mission = (extra: Partial<MissionHealthInput> = {}): MissionHealthInput => ({
  id: 'm1',
  status: 'active',
  start_date: '2026-01-05',
  end_date: '2027-03-31',
  renewal_status: 'unknown',
  margin_pct: 32,
  daily_cost_eur: 420,
  sheets: [{ year: 2026, month: 9, status: 'client_validated' }],
  has_contract: true,
  ...extra,
});

const ids = (m: MissionHealthInput, o = opts) => missionHealth(m, TODAY, o).signals.map((s) => s.id);

describe('Missions : santé', () => {
  it('une mission à jour ne remonte aucun signal', () => {
    expect(missionHealth(mission(), TODAY, opts)).toEqual({ level: 'ok', signals: [] });
  });

  it('CRA du mois écoulé manquant (ou resté en brouillon) : critique', () => {
    expect(missionHealth(mission({ sheets: [] }), TODAY, opts)).toMatchObject({ level: 'critical', signals: [{ id: 'cra_missing', href: '/timesheets?view=missing' }] });
    expect(ids(mission({ sheets: [{ year: 2026, month: 9, status: 'draft' }] }))).toEqual(['cra_missing']);
    // Mission démarrée ce mois-ci : pas de CRA attendu pour septembre.
    expect(ids(mission({ start_date: '2026-10-01', sheets: [] }))).toEqual([]);
  });

  it('CRA transmis en attente de validation', () => {
    const h = missionHealth(mission({ sheets: [{ year: 2026, month: 9, status: 'submitted' }] }), TODAY, opts);
    expect(h.level).toBe('watch');
    expect(h.signals[0]?.label.fr).toBe('CRA de sept. 2026 à valider');
  });

  it('échéance : renouvellement à statuer, puis fin proche sans décision', () => {
    expect(ids(mission({ end_date: '2026-10-30' }))).toEqual(['renewal']);
    expect(missionHealth(mission({ end_date: '2026-10-15' }), TODAY, opts).signals[0]).toMatchObject({ id: 'ending', tone: 'danger', label: { fr: 'Fin dans 8 j sans décision' } });
    expect(missionHealth(mission({ end_date: '2026-10-15', renewal_status: 'not_renewed' }), TODAY, opts).signals[0]).toMatchObject({ id: 'ending', tone: 'warning' });
    expect(ids(mission({ end_date: '2026-10-15', renewal_status: 'confirmed' }))).toEqual([]);
  });

  it('marge sous l’objectif et CJM manquant, seulement avec l’accès financier', () => {
    expect(ids(mission({ margin_pct: 14 }))).toEqual(['margin']);
    expect(ids(mission({ daily_cost_eur: null, margin_pct: null }))).toEqual(['cost']);
    expect(ids(mission({ margin_pct: 14 }), { financials: false, marginTarget: 20 })).toEqual([]);
  });

  it('contrat manquant si connu ; inconnu, rien n’est signalé', () => {
    expect(ids(mission({ has_contract: false }))).toEqual(['contract']);
    expect(ids(mission({ has_contract: null }))).toEqual([]);
  });

  it('trie du plus urgent au moins urgent, et ignore les missions non actives', () => {
    expect(ids(mission({ sheets: [], has_contract: false, daily_cost_eur: null, margin_pct: null }))).toEqual(['cra_missing', 'contract', 'cost']);
    expect(missionHealth(mission({ status: 'ended', sheets: [] }), TODAY, opts)).toEqual({ level: 'ok', signals: [] });
  });
});
