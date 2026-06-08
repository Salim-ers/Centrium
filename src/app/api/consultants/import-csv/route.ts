import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
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
// Body : { rows: ConsultantInput[], is_prospect?: boolean }
// → 200 { inserted: number, errors: { index: number, message: string }[] }
// =========================================================================

export const runtime = 'nodejs';

const bodySchema = z.object({
  rows: z.array(consultantSchema).min(1).max(500),
  is_prospect: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager', 'recruiter'].includes(ctx.role)) {
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
  const CHUNK = 50;
  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from('consultants')
      .insert(slice)
      .select('id');
    if (error) {
      // En cas d'erreur sur un lot on retombe en mode unitaire pour identifier
      // précisément les lignes en faute.
      for (let j = 0; j < slice.length; j++) {
        const { error: rowErr } = await admin
          .from('consultants')
          .insert([slice[j]])
          .select('id');
        if (rowErr) {
          errors.push({ index: i + j, message: rowErr.message });
        } else {
          inserted += 1;
        }
      }
    } else {
      inserted += data?.length ?? 0;
    }
  }

  return NextResponse.json(
    { inserted, errors, total: records.length },
    { status: 200 },
  );
}
