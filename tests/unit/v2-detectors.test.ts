import { describe, expect, it } from 'vitest';

import { detectConsultantMatches, detectTimesheetsToValidate, type MatchConsultantRow, type MatchOpportunityRow } from '@/lib/alerts/v2-detectors';
import type { ConsultantSkill } from '@/types';

const TODAY = new Date('2026-10-04T08:00:00Z');
const names = new Map([['c1', 'Camille Martin']]);

describe('detectTimesheetsToValidate', () => {
  const ts = (submitted_at: string | null, status = 'submitted') => ({ id: 't1', status, submitted_at, period_month: 9, period_year: 2026, consultant_id: 'c1' });

  it('raises an alert once the grace period has passed', () => {
    const [a] = detectTimesheetsToValidate([ts('2026-10-01T10:00:00Z')], names, TODAY);
    expect(a?.dedupe_key).toBe('timesheet-validate:t1');
    expect(a?.title).toBe('CRA de septembre 2026 à valider — Camille Martin');
    expect(a?.priority).toBe('medium');
  });

  it('escalates after a week and ignores fresh, draft or validated timesheets', () => {
    expect(detectTimesheetsToValidate([ts('2026-09-20T10:00:00Z')], names, TODAY)[0]?.priority).toBe('high');
    expect(detectTimesheetsToValidate([ts('2026-10-04T07:00:00Z')], names, TODAY)).toHaveLength(0);
    expect(detectTimesheetsToValidate([ts('2026-09-01T10:00:00Z', 'client_validated'), ts(null)], names, TODAY)).toHaveLength(0);
  });
});

describe('detectConsultantMatches', () => {
  const consultant = (over: Partial<MatchConsultantRow> = {}): MatchConsultantRow => ({
    id: 'c1',
    first_name: 'Camille',
    last_name: 'Martin',
    job_title: 'Data engineer',
    seniority: 'senior',
    years_experience: 8,
    status: 'available',
    available_from: null,
    current_mission_end: null,
    daily_rate_eur: 650,
    city: 'Lyon',
    mobility: null,
    languages: [],
    is_prospect: false,
    contract_type: 'cdi',
    owner_id: 'u-bm',
    ...over,
  });
  const opp = (over: Partial<MatchOpportunityRow> = {}): MatchOpportunityRow => ({
    id: 'o1-aaaaaaaa',
    organization_id: 'org',
    title: 'Lead data',
    company_id: null,
    contact_id: null,
    owner_id: null,
    daily_rate_eur: 700,
    duration_months: 6,
    required_skills: ['Python', 'AWS'],
    start_date: '2026-10-15',
    location: 'Lyon',
    status: 'discussion',
    archived: false,
    ...over,
  });
  const skills = new Map<string, ConsultantSkill[]>([
    [
      'c1',
      ['Python', 'AWS'].map((name, i) => ({ id: `s${i}`, consultant_id: 'c1', category: 'tech', name, level: 5, years: 6, is_highlighted: true, created_at: '' })) as ConsultantSkill[],
    ],
  ]);

  it('links an available consultant to a compatible open opportunity, addressed to their manager', () => {
    const [a] = detectConsultantMatches([consultant()], [opp()], skills, TODAY, 50);
    expect(a?.kind).toBe('consultant_available');
    expect(a?.assignee_id).toBe('u-bm');
    expect(a?.link).toBe('/opportunities/o1-aaaaaaaa');
    expect(a?.dedupe_key).toBe('consultant-match:c1:o1-aaaaa');
  });

  it('ignores unavailable consultants, closed or skill-less opportunities', () => {
    expect(detectConsultantMatches([consultant({ status: 'on_mission', current_mission_end: '2027-06-30' })], [opp()], skills, TODAY, 50)).toHaveLength(0);
    expect(detectConsultantMatches([consultant()], [opp({ status: 'won' }), opp({ id: 'o2', required_skills: [] })], skills, TODAY, 50)).toHaveLength(0);
  });

  it('never matches a consultant on skills they do not have', () => {
    const none = new Map<string, ConsultantSkill[]>();
    expect(detectConsultantMatches([consultant()], [opp()], none, TODAY, 75)).toHaveLength(0);
  });
});
