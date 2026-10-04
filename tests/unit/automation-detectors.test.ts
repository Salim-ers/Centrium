import { describe, expect, it } from 'vitest';

import { DEFAULT_ORG_NOTIFICATION_SETTINGS } from '@/lib/alerts/config';
import { detectMissionEndings, planQuoteExpiryTasks, planStaleOpportunityTasks } from '@/lib/alerts/detectors';

const TODAY = new Date('2026-10-04T08:00:00Z');
const names = new Map([['c1', 'Camille Martin']]);
const mission = (end: string, extra: Record<string, unknown> = {}) => ({
  id: 'm1',
  title: 'Refonte SI',
  consultant_id: 'c1',
  status: 'active',
  start_date: '2026-01-05',
  end_date: end,
  owner_id: 'u-bm',
  renewal_status: 'unknown',
  ...extra,
});

describe('detectMissionEndings', () => {
  it('opens one alert per crossed window, addressed to the mission owner', () => {
    // Arrange: ends in 75 days → 90-day window
    const [a] = detectMissionEndings([mission('2026-12-18')], names, TODAY);

    // Assert
    expect(a?.dedupe_key).toBe('mission-ending:m1:90');
    expect(a?.assignee_id).toBe('u-bm');
    expect(a?.priority).toBe('low');
  });

  it('moves to the next window as the end approaches', () => {
    expect(detectMissionEndings([mission('2026-10-30')], names, TODAY)[0]?.dedupe_key).toBe('mission-ending:m1:30');
    expect(detectMissionEndings([mission('2026-10-14')], names, TODAY)[0]?.dedupe_key).toBe('mission-ending:m1:15');
  });

  it('ignores far, past, confirmed-renewal and inactive missions', () => {
    expect(detectMissionEndings([mission('2027-06-30')], names, TODAY)).toHaveLength(0);
    expect(detectMissionEndings([mission('2026-09-30')], names, TODAY)).toHaveLength(0);
    expect(detectMissionEndings([mission('2026-10-20', { renewal_status: 'confirmed' })], names, TODAY)).toHaveLength(0);
    expect(detectMissionEndings([mission('2026-10-20', { status: 'proposed' })], names, TODAY)).toHaveLength(0);
  });
});

describe('planQuoteExpiryTasks', () => {
  const quote = (valid_until: string | null, status = 'sent') => ({ id: 'q1', number: 'DEV-2026-0007', title: 'Renfort', status, valid_until, created_by: 'u-author' });

  it('plans a follow-up task for a sent quote expiring within 7 days', () => {
    const [t] = planQuoteExpiryTasks([quote('2026-10-09')], TODAY);
    expect(t?.assignee_id).toBe('u-author');
    expect(t?.dedupe_key).toBe('auto:quote-expiry:q1:2026-10-09');
    expect(t?.title).toBe('Relancer le devis DEV-2026-0007 avant échéance');
  });

  it('skips drafts, decided quotes, expired ones and far deadlines', () => {
    expect(planQuoteExpiryTasks([quote('2026-10-09', 'draft'), quote('2026-10-09', 'accepted')], TODAY)).toHaveLength(0);
    expect(planQuoteExpiryTasks([quote('2026-10-01'), quote('2026-10-30'), quote(null)], TODAY)).toHaveLength(0);
  });
});

describe('planStaleOpportunityTasks', () => {
  it('keys the task on the last interaction so a completed task is not recreated', () => {
    const opp = { id: 'o1', title: 'Data platform', status: 'discussion', next_follow_up: null, last_interaction: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', owner_id: 'u-bm' };
    const [t] = planStaleOpportunityTasks([opp], DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY);
    expect(t?.dedupe_key).toBe('auto:opp-stale:o1:2026-09-01:');
    expect(t?.assignee_id).toBe('u-bm');
    expect(t?.due_date).toBe('2026-10-04');
  });

  it('does not plan tasks for closed or recently touched opportunities', () => {
    const base = { id: 'o2', title: 'X', next_follow_up: null, owner_id: null };
    expect(planStaleOpportunityTasks([{ ...base, status: 'won', last_interaction: '2026-01-01', updated_at: '2026-01-01' }], DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY)).toHaveLength(0);
    expect(planStaleOpportunityTasks([{ ...base, status: 'new', last_interaction: '2026-10-02', updated_at: '2026-10-02' }], DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY)).toHaveLength(0);
  });
});
