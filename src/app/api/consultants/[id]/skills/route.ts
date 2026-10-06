import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthorization } from '@/lib/auth/rbac';

// =========================================================================
// POST /api/consultants/:id/skills
// -------------------------------------------------------------------------
// Ajoute une liste de compétences au consultant, en dédupliquant contre
// celles déjà présentes (category + name, case-insensitive).
// Retourne { added: number }.
// =========================================================================

export const runtime = 'nodejs';

const bodySchema = z.object({
  skills: z.array(
    z.object({
      category: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      is_highlighted: z.boolean().optional(),
    }),
  ),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthorization();
  if (!ctx.permissions.has('consultants.edit')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');

  // Vérifie que le consultant appartient bien à l'org courante
  const { data: consultant } = await admin
    .from('consultants')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!consultant) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (consultant.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (parsed.data.skills.length === 0) {
    return NextResponse.json({ added: 0 }, { status: 200 });
  }

  // Dédup contre l'existant
  const { data: existing } = await admin
    .from('consultant_skills')
    .select('category, name')
    .eq('consultant_id', params.id);
  const keys = new Set(
    (existing ?? []).map((s) => `${s.category}::${(s.name ?? '').toLowerCase()}`),
  );

  const toInsert = parsed.data.skills
    .filter((s) => !keys.has(`${s.category}::${s.name.toLowerCase()}`))
    .map((s) => ({
      consultant_id: params.id,
      category: s.category,
      name: s.name,
      is_highlighted: s.is_highlighted ?? false,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ added: 0 }, { status: 200 });
  }

  const { error } = await admin.from('consultant_skills').insert(toInsert);
  if (error) {
    return NextResponse.json(
      { error: 'insert_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ added: toInsert.length }, { status: 201 });
}

// =========================================================================
// DELETE /api/consultants/:id/skills?name=<name>&category=<category>
// -------------------------------------------------------------------------
// Retire une compétence du consultant (match case-insensitive sur name,
// avec category optionnelle pour désambiguïser si plusieurs catégories
// portent le même nom). Retourne { removed: number }.
// =========================================================================

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthorization();
  if (!ctx.permissions.has('consultants.edit')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get('name')?.trim();
  const category = url.searchParams.get('category')?.trim();
  if (!name) {
    return NextResponse.json({ error: 'missing_name' }, { status: 400 });
  }

  const admin = createAdminClient('cross-org-query');

  const { data: consultant } = await admin
    .from('consultants')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!consultant) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (consultant.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let query = admin
    .from('consultant_skills')
    .delete()
    .eq('consultant_id', params.id)
    .ilike('name', name);
  if (category) query = query.eq('category', category);

  const { data: deleted, error } = await query.select('id');
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ removed: deleted?.length ?? 0 }, { status: 200 });
}
