import { describe, expect, it } from 'vitest';
import { isoWeek, mergeDays, nextFreeDate, planningWindow, segmentIn } from '@/lib/staffing/planning';

const TODAY = new Date(2026, 9, 7); // mercredi 7 octobre 2026

describe('planning de staffing', () => {
  it('fenêtre de 12 semaines à partir du lundi', () => {
    const w = planningWindow('weeks', TODAY);
    expect(w.start).toBe('2026-10-05');
    expect(w.end).toBe('2026-12-27');
    expect(w.columns).toHaveLength(12);
    expect(w.columns[0]!.label.fr).toBe('S41');
  });

  it('fenêtre de 6 mois', () => {
    const w = planningWindow('months', TODAY);
    expect(w.start).toBe('2026-10-01');
    expect(w.end).toBe('2027-03-31');
    expect(w.days).toBe(182);
  });

  it('positionne et tronque les segments', () => {
    const w = planningWindow('weeks', TODAY);
    expect(segmentIn(w, '2026-10-05', '2026-10-11')).toEqual({ left: 0, width: (7 / 84) * 100, clippedStart: false, clippedEnd: false });
    const open = segmentIn(w, '2026-09-01', null)!;
    expect(open.left).toBe(0);
    expect(open.width).toBe(100);
    expect(open.clippedStart).toBe(true);
    expect(open.clippedEnd).toBe(true);
    expect(segmentIn(w, '2027-01-01', '2027-02-01')).toBeNull();
    expect(segmentIn(w, '2026-01-01', '2026-02-01')).toBeNull();
  });

  it('fusionne les congés en plages, week-end compris', () => {
    expect(mergeDays(['2026-10-09', '2026-10-12', '2026-10-13', '2026-10-20'])).toEqual([
      { start: '2026-10-09', end: '2026-10-13' },
      { start: '2026-10-20', end: '2026-10-20' },
    ]);
  });

  it('calcule la prochaine disponibilité', () => {
    expect(nextFreeDate([], '2026-10-07')).toBe('2026-10-07');
    expect(nextFreeDate([{ start_date: '2026-09-01', end_date: '2026-11-30', status: 'active' }], '2026-10-07')).toBe('2026-12-01');
    expect(nextFreeDate([{ start_date: '2026-09-01', end_date: null, status: 'active' }], '2026-10-07')).toBeNull();
    expect(isoWeek('2027-01-01')).toBe(53);
  });
});
