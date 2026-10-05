import { describe, expect, it } from 'vitest';

import {
  benchGaps,
  capacityForecast,
  futureAvailability,
  lostReasons,
  missionEndingsByMonth,
  positioningStats,
  quoteStats,
  renewalStats,
  revenueByConsultant,
  salesCycle,
  sourceBreakdown,
  staffingLeadTime,
  timesheetPunctuality,
  winRate,
} from '@/lib/pilotage/analytics';

const SINCE = new Date('2025-10-04T00:00:00Z');
const opp = (status: string, updated_at: string, extra: Record<string, unknown> = {}) => ({ status, created_at: updated_at, updated_at, ...extra });

describe('winRate', () => {
  it('counts only opportunities closed in the period', () => {
    const r = winRate([opp('won', '2026-03-01'), opp('lost', '2026-04-01'), opp('lost', '2026-05-01'), opp('won', '2024-01-01'), opp('discussion', '2026-06-01')], SINCE);
    expect(r).toEqual({ won: 1, lost: 2, rate: (1 / 3) * 100 });
  });
  it('returns null without closed opportunities', () => {
    expect(winRate([opp('new', '2026-03-01')], SINCE).rate).toBeNull();
  });
});

describe('sourceBreakdown and lostReasons', () => {
  it('groups sources and defaults missing ones to manual', () => {
    expect(sourceBreakdown([opp('new', '2026-01-01', { source: 'client_portal' }), opp('new', '2026-01-02'), opp('new', '2026-01-03', { source: null })], SINCE)).toEqual([
      { source: 'manual', count: 2 },
      { source: 'client_portal', count: 1 },
    ]);
  });
  it('merges reasons case-insensitively and reports unspecified ones last', () => {
    const r = lostReasons([opp('lost', '2026-02-01', { lost_reason: 'Prix' }), opp('lost', '2026-02-02', { lost_reason: 'prix ' }), opp('lost', '2026-02-03', { lost_reason: '' })], SINCE);
    expect(r).toEqual([
      { reason: 'Prix', count: 2 },
      { reason: '', count: 1 },
    ]);
  });
});

describe('quoteStats', () => {
  it('computes acceptance rate on decided quotes and the median delay', () => {
    const s = quoteStats(
      [
        { status: 'accepted', total_ht: 10000, sent_at: '2026-01-01T00:00:00Z', decided_at: '2026-01-05T00:00:00Z' },
        { status: 'declined', total_ht: 5000, sent_at: '2026-02-01T00:00:00Z', decided_at: '2026-02-11T00:00:00Z' },
        { status: 'sent', total_ht: 7000, sent_at: '2026-03-01T00:00:00Z', decided_at: null },
        { status: 'draft', total_ht: 1, sent_at: null, decided_at: null },
      ],
      SINCE,
    );
    expect(s.sent).toBe(3);
    expect(s.acceptanceRate).toBe(50);
    expect(s.acceptedAmount).toBe(10000);
    expect(s.medianDaysToDecision).toBe(7);
    expect(s.pending).toBe(1);
  });
});

describe('timesheetPunctuality', () => {
  it('treats a timesheet submitted after the 5th of next month, or never, as late', () => {
    const today = new Date('2026-10-20T12:00:00');
    const rows = [
      { period_year: 2026, period_month: 9, status: 'client_validated', submitted_at: '2026-10-03T09:00:00' },
      { period_year: 2026, period_month: 9, status: 'submitted', submitted_at: '2026-10-08T09:00:00' },
      { period_year: 2026, period_month: 9, status: 'draft', submitted_at: null },
    ];
    const sept = timesheetPunctuality(rows, today, 1).find((p) => p.key === '2026-09');
    expect(sept).toMatchObject({ total: 3, onTime: 1 });
  });
  it('skips months whose deadline has not passed yet', () => {
    expect(timesheetPunctuality([], new Date('2026-10-03T12:00:00'), 1)).toHaveLength(0);
  });
});

describe('revenueByConsultant', () => {
  it('sums validated days times the mission rate per consultant', () => {
    const missions = [{ id: 'm1', consultant_id: 'c1', company_id: 'co', status: 'active', start_date: '2026-01-01', end_date: null, daily_rate_eur: 600 }];
    const ts = [
      { mission_id: 'm1', period_year: 2026, period_month: 8, status: 'client_validated', days_validated: 20, days_worked: 20 },
      { mission_id: 'm1', period_year: 2026, period_month: 9, status: 'submitted', days_validated: null, days_worked: 21 },
    ];
    expect(revenueByConsultant(ts, missions, { year: 2026, month: 1 }).get('c1')).toBe(12000);
  });
});

describe('analytics V2', () => {
  const TODAY = new Date(2026, 9, 5); // 5 octobre 2026
  const YEAR_AGO = new Date(2025, 9, 5);

  it('measures the sales cycle on won deals (median days from creation to win)', () => {
    const rows = [
      { status: 'won', created_at: '2026-01-01T09:00:00Z', updated_at: '2026-01-21T09:00:00Z' },
      { status: 'won', created_at: '2026-02-01T09:00:00Z', updated_at: '2026-03-03T09:00:00Z' },
      { status: 'won', created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-11T09:00:00Z' },
      { status: 'lost', created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-30T09:00:00Z' },
      { status: 'won', created_at: '2024-01-01T09:00:00Z', updated_at: '2024-06-01T09:00:00Z' },
    ];
    expect(salesCycle(rows, YEAR_AGO)).toEqual({ medianDays: 20, count: 3 });
    expect(salesCycle([], YEAR_AGO)).toEqual({ medianDays: null, count: 0 });
  });

  it('splits future availability into bench, 30, 60 and 90 days', () => {
    const consultants = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, status: id === 'f' ? 'unavailable' : 'on_mission' }));
    const missions = [
      { consultant_id: 'b', status: 'active', start_date: '2026-01-01', end_date: '2026-10-20' }, // libre le 21/10
      { consultant_id: 'c', status: 'active', start_date: '2026-01-01', end_date: '2026-11-20' },
      { consultant_id: 'd', status: 'active', start_date: '2026-01-01', end_date: '2026-12-20' },
      { consultant_id: 'e', status: 'active', start_date: '2026-01-01', end_date: null },
    ];
    expect(futureAvailability(consultants, missions, TODAY)).toEqual({ now: 1, d30: 1, d60: 1, d90: 1 });
  });

  it('counts mission endings per upcoming month', () => {
    const missions = [
      { consultant_id: 'a', status: 'active', start_date: '2026-01-01', end_date: '2026-10-31' },
      { consultant_id: 'b', status: 'active', start_date: '2026-01-01', end_date: '2026-10-02' }, // déjà passée
      { consultant_id: 'c', status: 'active', start_date: '2026-01-01', end_date: '2026-12-15' },
      { consultant_id: 'd', status: 'ended', start_date: '2026-01-01', end_date: '2026-11-15' },
    ];
    expect(missionEndingsByMonth(missions, TODAY, 3).map((m) => [m.key, m.count])).toEqual([
      ['2026-10', 1],
      ['2026-11', 0],
      ['2026-12', 1],
    ]);
  });

  it('reports positionings, their win rate and the staffing lead time', () => {
    const p = (opportunity_id: string, sent_at: string, opportunity_status: string, opportunity_created_at: string) => ({ opportunity_id, sent_at, opportunity_status, opportunity_created_at });
    const rows = [
      p('o1', '2026-03-05T09:00:00Z', 'won', '2026-03-01T09:00:00Z'),
      p('o1', '2026-03-09T09:00:00Z', 'won', '2026-03-01T09:00:00Z'),
      p('o2', '2026-05-11T09:00:00Z', 'lost', '2026-05-01T09:00:00Z'),
      p('o3', '2026-06-03T09:00:00Z', 'cv_sent', '2026-06-01T09:00:00Z'),
    ];
    expect(positioningStats(rows, YEAR_AGO)).toEqual({ total: 4, won: 2, rate: (2 / 3) * 100 });
    // Premiers positionnements : 4, 10 et 2 jours → médiane 4.
    expect(staffingLeadTime(rows, YEAR_AGO)).toEqual({ medianDays: 4, count: 3 });
  });

  it('averages bench gaps between consecutive missions', () => {
    const missions = [
      { consultant_id: 'a', status: 'ended', start_date: '2025-11-01', end_date: '2026-01-31' },
      { consultant_id: 'a', status: 'active', start_date: '2026-02-11', end_date: null }, // 10 jours
      { consultant_id: 'b', status: 'ended', start_date: '2025-06-01', end_date: '2026-03-31' },
      { consultant_id: 'b', status: 'active', start_date: '2026-05-01', end_date: null }, // 30 jours
      { consultant_id: 'c', status: 'ended', start_date: '2025-06-01', end_date: '2026-03-31' },
      { consultant_id: 'c', status: 'active', start_date: '2026-04-01', end_date: null }, // enchaînée
    ];
    expect(benchGaps(missions, YEAR_AGO)).toEqual({ averageDays: 20, count: 2 });
  });

  it('computes the renewal rate from decided renewals only', () => {
    expect(renewalStats([{ renewal_status: 'confirmed' }, { renewal_status: 'confirmed' }, { renewal_status: 'not_renewed' }, { renewal_status: 'unknown' }, {}])).toEqual({
      confirmed: 2,
      notRenewed: 1,
      rate: (2 / 3) * 100,
    });
  });
});

describe('capacityForecast', () => {
  const today = new Date(2026, 9, 5); // 5 octobre 2026
  const consultant = (id: string, extra: Record<string, unknown> = {}) => ({ id, status: 'on_mission', first_name: id.toUpperCase(), last_name: 'X', ...extra });
  const mission = (consultant_id: string, start: string, end: string | null, extra: Record<string, unknown> = {}) => ({ consultant_id, status: 'active', start_date: start, end_date: end, ...extra });

  it('should forecast occupancy, endings and bench risk per horizon', () => {
    // Arrange
    const consultants = [consultant('a'), consultant('b'), consultant('c'), consultant('d', { status: 'available' }), consultant('e', { status: 'unavailable' })];
    const missions = [
      mission('a', '2026-01-01', '2026-10-20'), // fin sous 30 j, sans suite → risque
      mission('b', '2026-01-01', '2026-10-25', { renewal_status: 'confirmed' }), // renouvellement confirmé
      mission('c', '2026-01-01', '2026-10-31'), // fin sous 30 j…
      mission('c', '2026-11-02', '2027-06-30'), // …mais suite déjà signée
      mission('d', '2026-11-16', null), // démarre dans 42 jours
    ];

    // Act
    const [d30, d60] = capacityForecast(consultants, missions, today);

    // Assert
    // Au 4 novembre, la suite de c (démarrée le 2) est en cours.
    expect(d30).toMatchObject({ days: 30, capacity: 4, staffed: 1, available: 3, endings: 3, risk: 1, riskNames: ['A X'] });
    expect(d30!.occupancy).toBe(25);
    expect(d60).toMatchObject({ days: 60, staffed: 2, available: 2, endings: 3, risk: 1 });
    expect(d60!.occupancy).toBe(50);
  });

  it('should ignore proposed missions', () => {
    const [d30] = capacityForecast([consultant('a', { status: 'available' })], [mission('a', '2026-10-10', null, { status: 'proposed' })], today, [30]);
    expect(d30).toMatchObject({ staffed: 0, available: 1 });
  });
});
