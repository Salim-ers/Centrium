import { describe, expect, it } from 'vitest';

import {
  extendedPlannedDays,
  isoAddDays,
  isoDiffDays,
  proposedExtensionEnd,
  reminderDueDate,
  renewalReminderKey,
  renewalStage,
} from '@/lib/missions/renewal';
import { missionTimeline } from '@/lib/missions/timeline';

const TODAY = '2026-10-05';
const active = (end: string | null, renewal_status: string | null = 'unknown') => ({ status: 'active', end_date: end, renewal_status });

describe('renewalStage', () => {
  it('asks when an active mission ends within 30 days and nothing is decided', () => {
    expect(renewalStage(active('2026-10-20'), TODAY)).toBe('ask');
    expect(renewalStage(active('2026-11-04', 'likely'), TODAY)).toBe('ask');
    expect(renewalStage(active('2026-10-05', null), TODAY)).toBe('ask');
  });

  it('follows the decision once taken', () => {
    expect(renewalStage(active('2026-10-20', 'confirmed'), TODAY)).toBe('extend');
    expect(renewalStage(active('2026-10-20', 'not_renewed'), TODAY)).toBe('ending');
  });

  it('stays quiet outside the 30-day window or for inactive missions', () => {
    expect(renewalStage(active('2026-11-05'), TODAY)).toBeNull();
    expect(renewalStage(active('2026-10-04'), TODAY)).toBeNull();
    expect(renewalStage(active(null), TODAY)).toBeNull();
    expect(renewalStage({ status: 'ended', end_date: '2026-10-20', renewal_status: 'unknown' }, TODAY)).toBeNull();
  });
});

describe('extension helpers', () => {
  it('proposes the same day three months later, keeping month ends', () => {
    expect(proposedExtensionEnd('2026-10-20')).toBe('2027-01-20');
    expect(proposedExtensionEnd('2026-11-30')).toBe('2027-02-28');
    expect(proposedExtensionEnd('2026-08-31', 1)).toBe('2026-09-30');
    expect(proposedExtensionEnd('2027-01-31', 1)).toBe('2027-02-28');
  });

  it('adds the business days of the extension to explicit planned days only', () => {
    // 2026-10-31 (samedi) → 2026-11-06 (vendredi) : 5 jours ouvrés (2 → 6 nov.).
    expect(extendedPlannedDays(100, '2026-10-31', '2026-11-06')).toBe(105);
    expect(extendedPlannedDays(null, '2026-10-31', '2026-11-06')).toBeNull();
    expect(extendedPlannedDays(100, '2026-10-31', '2026-10-31')).toBe(100);
  });

  it('computes ISO day arithmetic without timezone drift', () => {
    expect(isoAddDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(isoAddDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(isoDiffDays('2026-10-05', '2026-10-20')).toBe(15);
    expect(isoDiffDays('2026-10-05', '2026-10-01')).toBe(-4);
  });
});

describe('renewal reminder', () => {
  it('is due within a week, at the latest 5 days before the end, never in the past', () => {
    expect(reminderDueDate(TODAY, '2026-11-01')).toBe('2026-10-12');
    expect(reminderDueDate(TODAY, '2026-10-14')).toBe('2026-10-09');
    expect(reminderDueDate(TODAY, '2026-10-07')).toBe(TODAY);
  });

  it('uses one dedupe key per mission', () => {
    expect(renewalReminderKey('m-1')).toBe('renewal-check:m-1');
  });
});

describe('missionTimeline', () => {
  const sheet = (y: number, m: number, status: string, days = 18) => ({
    id: `${y}-${m}`,
    period_year: y,
    period_month: m,
    status,
    days_worked: days,
    days_validated: status === 'client_validated' ? days : 0,
  });

  it('marks each month with its timesheet state', () => {
    const months = missionTimeline('2026-06-15', '2026-12-31', [sheet(2026, 6, 'client_validated', 12), sheet(2026, 7, 'client_validated'), sheet(2026, 8, 'submitted')], TODAY);
    expect(months.map((m) => `${m.month}:${m.state}`)).toEqual(['6:validated', '7:validated', '8:submitted', '9:missing', '10:current', '11:future', '12:future']);
    expect(months[0].days).toBe(12);
    expect(months[2].days).toBe(18);
    expect(months.find((m) => m.isCurrent)?.month).toBe(10);
  });

  it('runs to two months ahead without an end date', () => {
    const months = missionTimeline('2026-09-01', null, [], TODAY);
    expect(months.map((m) => m.month)).toEqual([9, 10, 11, 12]);
  });

  it('caps long missions to 24 months around today', () => {
    const months = missionTimeline('2022-01-01', '2028-12-31', [], TODAY);
    expect(months).toHaveLength(24);
    expect(months.some((m) => m.isCurrent)).toBe(true);
  });
});
