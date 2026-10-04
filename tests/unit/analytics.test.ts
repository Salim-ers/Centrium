import { describe, expect, it } from 'vitest';

import { lostReasons, quoteStats, revenueByConsultant, sourceBreakdown, timesheetPunctuality, winRate } from '@/lib/pilotage/analytics';

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
