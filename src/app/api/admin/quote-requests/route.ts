import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';

// =========================================================================
// GET /api/admin/quote-requests — Liste des demandes de devis.
// Réservé au super_admin.
// =========================================================================

export const runtime = 'nodejs';

// Check centralisé (rôle super_admin + allowlist FOUNDER_EMAILS) —
// cf. lib/auth/super-admin.ts. Le wrapper local préserve les call-sites.
async function requireSuperAdmin() {
  const ctx = await getSuperAdminContext();
  return ctx?.user ?? null;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = createAdminClient('onboarding');
  const { data, error } = await admin
    .from('quote_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: 'list_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ data: data ?? [] });
}
