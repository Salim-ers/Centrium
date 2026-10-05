import { beforeEach, describe, expect, it, vi } from 'vitest';

// Client Supabase factice : on capture la ligne insérée et on choisit la
// réponse de la base (succès, doublon, erreur).
const state: { inserted: Record<string, unknown>[]; result: { data: unknown; error: unknown } } = { inserted: [], result: { data: null, error: null } };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => {
      const builder: Record<string, unknown> = {};
      builder.insert = (row: Record<string, unknown>) => {
        state.inserted.push(row);
        return builder;
      };
      builder.select = () => builder;
      builder.single = async () => state.result;
      return builder;
    },
  }),
}));

const { taskService } = await import('@/lib/services/crm.service');

const ORG = '22222222-2222-4222-8222-222222222222';
const MISSION = '99999999-9999-4999-8999-000000000001';
const input = { title: 'Confirmer le renouvellement · Lead dev', priority: 'high' as const, due_date: '2026-10-12', entity_type: 'mission' as const, entity_id: MISSION };

describe('taskService.createOnce', () => {
  beforeEach(() => {
    state.inserted = [];
    state.result = { data: null, error: null };
  });

  it('creates the task with its dedupe key', async () => {
    // Arrange
    state.result = { data: { id: 't-1', ...input }, error: null };
    // Act
    const { data, error } = await taskService.createOnce(input, ORG, `renewal-check:${MISSION}`);
    // Assert
    expect(error).toBeNull();
    expect(data).toEqual({ task: expect.objectContaining({ id: 't-1' }), existing: false });
    expect(state.inserted[0]).toMatchObject({ organization_id: ORG, created_by: 'user-1', dedupe_key: `renewal-check:${MISSION}` });
  });

  it('reports an already open task instead of failing', async () => {
    state.result = { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
    const { data, error } = await taskService.createOnce(input, ORG, `renewal-check:${MISSION}`);
    expect(error).toBeNull();
    expect(data).toEqual({ task: null, existing: true });
  });

  it('returns other database errors', async () => {
    state.result = { data: null, error: { code: '42501', message: 'permission denied' } };
    const { data, error } = await taskService.createOnce(input, ORG, 'k');
    expect(data).toBeNull();
    expect(error?.message).toBe('permission denied');
  });

  it('rejects invalid input before touching the database', async () => {
    const { error } = await taskService.createOnce({ ...input, title: '' }, ORG, 'k');
    expect(error).not.toBeNull();
    expect(state.inserted).toHaveLength(0);
  });
});
