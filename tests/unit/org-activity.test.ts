import { describe, expect, it } from 'vitest';

import { buildActivity, type ActivityRows } from '@/lib/activity/org-activity';

const empty: ActivityRows = { opportunities: [], positions: [], missions: [], timesheets: [], quotes: [], requests: [], consultants: [], clients: [] };
const SINCE = '2026-09-05T00:00:00.000Z';

describe('buildActivity', () => {
  it('should turn business rows into a dated timeline, newest first', () => {
    // Arrange
    const rows: ActivityRows = {
      ...empty,
      opportunities: [{ id: 'o1', title: 'Lead dev React', status: 'won', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-10-02T10:00:00Z' }],
      positions: [{ opportunity_id: 'o2', consultant_id: 'c1', sent_at: '2026-10-04T08:00:00Z', consultants: { first_name: 'Alex', last_name: 'Martin' }, opportunities: { title: 'DevOps' } }],
      timesheets: [{ id: 't1', period_month: 9, period_year: 2026, submitted_at: '2026-10-01T09:00:00Z', validated_at: '2026-10-03T09:00:00Z', consultant: { first_name: 'Sarah', last_name: 'Petit' } }],
      quotes: [{ id: 'q1', number: 'DEV-2026-0042', title: 'Renfort data', status: 'sent', sent_at: '2026-09-20T09:00:00Z', decided_at: null }],
      clients: [{ id: 'k1', name: 'Nordal', created_at: '2026-09-01T09:00:00Z' }],
    };

    // Act
    const events = buildActivity(rows, SINCE, '2026-10-05T12:00:00Z');

    // Assert
    expect(events.map((e) => e.kind)).toEqual(['positioned', 'timesheet_validated', 'opportunity_won', 'timesheet_submitted', 'quote_sent']);
    expect(events[0]).toMatchObject({ detail: 'Alex Martin · DevOps', href: '/opportunities/o2?tab=matching', group: 'commercial' });
    expect(events[1]).toMatchObject({ detail: 'Sarah Petit · Septembre 2026', group: 'cra' });
  });

  it('should ignore facts dated after the end of the window', () => {
    const rows: ActivityRows = { ...empty, missions: [{ id: 'm1', title: 'Future', created_at: '2026-11-29T10:00:00Z', consultants: null }] };
    expect(buildActivity(rows, SINCE, '2026-10-05T12:00:00Z')).toEqual([]);
  });

  it('should skip undated facts and facts older than the window', () => {
    const rows: ActivityRows = {
      ...empty,
      quotes: [{ id: 'q2', number: null, title: 'Brouillon', status: 'draft', sent_at: null, decided_at: null }],
      consultants: [{ id: 'c2', first_name: 'Léa', last_name: 'Dubois', created_at: '2026-01-01T00:00:00Z' }],
    };
    expect(buildActivity(rows, SINCE)).toEqual([]);
  });
});
