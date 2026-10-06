import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthorization } from '@/lib/auth/rbac';
import { consultantSchema } from '@/lib/validators';
import {
  enforceConsultantLimit,
  PlanLimitError,
  planLimitResponse,
} from '@/lib/billing/enforce';

// =========================================================================
// POST /api/consultants/import-csv
// -------------------------------------------------------------------------
// Bulk insert de consultants depuis un CSV pré-parsé côté client.
// Body : { rows: ConsultantInput[], is_prospect?: boolean, skills?: Skill[][] }
// (skills[i] : compétences de rows[i], rattachées au consultant créé)
// → 200 { inserted: number, errors: { index: number, message: string }[], skills_added: number }
// =========================================================================

export const runtime = 'nodejs';

const skillSchema = z.object({ category: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(200) });

const bodySchema = z.object({
  rows: z.array(consultantSchema).min(1).max(500),
  is_prospect: z.boolean().optional(),
  skills: z.array(z.array(skillSchema).max(50)).max(500).optional(),
});

export async function POST(req: NextRequest) {
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

  // Pré-check du lot complet : on refuse l'import en bloc si ça dépasse,
  // plutôt que d'insérer N puis d'échouer en plein milieu.
  try {
    await enforceConsultantLimit(ctx.organizationId, parsed.data.rows.length);
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return NextResponse.json(planLimitResponse(e), { status: 402 });
    }
    throw e;
  }

  const admin = createAdminClient('cross-org-query');
  const records = parsed.data.rows.map((r) => {
    // Normalise les '' → null et ajoute organization_id + is_prospect
    const cleaned = Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, v === '' ? null : v]),
    );
    return {
      ...cleaned,
      organization_id: ctx.organizationId,
      is_prospect: parsed.data.is_prospect ?? false,
    };
  });

  // On insère par lots de 50 pour rester dans les limites de la API REST.
  const errors: { index: number; message: string }[] = [];
  let inserted = 0;
  // Identifiant créé pour chaque ligne (pour y rattacher ses compétences).
  const ids: Array<string | null> = records.map(() => null);
  const sameRow = (row: Record<string, unknown>, got: { first_name: string; last_name: string; email: string | null }) =>
    row.first_name === got.first_name && row.last_name === got.last_name && (row.email ?? null) === (got.email ?? null);
  const CHUNK = 50;
  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from('consultants')
      .insert(slice)
      .select('id, first_name, last_name, email');
    if (error) {
      // En cas d'erreur sur un lot on retombe en mode unitaire pour identifier
      // précisément les lignes en faute.
      for (let j = 0; j < slice.length; j++) {
        const { data: one, error: rowErr } = await admin
          .from('consultants')
          .insert([slice[j]])
          .select('id');
        if (rowErr) {
          errors.push({ index: i + j, message: rowErr.message });
        } else {
          inserted += 1;
          ids[i + j] = one?.[0]?.id ?? null;
        }
      }
    } else {
      inserted += data?.length ?? 0;
      // Lignes renvoyées dans l'ordre d'insertion ; on le vérifie ligne à
      // ligne et, au moindre écart, on retrouve la ligne par nom et email.
      const got = (data ?? []) as Array<{ id: string; first_name: string; last_name: string; email: string | null }>;
      const unused = new Set(got.map((g) => g.id));
      slice.forEach((row, k) => {
        const match = got[k] && sameRow(row, got[k]!) && unused.has(got[k]!.id) ? got[k]! : got.find((g) => unused.has(g.id) && sameRow(row, g));
        if (match) {
          ids[i + k] = match.id;
          unused.delete(match.id);
        }
      });
    }
  }

  // Compétences : seulement sur les consultants créés par cette requête.
  let skillsAdded = 0;
  const skillRows: Array<{ consultant_id: string; category: string; name: string; is_highlighted: boolean }> = [];
  (parsed.data.skills ?? []).forEach((list, index) => {
    const consultantId = ids[index];
    if (!consultantId) return;
    const seen = new Set<string>();
    for (const sk of list) {
      const key = `${sk.category}::${sk.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      skillRows.push({ consultant_id: consultantId, category: sk.category, name: sk.name, is_highlighted: false });
    }
  });
  for (let i = 0; i < skillRows.length; i += 500) {
    const { error } = await admin.from('consultant_skills').insert(skillRows.slice(i, i + 500));
    if (!error) skillsAdded += Math.min(500, skillRows.length - i);
  }

  return NextResponse.json(
    { inserted, errors, total: records.length, skills_added: skillsAdded },
    { status: 200 },
  );
}
