import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { loadPrefacturation, stageOf } from '@/lib/finance/prefactures';
import { DEFAULT_TARGET_MARGIN_PCT, loadFinance } from '@/lib/pilotage/load-finance';

// Client Supabase factice : renvoie les lignes de la table quel que soit le
// filtre ; pour `invoices`, la requête qui ne lit que `timesheet_id` reçoit
// la liste des liens CRA ↔ préfacture.
function fakeSupabase(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      let columns = '*';
      const builder: Record<string, unknown> = {};
      builder.select = (c: string) => {
        columns = c;
        return builder;
      };
      for (const m of ['eq', 'in', 'not', 'gte', 'lte', 'order', 'limit']) builder[m] = () => builder;
      builder.then = (resolve: (v: unknown) => unknown) => {
        const key = table === 'invoices' && columns === 'timesheet_id' ? 'invoice_links' : table;
        return resolve({ data: tables[key] ?? [], error: null });
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

const TODAY = new Date(2026, 9, 5); // 5 octobre 2026

describe('stageOf', () => {
  it('follows the pre-invoicing cycle', () => {
    expect(stageOf({ status: 'draft', validated_at: null })).toBe('review');
    expect(stageOf({ status: 'draft', validated_at: '2026-10-02T10:00:00Z' })).toBe('ready');
    expect(stageOf({ status: 'draft', validated_at: '2026-10-02T10:00:00Z', export_status: 'exported' })).toBe('done');
    expect(stageOf({ status: 'sent', validated_at: '2026-10-02T10:00:00Z' })).toBe('done');
    expect(stageOf({ status: 'cancelled', validated_at: null })).toBe('done');
  });
});

describe('loadPrefacturation', () => {
  it('lists recent approved timesheets that have no client pre-invoice, with days × rate', async () => {
    // Arrange
    const ts = (id: string, month: number, days: number) => ({
      id,
      period_month: month,
      period_year: 2026,
      days_validated: days,
      days_worked: days,
      consultant: { first_name: 'Inès', last_name: 'Morel' },
      mission: { title: 'Data', daily_rate_eur: 650, companies: { name: 'Nordal' } },
    });
    const supabase = fakeSupabase({
      invoices: [{ id: 'inv-1', status: 'draft', validated_at: null, party: 'client' }],
      invoice_links: [{ timesheet_id: 'ts-invoiced' }],
      timesheets: [ts('ts-invoiced', 9, 20), ts('ts-sept', 9, 18), ts('ts-old', 2, 21)],
    });
    // Act
    const data = await loadPrefacturation(supabase, 'org', TODAY);
    // Assert : le CRA déjà préfacturé et celui hors fenêtre (février) sont écartés.
    expect(data.invoices).toHaveLength(1);
    expect(data.toPrepare).toEqual([
      { id: 'ts-sept', consultant: 'Inès Morel', mission: 'Data', client: 'Nordal', period_month: 9, period_year: 2026, days: 18, rate: 650, amount: 11700 },
    ]);
  });
});

describe('loadFinance', () => {
  it('splits pre-invoices to review and flags missions under their margin target', async () => {
    const supabase = fakeSupabase({
      missions: [
        { id: 'm-low', consultant_id: 'c1', company_id: 'co', title: 'Mission serrée', status: 'active', start_date: '2026-01-05', end_date: null, daily_rate_eur: 600, consultants: { first_name: 'A', last_name: 'B' }, companies: { name: 'Nordal' } },
        { id: 'm-ok', consultant_id: 'c2', company_id: 'co', title: 'Mission saine', status: 'active', start_date: '2026-01-05', end_date: null, daily_rate_eur: 700, consultants: null, companies: null },
        { id: 'm-own', consultant_id: 'c3', company_id: null, title: 'Objectif propre', status: 'active', start_date: '2026-01-05', end_date: null, daily_rate_eur: 500, consultants: null, companies: null },
      ],
      timesheets: [],
      invoices: [
        { status: 'draft', amount_ht: 1000, due_date: '2026-11-01', issue_date: '2026-10-01', payment_date: null, validated_at: null },
        { status: 'draft', amount_ht: 2000, due_date: '2026-11-01', issue_date: '2026-10-01', payment_date: null, validated_at: '2026-10-02T00:00:00Z' },
      ],
      consultants: [],
      mission_financials: [],
      consultant_financials: [
        { consultant_id: 'c1', daily_cost_eur: 510, target_margin_pct: null }, // 15 % < 20 % par défaut
        { consultant_id: 'c2', daily_cost_eur: 490, target_margin_pct: null }, // 30 %
        { consultant_id: 'c3', daily_cost_eur: 360, target_margin_pct: 35 }, // 28 % < 35 % (objectif propre)
      ],
    });
    const f = await loadFinance(supabase, 'org', true, TODAY);
    expect(f.kpis.toReviewCount).toBe(1);
    expect(f.kpis.toReviewAmount).toBe(1000);
    expect(f.kpis.toExportCount).toBe(1);
    expect(f.lowMargin.map((m) => [m.id, m.marginPct, m.target, m.targetIsDefault])).toEqual([
      ['m-low', 15, DEFAULT_TARGET_MARGIN_PCT, true],
      ['m-own', 28, 35, false],
    ]);
  });

  it('never exposes margins without the financial permission', async () => {
    const supabase = fakeSupabase({
      missions: [{ id: 'm', consultant_id: 'c1', company_id: null, title: 'x', status: 'active', start_date: '2026-01-05', end_date: null, daily_rate_eur: 600, consultants: null, companies: null }],
      consultant_financials: [{ consultant_id: 'c1', daily_cost_eur: 590, target_margin_pct: null }],
    });
    const f = await loadFinance(supabase, 'org', false, TODAY);
    expect(f.lowMargin).toEqual([]);
    expect(f.kpis.marginPct12m).toBeNull();
  });
});
