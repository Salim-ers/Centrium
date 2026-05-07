import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { contactSchema } from '@/lib/validators';

// =========================================================================
// POST /api/contacts/import-csv
// -------------------------------------------------------------------------
// Bulk insert de contacts depuis un CSV pré-parsé côté client.
// Body : { rows: ContactInput[] }
// → 200 { inserted: number, errors: { index, message }[], total }
// =========================================================================

export const runtime = 'nodejs';

const bodySchema = z.object({
  rows: z.array(contactSchema).min(1).max(1000),
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

  const admin = createAdminClient();
  const records = parsed.data.rows.map((r) => {
    const cleaned = Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, v === '' ? null : v]),
    );
    return {
      ...cleaned,
      organization_id: ctx.organizationId,
    };
  });

  // Insertion par lots de 100 — au-delà la REST de Supabase commence à
  // râler côté payload. En cas d'erreur sur un lot on retombe en mode
  // unitaire pour identifier les lignes en faute.
  const errors: { index: number; message: string }[] = [];
  let inserted = 0;
  const CHUNK = 100;
  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from('contacts')
      .insert(slice)
      .select('id');
    if (error) {
      for (let j = 0; j < slice.length; j++) {
        const { error: rowErr } = await admin
          .from('contacts')
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
