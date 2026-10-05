import { describe, expect, it } from 'vitest';

import { benchRows, summarizeBench } from '@/lib/pilotage/bench';

const today = new Date(2026, 9, 5); // lundi 5 octobre 2026

const c = (id: string, extra: Record<string, unknown> = {}) => ({ id, first_name: id.toUpperCase(), last_name: 'Test', job_title: 'Dev', status: 'available', archived: false, is_prospect: false, available_from: null, ...extra });
const m = (consultant_id: string, start: string, end: string | null, status = 'active') => ({ id: `m-${consultant_id}-${start}`, consultant_id, company_id: null, status, start_date: start, end_date: end, daily_rate_eur: 600 });

describe('benchRows', () => {
  it('should keep staffable consultants without a mission covering today', () => {
    // Arrange
    const consultants = [
      c('a'),
      c('b'),
      c('c', { available_from: '2026-09-15' }),
      c('d', { status: 'unavailable' }),
      c('e', { is_prospect: true }),
      c('f', { archived: true }),
    ];
    const missions = [m('a', '2026-03-01', '2026-09-30', 'ended'), m('b', '2026-09-01', '2026-12-31')];

    // Act
    const rows = benchRows(consultants, missions, today);

    // Assert
    expect(rows.map((r) => [r.consultant.id, r.since])).toEqual([
      ['a', '2026-10-01'],
      ['c', '2026-09-15'],
    ]);
  });

  it('should ignore proposed missions and future availability dates', () => {
    const rows = benchRows([c('g', { available_from: '2026-11-02' })], [m('g', '2026-10-01', null, 'proposed')], today);
    expect(rows).toEqual([{ consultant: expect.objectContaining({ id: 'g' }), since: null }]);
  });
});

describe('summarizeBench', () => {
  it('should compute durations, known costs and matches, longest bench first', () => {
    // Arrange
    const rows = benchRows([c('a'), c('c', { available_from: '2026-09-15' }), c('h')], [m('a', '2026-03-01', '2026-09-30', 'ended')], today);

    // Act
    const s = summarizeBench(rows, { today, costOf: (id) => (id === 'a' ? 500 : null), matches: new Map([['c', 2]]), compatibleOpportunities: 3 });

    // Assert
    expect(s.count).toBe(3);
    expect(s.people.map((p) => [p.id, p.days, p.cost, p.matches])).toEqual([
      ['c', 20, null, 2],
      ['a', 4, 1500, 0], // jeu. 1, ven. 2, lun. 5 octobre
      ['h', null, null, 0],
    ]);
    expect(s.avgDays).toBe(12);
    expect(s.estimatedCost).toBe(1500);
    expect(s.costKnown).toBe(1);
    expect(s.compatibleOpportunities).toBe(3);
  });

  it('should report no cost when no daily cost is known', () => {
    const s = summarizeBench(benchRows([c('a')], [], today), { today });
    expect(s.estimatedCost).toBeNull();
    expect(s.avgDays).toBeNull();
  });
});
