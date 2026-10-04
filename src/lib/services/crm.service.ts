// =========================================================================
// Services CRM V2 : opportunités (fiche complète), tâches, notes,
// historique, consultants proposés. Lecture/écriture sous RLS, avec
// validation zod côté client AVANT l'envoi (la RLS + les contraintes SQL
// restent la barrière finale).
// =========================================================================

import { createClient } from '@/lib/supabase/client';
import { opportunityV2Schema, taskSchema, type OpportunityV2Input, type TaskInput } from '@/lib/validators/v2';
import type { Opportunity, ServiceResult, Task } from '@/types';

export type Activity = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
  actor_id: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Proposal = {
  opportunity_id: string;
  consultant_id: string;
  pitch: string | null;
  sent_at: string | null;
  client_feedback: string | null;
  consultants: { id: string; first_name: string; last_name: string; job_title: string | null; status: string } | null;
};

function fail<T>(e: unknown): ServiceResult<T> {
  return { data: null, error: e instanceof Error ? e : new Error(String((e as { message?: string })?.message ?? e)) };
}

async function logActivity(
  organizationId: string,
  entityType: string,
  entityId: string,
  action: string,
  details?: Record<string, unknown>,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from('activities').insert({
    organization_id: organizationId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    user_id: user?.id ?? null,
    actor_id: user?.id ?? null,
    details: details ?? null,
  });
}

export const crmService = {
  async getOpportunity(id: string): Promise<ServiceResult<Opportunity>> {
    const { data, error } = await createClient().from('opportunities').select('*').eq('id', id).maybeSingle();
    if (error) return fail(error);
    if (!data) return fail(new Error('Opportunité introuvable'));
    return { data: data as Opportunity, error: null };
  },

  async saveOpportunity(
    input: OpportunityV2Input,
    organizationId: string,
    id?: string,
  ): Promise<ServiceResult<Opportunity>> {
    const parsed = opportunityV2Schema.safeParse(input);
    if (!parsed.success) return fail(new Error(parsed.error.issues[0]?.message ?? 'Données invalides'));
    const supabase = createClient();
    const values = { ...parsed.data, last_interaction: new Date().toISOString() };
    const q = id
      ? supabase.from('opportunities').update(values).eq('id', id)
      : supabase.from('opportunities').insert({ ...values, organization_id: organizationId });
    const { data, error } = await q.select().single();
    if (error) return fail(error);
    void logActivity(organizationId, 'opportunity', data.id, id ? 'updated' : 'created', { title: data.title });
    return { data: data as Opportunity, error: null };
  },

  async moveOpportunity(
    opp: Pick<Opportunity, 'id' | 'organization_id' | 'title' | 'status'>,
    status: Opportunity['status'],
    probability: number,
  ): Promise<ServiceResult<Opportunity>> {
    const { data, error } = await createClient()
      .from('opportunities')
      .update({ status, probability, last_interaction: new Date().toISOString() })
      .eq('id', opp.id)
      .select()
      .single();
    if (error) return fail(error);
    void logActivity(opp.organization_id, 'opportunity', opp.id, 'stage_changed', { from: opp.status, to: status });
    return { data: data as Opportunity, error: null };
  },

  async deleteOpportunity(id: string): Promise<ServiceResult<true>> {
    const { error } = await createClient().from('opportunities').delete().eq('id', id);
    if (error) return fail(error);
    return { data: true, error: null };
  },

  // ── Historique ─────────────────────────────────────────────────────────
  async activities(entityType: string, entityId: string, limit = 50): Promise<ServiceResult<Activity[]>> {
    const { data, error } = await createClient()
      .from('activities')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return fail(error);
    return { data: (data ?? []) as Activity[], error: null };
  },

  // ── Notes internes ─────────────────────────────────────────────────────
  async notes(entityType: string, entityId: string): Promise<ServiceResult<Note[]>> {
    const { data, error } = await createClient()
      .from('notes')
      .select('id, body, author_id, created_at, updated_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (error) return fail(error);
    return { data: (data ?? []) as Note[], error: null };
  },

  async addNote(organizationId: string, entityType: string, entityId: string, body: string): Promise<ServiceResult<Note>> {
    const text = body.trim();
    if (!text) return fail(new Error('Note vide'));
    if (text.length > 5000) return fail(new Error('Note trop longue (5 000 caractères max.)'));
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('notes')
      .insert({ organization_id: organizationId, entity_type: entityType, entity_id: entityId, body: text, author_id: user?.id ?? null })
      .select('id, body, author_id, created_at, updated_at')
      .single();
    if (error) return fail(error);
    return { data: data as Note, error: null };
  },

  async deleteNote(id: string): Promise<ServiceResult<true>> {
    const { error } = await createClient().from('notes').delete().eq('id', id);
    if (error) return fail(error);
    return { data: true, error: null };
  },

  // ── Consultants proposés ───────────────────────────────────────────────
  async proposals(opportunityId: string): Promise<ServiceResult<Proposal[]>> {
    const { data, error } = await createClient()
      .from('opportunity_consultants')
      .select('opportunity_id, consultant_id, pitch, sent_at, client_feedback, consultants(id, first_name, last_name, job_title, status)')
      .eq('opportunity_id', opportunityId);
    if (error) return fail(error);
    return { data: (data ?? []) as unknown as Proposal[], error: null };
  },

  async propose(opportunityId: string, consultantId: string, organizationId: string, pitch?: string): Promise<ServiceResult<true>> {
    const { error } = await createClient()
      .from('opportunity_consultants')
      .upsert(
        { opportunity_id: opportunityId, consultant_id: consultantId, pitch: pitch ?? null, sent_at: new Date().toISOString() },
        { onConflict: 'opportunity_id,consultant_id' },
      );
    if (error) return fail(error);
    void logActivity(organizationId, 'opportunity', opportunityId, 'consultant_proposed', { consultant_id: consultantId });
    return { data: true, error: null };
  },

  async updateProposalFeedback(opportunityId: string, consultantId: string, feedback: string): Promise<ServiceResult<true>> {
    const { error } = await createClient()
      .from('opportunity_consultants')
      .update({ client_feedback: feedback.slice(0, 2000) })
      .eq('opportunity_id', opportunityId)
      .eq('consultant_id', consultantId);
    if (error) return fail(error);
    return { data: true, error: null };
  },

  async withdrawProposal(opportunityId: string, consultantId: string): Promise<ServiceResult<true>> {
    const { error } = await createClient()
      .from('opportunity_consultants')
      .delete()
      .eq('opportunity_id', opportunityId)
      .eq('consultant_id', consultantId);
    if (error) return fail(error);
    return { data: true, error: null };
  },
};

export const taskService = {
  async list(filter: {
    entityType?: string;
    entityId?: string;
    assigneeId?: string;
    status?: Task['status'] | 'open';
    limit?: number;
  } = {}): Promise<ServiceResult<Task[]>> {
    let q = createClient().from('tasks').select('*');
    if (filter.entityType) q = q.eq('entity_type', filter.entityType);
    if (filter.entityId) q = q.eq('entity_id', filter.entityId);
    if (filter.assigneeId) q = q.eq('assignee_id', filter.assigneeId);
    if (filter.status === 'open') q = q.eq('status', 'todo');
    else if (filter.status) q = q.eq('status', filter.status);
    const { data, error } = await q
      .order('status', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(filter.limit ?? 500);
    if (error) return fail(error);
    return { data: (data ?? []) as Task[], error: null };
  },

  async create(input: TaskInput, organizationId: string): Promise<ServiceResult<Task>> {
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(new Error(parsed.error.issues[0]?.message ?? 'Données invalides'));
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...parsed.data, organization_id: organizationId, created_by: user?.id ?? null })
      .select()
      .single();
    if (error) return fail(error);
    return { data: data as Task, error: null };
  },

  async update(id: string, patch: Partial<Pick<Task, 'status' | 'title' | 'due_date' | 'assignee_id' | 'priority' | 'description'>>): Promise<ServiceResult<Task>> {
    const { data, error } = await createClient().from('tasks').update(patch).eq('id', id).select().single();
    if (error) return fail(error);
    return { data: data as Task, error: null };
  },

  async remove(id: string): Promise<ServiceResult<true>> {
    const { error } = await createClient().from('tasks').delete().eq('id', id);
    if (error) return fail(error);
    return { data: true, error: null };
  },
};
