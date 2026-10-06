import { beforeEach, describe, expect, it, vi } from 'vitest';

// Client Supabase factice : on capture les écritures (table, opération,
// valeurs, filtres) et on choisit la réponse de la base par table et
// opération (`tasks.insert`, `tasks.update`…, sinon `tasks`).
type Write = { table: string; op: 'update' | 'insert'; values: Record<string, unknown>; filters: Record<string, string> };
type Result = { data: unknown; error: unknown };
const state: { writes: Write[]; results: Record<string, Result> } = { writes: [], results: {} };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => {
      let current: Write | null = null;
      const result = () => (current && state.results[`${table}.${current.op}`]) ?? state.results[table] ?? { data: null, error: null };
      const builder: Record<string, unknown> = {};
      const write = (op: Write['op']) => (values: Record<string, unknown>) => {
        current = { table, op, values, filters: {} };
        state.writes.push(current);
        return builder;
      };
      builder.update = write('update');
      builder.insert = write('insert');
      builder.eq = (col: string, value: string) => {
        if (current) current.filters[col] = value;
        return builder;
      };
      builder.select = () => builder;
      builder.single = async () => result();
      builder.maybeSingle = async () => result();
      // Journal d'activité : insert attendu sans select.
      builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
      return builder;
    },
  }),
}));

const { crmService, followUpTaskKey } = await import('@/lib/services/crm.service');

const ORG = '22222222-2222-4222-8222-222222222222';
const OWNER = '33333333-3333-4333-8333-333333333333';
const OPP = { id: '44444444-4444-4444-8444-444444444444', organization_id: ORG, owner_id: OWNER, priority: 'high' as const, title: 'Lead dev', status: 'discussion' as const, next_action: 'Rappeler le DSI' };
const writesTo = (table: string, op?: Write['op']) => state.writes.filter((w) => w.table === table && (!op || w.op === op));

describe('crmService.patchOpportunity', () => {
  beforeEach(() => {
    state.writes = [];
    state.results = { opportunities: { data: { ...OPP, expected_revenue: 84000 }, error: null } };
  });

  it('writes only the edited fields, without schema defaults', async () => {
    // Act
    const { data, error } = await crmService.patchOpportunity(OPP, { expected_revenue: 84000 });
    // Assert
    expect(error).toBeNull();
    expect(data).toMatchObject({ expected_revenue: 84000 });
    const w = writesTo('opportunities')[0]!;
    expect(w).toMatchObject({ op: 'update', filters: { id: OPP.id } });
    expect(Object.keys(w.values).sort()).toEqual(['expected_revenue', 'last_interaction']);
  });

  it('rejects an out-of-range value before touching the database', async () => {
    const { error } = await crmService.patchOpportunity(OPP, { probability: 140 });
    expect(error).not.toBeNull();
    expect(writesTo('opportunities')).toHaveLength(0);
  });

  it('refuses an empty patch', async () => {
    const { error } = await crmService.patchOpportunity(OPP, {});
    expect(error?.message).toBe('Aucune modification');
  });
});

describe('crmService.planFollowUp', () => {
  beforeEach(() => {
    state.writes = [];
    state.results = {
      opportunities: { data: { ...OPP, next_action: 'Envoyer les CV', next_follow_up: '2026-10-12' }, error: null },
      'tasks.insert': { data: { id: 'task-1' }, error: null },
      'tasks.update': { data: { id: 'task-1' }, error: null },
    };
  });

  it('updates the deal and creates the follow-up task for the owner', async () => {
    // Act
    const { data, error } = await crmService.planFollowUp(OPP, { action: '  Envoyer les CV ', date: '2026-10-12', createTask: true });
    // Assert
    expect(error).toBeNull();
    expect(data).toMatchObject({ taskAction: 'created', taskFailed: false });
    expect(writesTo('opportunities')[0]?.values).toMatchObject({ next_action: 'Envoyer les CV', next_follow_up: '2026-10-12' });
    expect(writesTo('tasks', 'insert')[0]?.values).toMatchObject({
      title: 'Envoyer les CV',
      due_date: '2026-10-12',
      assignee_id: OWNER,
      priority: 'high',
      entity_type: 'opportunity',
      entity_id: OPP.id,
      organization_id: ORG,
      dedupe_key: followUpTaskKey(OPP.id),
    });
  });

  it('moves the open follow-up task instead of creating a second one', async () => {
    state.results['tasks.insert'] = { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
    const { data } = await crmService.planFollowUp(OPP, { action: 'Caler un rendez-vous', date: '2026-10-19', createTask: true });
    expect(data).toMatchObject({ taskAction: 'updated', taskFailed: false });
    const update = writesTo('tasks', 'update')[0];
    expect(update?.values).toMatchObject({ title: 'Caler un rendez-vous', due_date: '2026-10-19' });
    expect(update?.filters).toEqual({ organization_id: ORG, dedupe_key: followUpTaskKey(OPP.id), status: 'todo' });
  });

  it('keeps the deal up to date when the task fails', async () => {
    state.results['tasks.insert'] = { data: null, error: { code: '42501', message: 'permission denied' } };
    const { data, error } = await crmService.planFollowUp(OPP, { action: 'Envoyer les CV', date: '2026-10-12', createTask: true });
    expect(error).toBeNull();
    expect(data).toMatchObject({ taskAction: null, taskFailed: true });
    expect(writesTo('opportunities')).toHaveLength(1);
  });

  it('skips the task when not requested', async () => {
    await crmService.planFollowUp(OPP, { action: 'Envoyer les CV', date: '2026-10-12', createTask: false });
    expect(writesTo('tasks')).toHaveLength(0);
  });

  it('requires a next step', async () => {
    const { error } = await crmService.planFollowUp(OPP, { action: '   ', date: '2026-10-12', createTask: true });
    expect(error).not.toBeNull();
    expect(state.writes).toHaveLength(0);
  });
});

describe('crmService.moveOpportunity', () => {
  beforeEach(() => {
    state.writes = [];
    state.results = { opportunities: { data: { ...OPP, status: 'lost' }, error: null } };
  });

  it('records the loss reason with the stage change', async () => {
    await crmService.moveOpportunity(OPP, 'lost', 0, { lost_reason: ' Concurrent retenu ' });
    expect(writesTo('opportunities')[0]?.values).toMatchObject({ status: 'lost', probability: 0, lost_reason: 'Concurrent retenu' });
  });

  it('leaves the loss reason untouched on a plain move', async () => {
    await crmService.moveOpportunity(OPP, 'negotiation', 75);
    expect(writesTo('opportunities')[0]?.values).not.toHaveProperty('lost_reason');
  });
});

describe('crmService.completeFollowUp', () => {
  beforeEach(() => {
    state.writes = [];
    state.results = {
      opportunities: { data: { ...OPP, next_action: null, next_follow_up: null }, error: null },
      'tasks.update': { data: null, error: null },
    };
  });

  it('clears the next step, ticks the follow-up task and logs it', async () => {
    const { error } = await crmService.completeFollowUp(OPP);
    expect(error).toBeNull();
    expect(writesTo('opportunities')[0]?.values).toMatchObject({ next_action: null, next_follow_up: null });
    expect(writesTo('tasks', 'update')[0]).toMatchObject({ values: { status: 'done' }, filters: { dedupe_key: followUpTaskKey(OPP.id), status: 'todo' } });
    // Le journal est écrit en tâche de fond.
    await new Promise((r) => setTimeout(r, 0));
    expect(writesTo('activities')[0]?.values).toMatchObject({ action: 'follow_up_done', details: { action: 'Rappeler le DSI' } });
  });
});
