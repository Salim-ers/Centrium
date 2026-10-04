import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getExecutiveDashboard } from '@/lib/services/dashboard.service';
import type { Permission } from '@/lib/auth/permissions';

// Client Supabase factice : chaque table renvoie ses lignes, quels que
// soient les filtres (le service ne fait que lire). Les tables lues sont
// enregistrées pour vérifier qu'une donnée non autorisée n'est pas demandée.
function fakeSupabase(tables: Record<string, unknown[]>) {
  const read: string[] = [];
  const client = {
    from(table: string) {
      read.push(table);
      const rows = tables[table] ?? [];
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'or', 'gte', 'lte', 'like', 'not', 'order', 'limit']) builder[m] = () => builder;
      builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null, count: rows.length });
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, read };
}

const TODAY = new Date(2026, 9, 5); // 5 octobre 2026
const ALL: Permission[] = [
  'dashboard.view',
  'clients.view',
  'opportunities.view',
  'consultants.view',
  'consultants.financials',
  'staffing.view',
  'missions.view',
  'timesheets.view',
  'documents.view',
  'finance.view',
  'finance.edit',
  'analytics.view',
];

const fixtures = {
  missions: [
    { id: 'm1', consultant_id: 'c1', company_id: 'co1', title: 'Lead dev', status: 'active', start_date: '2026-07-01', end_date: '2026-10-20', daily_rate_eur: 650, created_at: '2026-09-28T10:00:00Z' },
    { id: 'm2', consultant_id: 'c2', company_id: 'co2', title: 'DevOps', status: 'active', start_date: '2026-01-05', end_date: '2027-03-12', daily_rate_eur: 600, created_at: '2026-01-02T10:00:00Z' },
  ],
  consultants: [
    { id: 'c1', first_name: 'Camille', last_name: 'Roux', status: 'on_mission', archived: false, is_prospect: false, available_from: null, current_mission_end: '2026-10-20', created_at: '2025-01-01T00:00:00Z' },
    { id: 'c2', first_name: 'Hugo', last_name: 'Lambert', status: 'on_mission', archived: false, is_prospect: false, available_from: null, current_mission_end: '2027-03-12', created_at: '2025-01-01T00:00:00Z' },
    { id: 'c3', first_name: 'Yanis', last_name: 'Benali', status: 'available', archived: false, is_prospect: false, available_from: null, current_mission_end: null, created_at: '2026-10-01T00:00:00Z' },
  ],
  timesheets: [
    { id: 't1', mission_id: 'm1', consultant_id: 'c1', period_year: 2026, period_month: 9, days_validated: 20, days_worked: 20, status: 'client_validated', validated_at: '2026-10-02T09:00:00Z' },
    { id: 't2', mission_id: 'm2', consultant_id: 'c2', period_year: 2026, period_month: 9, days_validated: 10, days_worked: 10, status: 'client_validated', validated_at: '2026-10-01T09:00:00Z' },
  ],
  opportunities: [
    { id: 'o1', title: 'Data engineer', status: 'negotiation', expected_revenue: 80000, probability: 50, updated_at: '2026-10-01T00:00:00Z', created_at: '2026-09-30T00:00:00Z', archived: false },
    { id: 'o2', title: 'QA', status: 'won', expected_revenue: 30000, probability: 100, updated_at: '2026-10-03T00:00:00Z', created_at: '2026-08-01T00:00:00Z', archived: false },
  ],
  mission_financials: [{ mission_id: 'm1', daily_cost_eur: 430 }],
  consultant_financials: [{ consultant_id: 'c2', daily_cost_eur: 420 }],
  companies: [
    { id: 'co1', name: 'Nordal Assurances' },
    { id: 'co2', name: 'Helio Retail' },
  ],
  quotes: [],
  client_requests: [],
  invoices: [],
  alerts: [],
};

describe('getExecutiveDashboard', () => {
  it('aggregates real rows: clients share and margin, missions, staffing and activity', async () => {
    // Arrange
    const { client } = fakeSupabase(fixtures);

    // Act
    const d = await getExecutiveDashboard(client, { organizationId: 'org', can: (p) => ALL.includes(p) }, TODAY);

    // Assert — clients : 20 × 650 = 13 000 € et 10 × 600 = 6 000 €
    expect(d.clients.map((c) => [c.name, c.revenue])).toEqual([
      ['Nordal Assurances', 13000],
      ['Helio Retail', 6000],
    ]);
    expect(d.clients[0]!.share).toBeCloseTo(68.4, 1);
    expect(d.clients[0]!.marginPct).toBeCloseTo(33.8, 1); // (650 − 430) / 650

    // Missions : la plus proche de son échéance d'abord, marge connue
    expect(d.missions[0]!.client).toBe('Nordal Assurances');
    expect(d.missions[0]!.daysLeft).toBe(15);
    expect(d.missions[0]!.marginPct).toBeCloseTo(33.8, 1);

    // Staffing : fin sous 30 jours → « soon », sans mission → « available »
    const byName = new Map(d.staffing.map((r) => [r.name, r]));
    expect(byName.get('Camille Roux')!.status).toBe('soon');
    expect(byName.get('Yanis Benali')!.status).toBe('available');
    expect(d.staffing[0]!.status).toBe('soon');

    // Activité : événements métier datés, du plus récent au plus ancien
    expect(d.activity.map((a) => a.kind)).toContain('opportunity_won');
    expect(d.activity.map((a) => a.kind)).toContain('timesheet_validated');
    const dates = d.activity.map((a) => a.at);
    expect([...dates].sort().reverse()).toEqual(dates);

    // Série : 11 mois passés + courant + 3 de prévision
    expect(d.series).toHaveLength(15);
  });

  it('never returns revenue or margin to a role without financial access', async () => {
    // Arrange
    const { client, read } = fakeSupabase(fixtures);
    const limited: Permission[] = ['dashboard.view', 'missions.view', 'staffing.view', 'consultants.view'];

    // Act
    const d = await getExecutiveDashboard(client, { organizationId: 'org', can: (p) => limited.includes(p) }, TODAY);

    // Assert
    expect(d.visibility.revenue).toBe(false);
    expect(d.series).toEqual([]);
    expect(d.clients).toEqual([]);
    expect(d.summary.kpis.bookedRevenue).toBe(0);
    expect(d.summary.kpis.marginPct).toBeNull();
    expect(d.missions.every((m) => m.marginPct === null)).toBe(true);
    expect(read).not.toContain('mission_financials');
    expect(read).not.toContain('consultant_financials');
  });

  it('returns empty blocks, not invented values, for an empty organisation', async () => {
    // Arrange
    const { client } = fakeSupabase({});

    // Act
    const d = await getExecutiveDashboard(client, { organizationId: 'org', can: (p) => ALL.includes(p) }, TODAY);

    // Assert
    expect(d.staffing).toEqual([]);
    expect(d.missions).toEqual([]);
    expect(d.clients).toEqual([]);
    expect(d.activity).toEqual([]);
    expect(d.summary.kpis.bookedRevenue).toBe(0);
    expect(d.summary.kpis.occupancyRate).toBeNull();
  });
});
