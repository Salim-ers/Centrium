import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

// =========================================================================
// POST /api/duplicates/contacts/merge — fusionne un contact en double dans
// celui qu'on garde, après confirmation dans l'interface.
//
// Tout ce qui pointe vers le doublon est rattaché au contact gardé
// (interactions, étiquettes, opportunités, devis, fiches de poste,
// messages, alertes, accès portail, notes, tâches, historique) ; les
// champs vides du contact gardé sont complétés ; le doublon est archivé,
// jamais supprimé. Chaque étape est rejouable : une fusion interrompue se
// termine en la relançant.
// =========================================================================

const bodySchema = z.object({ keepId: z.string().uuid(), mergeId: z.string().uuid() }).refine((b) => b.keepId !== b.mergeId, { message: 'Deux contacts différents sont attendus.' });

type Admin = ReturnType<typeof createAdminClient>;
type PgError = { code?: string; message: string } | null;

/** Une table ou colonne absente (migration non appliquée) n'empêche pas la fusion. */
const missing = (e: PgError) => !!e && (e.code === '42P01' || e.code === '42703' || e.code === 'PGRST205' || e.code === 'PGRST204');

function fail(step: string, e: PgError): never {
  throw Object.assign(new Error(`${step}: ${e?.message ?? 'erreur'}`), { step });
}

/** Table de liaison à clé composite : on retire d'abord les lignes que le contact gardé possède déjà. */
async function moveJoin(admin: Admin, table: string, other: string, keepId: string, mergeId: string) {
  const [kept, merged] = await Promise.all([admin.from(table).select(other).eq('contact_id', keepId), admin.from(table).select(other).eq('contact_id', mergeId)]);
  if (missing(kept.error) || missing(merged.error)) return;
  if (kept.error || merged.error) fail(table, kept.error ?? merged.error);
  const have = new Set(((kept.data ?? []) as unknown as Array<Record<string, string>>).map((r) => r[other]));
  const conflicts = ((merged.data ?? []) as unknown as Array<Record<string, string>>).map((r) => r[other]!).filter((v) => have.has(v));
  if (conflicts.length) {
    const { error } = await admin.from(table).delete().eq('contact_id', mergeId).in(other, conflicts);
    if (error && !missing(error)) fail(table, error);
  }
  const { error } = await admin.from(table).update({ contact_id: keepId }).eq('contact_id', mergeId);
  if (error && !missing(error)) fail(table, error);
}

async function moveColumn(admin: Admin, table: string, keepId: string, mergeId: string) {
  const { error } = await admin.from(table).update({ contact_id: keepId }).eq('contact_id', mergeId);
  if (error && !missing(error)) fail(table, error);
}

async function moveEntity(admin: Admin, table: string, organizationId: string, keepId: string, mergeId: string) {
  const { error } = await admin.from(table).update({ entity_id: keepId }).eq('organization_id', organizationId).eq('entity_type', 'contact').eq('entity_id', mergeId);
  if (error && !missing(error)) fail(table, error);
}

const FILLABLE = ['email', 'phone', 'linkedin_url', 'job_title', 'city', 'company_id', 'source'] as const;

export async function POST(req: NextRequest) {
  const auth = await apiPermission('crm.edit');
  if (auth instanceof NextResponse) return auth;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const { keepId, mergeId } = parsed.data;

  const admin = createAdminClient('cross-org-query');
  const { data: rows, error } = await admin.from('contacts').select('*').in('id', [keepId, mergeId]);
  if (error) return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  const keep = rows?.find((r) => r.id === keepId) as Record<string, unknown> | undefined;
  const merge = rows?.find((r) => r.id === mergeId) as Record<string, unknown> | undefined;
  // Isolation : les deux fiches doivent appartenir à l'organisation de l'appelant.
  if (!keep || !merge || keep.organization_id !== auth.organizationId || merge.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    await moveJoin(admin, 'contact_tags', 'tag_id', keepId, mergeId);
    await moveJoin(admin, 'opportunity_contacts', 'opportunity_id', keepId, mergeId);
    for (const table of ['contact_interactions', 'opportunities', 'quotes', 'job_offers', 'messages', 'alerts', 'client_portal_users']) {
      await moveColumn(admin, table, keepId, mergeId);
    }
    for (const table of ['notes', 'tasks', 'activities']) {
      await moveEntity(admin, table, auth.organizationId, keepId, mergeId);
    }

    // Le doublon sort d'abord des contacts actifs : son email peut alors
    // passer au contact gardé sans heurter l'unicité des emails actifs.
    if (!merge.archived) {
      const { error: archErr } = await admin.from('contacts').update({ archived: true, archived_at: new Date().toISOString() }).eq('id', mergeId).eq('organization_id', auth.organizationId);
      if (archErr) fail('contacts', archErr);
    }
    const fills: Record<string, unknown> = {};
    for (const f of FILLABLE) {
      const empty = keep[f] == null || (typeof keep[f] === 'string' && !(keep[f] as string).trim());
      if (empty && merge[f] != null && merge[f] !== '') fills[f] = merge[f];
    }
    if (Object.keys(fills).length > 0) {
      const { error: fillErr } = await admin.from('contacts').update(fills).eq('id', keepId).eq('organization_id', auth.organizationId);
      if (fillErr) fail('contacts', fillErr);
    }

    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.user.id,
      entityType: 'contact',
      entityId: keepId,
      action: 'merged',
      details: { merged_contact_id: mergeId, filled: Object.keys(fills) },
    });
    return NextResponse.json({ data: { keepId, mergeId, filled: Object.keys(fills) } });
  } catch (e) {
    return NextResponse.json({ error: 'merge_failed', message: (e as Error).message, step: (e as { step?: string }).step }, { status: 500 });
  }
}
