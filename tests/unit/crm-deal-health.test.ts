import { describe, expect, it } from 'vitest';
import {
  compareDeals,
  dayDiff,
  dealHealth,
  dealUrgency,
  focusCounts,
  followUpPresets,
  healthLabel,
  isDealFocus,
  matchesFocus,
  urgencyLabel,
  weightedAmount,
  type DealLite,
} from '@/lib/crm/deal-health';

const TODAY = '2026-10-07'; // mercredi

const deal = (extra: Partial<DealLite> = {}): DealLite => ({
  id: Math.random().toString(36).slice(2),
  status: 'discussion',
  expected_revenue: 50_000,
  probability: 40,
  daily_rate_eur: null,
  duration_months: null,
  priority: 'medium',
  next_follow_up: '2026-10-20',
  next_action: 'Relancer le DSI',
  updated_at: '2026-10-05T09:00:00Z',
  last_interaction: '2026-10-05T09:00:00Z',
  ...extra,
});

describe('CRM : urgence de la prochaine action', () => {
  it('compte les jours entre deux dates, horodatages compris', () => {
    expect(dayDiff('2026-10-07', '2026-10-10')).toBe(3);
    expect(dayDiff('2026-10-07T23:00:00Z', '2026-10-01')).toBe(-6);
    // Passage à l'heure d'hiver : toujours des jours entiers.
    expect(dayDiff('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('classe la relance : en retard, aujourd’hui, bientôt, plus tard, aucune', () => {
    expect(dealUrgency({ next_follow_up: '2026-10-04' }, TODAY)).toEqual({ level: 'late', days: 3 });
    expect(dealUrgency({ next_follow_up: TODAY }, TODAY)).toEqual({ level: 'today', days: 0 });
    expect(dealUrgency({ next_follow_up: '2026-10-08' }, TODAY)).toEqual({ level: 'soon', days: 1 });
    expect(dealUrgency({ next_follow_up: '2026-10-10' }, TODAY)).toEqual({ level: 'soon', days: 3 });
    expect(dealUrgency({ next_follow_up: '2026-10-11' }, TODAY)).toEqual({ level: 'later', days: 4 });
    expect(dealUrgency({ next_follow_up: null }, TODAY)).toEqual({ level: 'none', days: null });
  });

  it('donne un libellé court et lisible', () => {
    expect(urgencyLabel({ level: 'late', days: 3 }, 'fr')).toBe('En retard · 3 j');
    expect(urgencyLabel({ level: 'soon', days: 1 }, 'fr')).toBe('Demain');
    expect(urgencyLabel({ level: 'soon', days: 2 }, 'en')).toBe('In 2 d');
    expect(urgencyLabel({ level: 'later', days: 9 }, 'fr')).toBeNull();
  });
});

describe('CRM : état de l’affaire', () => {
  it('signale une affaire sans prochaine action', () => {
    const h = dealHealth(deal({ next_follow_up: null, next_action: '  ' }), TODAY);
    expect(h.state).toBe('no_action');
    expect(healthLabel(h, 'fr')).toBe('Sans prochaine action');
  });

  it('signale une affaire inactive depuis plus de 14 jours', () => {
    const h = dealHealth(deal({ last_interaction: '2026-09-20T10:00:00Z' }), TODAY);
    expect(h).toEqual({ state: 'stale', idleDays: 17 });
    expect(healthLabel(h, 'fr')).toBe('Inactive depuis 17 j');
  });

  it('se rabat sur la date de mise à jour sans dernière interaction', () => {
    const h = dealHealth(deal({ last_interaction: null, updated_at: '2026-09-01T08:00:00Z' }), TODAY);
    expect(h.state).toBe('stale');
  });

  it('considère suivie une affaire planifiée et récente', () => {
    expect(dealHealth(deal(), TODAY)).toEqual({ state: 'on_track', idleDays: 2 });
  });

  it('ne juge pas les affaires closes', () => {
    expect(dealHealth(deal({ status: 'won', next_follow_up: null, next_action: null }), TODAY).state).toBe('closed');
    expect(dealHealth(deal({ status: 'on_hold' }), TODAY).state).toBe('closed');
  });
});

describe('CRM : tri du tableau', () => {
  it('par urgence : retard le plus ancien, aujourd’hui, bientôt, sans date, plus tard', () => {
    const later = deal({ id: 'later', next_follow_up: '2026-10-30' });
    const none = deal({ id: 'none', next_follow_up: null });
    const soon = deal({ id: 'soon', next_follow_up: '2026-10-09' });
    const today = deal({ id: 'today', next_follow_up: TODAY });
    const late1 = deal({ id: 'late1', next_follow_up: '2026-10-06' });
    const late5 = deal({ id: 'late5', next_follow_up: '2026-10-02' });
    const sorted = [later, none, soon, today, late1, late5].sort(compareDeals('urgency', TODAY)).map((d) => d.id);
    expect(sorted).toEqual(['late5', 'late1', 'today', 'soon', 'none', 'later']);
  });

  it('à urgence égale : priorité puis montant', () => {
    const a = deal({ id: 'a', next_follow_up: TODAY, priority: 'medium', expected_revenue: 90_000 });
    const b = deal({ id: 'b', next_follow_up: TODAY, priority: 'critical', expected_revenue: 10_000 });
    const c = deal({ id: 'c', next_follow_up: TODAY, priority: 'medium', expected_revenue: 120_000 });
    expect([a, b, c].sort(compareDeals('urgency', TODAY)).map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('par clôture prévue : dates d’abord, les plus proches en tête', () => {
    const a = deal({ id: 'a', expected_close: '2026-12-01' });
    const b = deal({ id: 'b', expected_close: null });
    const c = deal({ id: 'c', expected_close: '2026-11-01' });
    expect([a, b, c].sort(compareDeals('close', TODAY)).map((d) => d.id)).toEqual(['c', 'a', 'b']);
  });

  it('par montant, du plus élevé au plus faible (montant estimé compris)', () => {
    const a = deal({ id: 'a', expected_revenue: 20_000 });
    const b = deal({ id: 'b', expected_revenue: null, daily_rate_eur: 600, duration_months: 6 }); // 72 000
    expect([a, b].sort(compareDeals('amount', TODAY)).map((d) => d.id)).toEqual(['b', 'a']);
  });
});

describe('CRM : filtres rapides', () => {
  const list = [
    deal({ id: 'late', next_follow_up: '2026-10-01' }),
    deal({ id: 'today', next_follow_up: TODAY, priority: 'high' }),
    deal({ id: 'none', next_follow_up: null, next_action: null }),
    deal({ id: 'idle', last_interaction: '2026-09-01T00:00:00Z' }),
    deal({ id: 'won', status: 'won', next_follow_up: '2026-10-01' }),
  ];

  it('reconnaît les filtres valides', () => {
    expect(isDealFocus('follow_up')).toBe(true);
    expect(isDealFocus('nope')).toBe(false);
    expect(isDealFocus(null)).toBe(false);
  });

  it('« à relancer » : en retard ou aujourd’hui, affaires ouvertes seulement', () => {
    expect(list.filter((d) => matchesFocus(d, 'follow_up', TODAY)).map((d) => d.id)).toEqual(['late', 'today']);
  });

  it('compte chaque filtre sur les affaires ouvertes', () => {
    expect(focusCounts(list, TODAY)).toEqual({ all: 4, follow_up: 2, no_action: 1, priority: 1, stale: 1 });
  });
});

describe('CRM : montant pondéré', () => {
  it('multiplie le montant par les chances de gagner', () => {
    expect(weightedAmount(deal({ expected_revenue: 80_000, probability: 25 }))).toBe(20_000);
    expect(weightedAmount(deal({ probability: null }))).toBe(0);
  });
});

describe('CRM : dates proposées pour une relance', () => {
  it('un mercredi : aujourd’hui, demain, +3 jours, +1 et +2 semaines', () => {
    const p = followUpPresets(TODAY);
    expect(p.map((x) => [x.id, x.date])).toEqual([
      ['today', '2026-10-07'],
      ['next', '2026-10-08'],
      ['in3', '2026-10-12'], // samedi 10 → lundi 12
      ['week', '2026-10-14'],
      ['fortnight', '2026-10-21'],
    ]);
    expect(p[1]?.label.fr).toBe('Demain');
  });

  it('un vendredi : le prochain jour ouvré est lundi', () => {
    const p = followUpPresets('2026-10-09');
    expect(p[1]).toMatchObject({ date: '2026-10-12', label: { fr: 'Lundi' } });
  });

  it('saute les jours fériés (11 novembre) et ne propose pas deux fois la même date', () => {
    const p = followUpPresets('2026-11-10');
    expect(p[1]?.date).toBe('2026-11-12');
    expect(new Set(p.map((x) => x.date)).size).toBe(p.length);
  });
});
