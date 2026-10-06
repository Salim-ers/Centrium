import { describe, expect, it } from 'vitest';

import { availabilityOf, craOverview, missionPhase, runsInMonth } from '@/lib/portal/consultant-home';

const today = new Date(2026, 9, 5); // 5 octobre 2026

const mission = (id: string, start: string, end: string | null, status: 'active' | 'ended' | 'proposed' = 'active') => ({
  id,
  status,
  start_date: start,
  end_date: end,
});
const sheet = (id: string, missionId: string, month: number, status: string, year = 2026) => ({
  id,
  mission_id: missionId,
  period_month: month,
  period_year: year,
  status: status as 'draft',
});

describe('runsInMonth', () => {
  it('should include a mission that overlaps the month', () => {
    expect(runsInMonth(mission('m', '2026-09-15', '2026-10-02'), 2026, 10)).toBe(true);
    expect(runsInMonth(mission('m', '2026-10-31', null), 2026, 10)).toBe(true);
  });

  it('should exclude a mission outside the month', () => {
    expect(runsInMonth(mission('m', '2026-11-01', null), 2026, 10)).toBe(false);
    expect(runsInMonth(mission('m', '2026-01-01', '2026-09-30'), 2026, 10)).toBe(false);
  });
});

describe('craOverview', () => {
  it('should list current month sheets and flag missing or draft previous month sheets', () => {
    // Arrange
    const missions = [mission('a', '2026-06-01', null), mission('b', '2026-10-01', null), mission('c', '2026-03-01', '2026-09-30', 'ended')];
    const sheets = [sheet('s1', 'a', 10, 'draft'), sheet('s2', 'a', 9, 'submitted')];

    // Act
    const o = craOverview(missions, sheets, today);

    // Assert
    expect(o.current.map((l) => [l.mission.id, l.sheet?.id ?? null])).toEqual([
      ['a', 's1'],
      ['b', null],
    ]);
    // a : septembre transmis ; b : pas encore commencée ; c : terminée fin septembre, CRA absent.
    expect(o.previousDue.map((l) => [l.mission.id, l.sheet])).toEqual([['c', null]]);
    expect(o.prev).toEqual({ year: 2026, month: 9 });
  });

  it('should roll the previous month over the year and return rejected sheets', () => {
    // Arrange
    const missions = [mission('a', '2025-11-01', null)];
    const sheets = [sheet('s1', 'a', 12, 'draft', 2025), sheet('s0', 'a', 11, 'rejected', 2025)];

    // Act
    const o = craOverview(missions, sheets, new Date(2026, 0, 3));

    // Assert
    expect(o.prev).toEqual({ year: 2025, month: 12 });
    expect(o.previousDue.map((l) => l.sheet?.id)).toEqual(['s1']);
    expect(o.rejected.map((s) => s.id)).toEqual(['s0']);
  });

  it('should ignore missions that are not active', () => {
    const o = craOverview([mission('p', '2026-09-01', null, 'proposed')], [], today);
    expect(o.current).toEqual([]);
    expect(o.previousDue).toEqual([]);
  });
});

describe('availabilityOf', () => {
  const profile = (status: string, available_from: string | null = null) => ({ status, available_from });

  it('should report the latest end date of running missions', () => {
    const r = availabilityOf(profile('on_mission'), [mission('a', '2026-01-01', '2026-12-31'), mission('b', '2026-09-01', '2027-02-28')], today);
    expect(r.availability).toEqual({ kind: 'on_mission', until: '2027-02-28' });
  });

  it('should report an open-ended mission without a date', () => {
    const r = availabilityOf(profile('on_mission'), [mission('a', '2026-01-01', '2026-12-31'), mission('b', '2026-09-01', null)], today);
    expect(r.availability).toEqual({ kind: 'on_mission', until: null });
  });

  it('should fall back on the profile when no mission is running or planned', () => {
    expect(availabilityOf(profile('available', '2026-11-02'), [], today).availability).toEqual({ kind: 'available_from', date: '2026-11-02' });
    expect(availabilityOf(profile('available', '2026-09-01'), [], today).availability).toEqual({ kind: 'available' });
    expect(availabilityOf(profile('unavailable', '2026-12-01'), [], today).availability).toEqual({ kind: 'unavailable', date: '2026-12-01' });
    expect(availabilityOf(null, [], today).availability).toEqual({ kind: 'available' });
  });

  it('should not trust an on_mission profile status without a running mission', () => {
    // Le trigger passe la fiche « en mission » dès qu'une mission est active, même à venir.
    const r = availabilityOf(profile('on_mission'), [mission('late', '2027-01-04', null), mission('soon', '2026-11-02', null), mission('old', '2025-01-01', '2025-12-31', 'ended')], today);
    expect(r.availability).toEqual({ kind: 'upcoming', start: '2026-11-02' });
    expect(r.next?.id).toBe('soon');
    expect(availabilityOf(profile('on_mission'), [], today).availability).toEqual({ kind: 'available' });
  });

  it('should keep the next mission when one is running', () => {
    const r = availabilityOf(profile('on_mission'), [mission('now', '2026-06-01', '2026-10-31'), mission('then', '2026-11-02', null)], today);
    expect(r.availability).toEqual({ kind: 'on_mission', until: '2026-10-31' });
    expect(r.next?.id).toBe('then');
  });
});

describe('missionPhase', () => {
  it('should tell upcoming, running and ended missions apart from their dates', () => {
    expect(missionPhase(mission('m', '2026-10-27', '2027-04-04'), today)).toEqual({ kind: 'upcoming', inDays: 22 });
    expect(missionPhase(mission('m', '2026-06-01', '2026-10-17'), today)).toEqual({ kind: 'running', daysLeft: 12 });
    expect(missionPhase(mission('m', '2026-06-01', null), today)).toEqual({ kind: 'running', daysLeft: null });
    // Encore « active » côté ESN, mais la date de fin est passée.
    expect(missionPhase(mission('m', '2026-06-01', '2026-09-30'), today)).toEqual({ kind: 'ended', on: '2026-09-30' });
    expect(missionPhase(mission('m', '2026-03-01', '2026-09-26', 'ended'), today)).toEqual({ kind: 'ended', on: '2026-09-26' });
    expect(missionPhase(mission('m', '2026-11-01', null, 'proposed'), today)).toEqual({ kind: 'other' });
  });
});
