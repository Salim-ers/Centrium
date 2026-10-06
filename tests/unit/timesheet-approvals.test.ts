import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { loadTimesheets, missingExportRows, missionLabel, previousPeriod, summarizeTimesheets, timesheetExportRows, type TimesheetRow } from '@/lib/timesheets/approvals';

// Client Supabase factice : chaque table renvoie ses lignes quels que soient
// les filtres (le module filtre lui-même ce qui compte ici).
function fakeSupabase(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'lte', 'gte', 'order', 'limit']) builder[m] = () => builder;
      builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
      return builder;
    },
  } as unknown as SupabaseClient;
}

const TODAY = new Date(2026, 9, 5); // 5 octobre 2026

const row = (over: Partial<TimesheetRow>): TimesheetRow => ({
  id: 't',
  mission_id: 'm1',
  consultant_id: 'c1',
  period_month: 9,
  period_year: 2026,
  days_worked: 20,
  days_validated: 0,
  status: 'submitted',
  submitted_at: '2026-10-01T09:00:00Z',
  validated_at: null,
  rejection_reason: null,
  consultant: { first_name: 'Inès', last_name: 'Morel' },
  mission: { title: 'Data', company_id: null, companies: null },
  ...over,
});

describe('previousPeriod', () => {
  it('returns the elapsed month, across years', () => {
    expect(previousPeriod(TODAY)).toEqual({ month: 9, year: 2026 });
    expect(previousPeriod(new Date(2027, 0, 10))).toEqual({ month: 12, year: 2026 });
  });
});

describe('summarizeTimesheets', () => {
  it('counts to approve, missing and approved this month with their days', () => {
    // Arrange
    const data = {
      rows: [
        row({ id: 'a', status: 'submitted', days_worked: 20 }),
        row({ id: 'b', status: 'submitted', days_worked: 18 }),
        row({ id: 'c', status: 'client_validated', days_validated: 21, validated_at: '2026-10-02T10:00:00Z' }),
        row({ id: 'd', status: 'client_validated', days_validated: 19, validated_at: '2026-09-03T10:00:00Z', period_month: 8 }),
        row({ id: 'e', status: 'draft' }),
      ],
      missing: [{ mission_id: 'm9', title: 'x', consultant: 'y', client: null, month: 9, year: 2026 }],
    };
    // Act
    const k = summarizeTimesheets(data, TODAY);
    // Assert
    expect(k).toEqual({ pending: 2, pendingDays: 38, missing: 1, validatedThisMonth: 1, validatedDaysThisMonth: 21 });
  });
});

describe('loadTimesheets', () => {
  it('flags active missions without a submitted timesheet for the elapsed month', async () => {
    const supabase = fakeSupabase({
      timesheets: [
        row({ id: 'a', mission_id: 'm1', status: 'submitted' }),
        row({ id: 'b', mission_id: 'm2', status: 'draft' }),
      ],
      missions: [
        { id: 'm1', title: 'Mission 1', end_date: null, consultants: { first_name: 'Inès', last_name: 'Morel' }, companies: { name: 'Nordal' } },
        { id: 'm2', title: 'Mission 2', end_date: '2026-12-31', consultants: { first_name: 'Yanis', last_name: 'Benali' }, companies: null },
        { id: 'm3', title: 'Mission 3', end_date: '2026-08-31', consultants: null, companies: null },
      ],
    });
    const data = await loadTimesheets(supabase, 'org', TODAY);
    expect(data.rows).toHaveLength(2);
    // m1 a soumis ; m2 n'a qu'un brouillon ; m3 s'est terminée avant septembre.
    expect(data.missing).toEqual([{ mission_id: 'm2', title: 'Mission 2', consultant: 'Yanis Benali', client: null, month: 9, year: 2026 }]);
  });
});

describe('CRA : libellés et export', () => {
  it('ne répète pas le client déjà présent dans l’intitulé de mission', () => {
    expect(missionLabel('Data engineer · Nordal Assurances', 'Nordal Assurances')).toBe('Data engineer · Nordal Assurances');
    expect(missionLabel('Data engineer', 'Nordal Assurances')).toBe('Data engineer · Nordal Assurances');
    expect(missionLabel('Data engineer', null)).toBe('Data engineer');
    expect(missionLabel(null, 'Nordal')).toBe('Nordal');
  });

  it('exporte une ligne par CRA, jours validés seulement une fois validé', () => {
    const out = timesheetExportRows([
      row({ status: 'submitted', days_worked: 18, submitted_at: '2026-10-02T09:00:00Z' }),
      row({ status: 'client_validated', days_worked: 20, days_validated: 19, validated_at: '2026-10-04T10:00:00Z' }),
    ]);
    expect(out[0]).toMatchObject({ jours_declares: 18, jours_valides: null, statut: 'À valider', soumis_le: '2026-10-02' });
    expect(out[1]).toMatchObject({ jours_declares: 20, jours_valides: 19, statut: 'Validé', valide_le: '2026-10-04' });
  });

  it('exporte les CRA manquants avec leur période', () => {
    expect(missingExportRows([{ mission_id: 'm1', title: 'Mission 1', consultant: 'Inès Morel', client: 'Nordal', month: 9, year: 2026 }])).toEqual([
      { consultant: 'Inès Morel', mission: 'Mission 1', client: 'Nordal', periode: '2026-09' },
    ]);
  });
});
