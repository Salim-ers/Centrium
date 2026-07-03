import { NextResponse } from 'next/server';

import { getSuperAdminContext } from '@/lib/auth/super-admin';

// =========================================================================
// GET /api/auth/founder-status — l'appelant a-t-il accès à la super-console ?
// -------------------------------------------------------------------------
// Utilisé par le menu profil (Header) pour afficher ou non l'entrée
// « Super console ». Ne révèle qu'un booléen — le vrai contrôle d'accès
// reste getSuperAdminContext côté layout /admin + routes API.
// =========================================================================

export const runtime = 'nodejs';

export async function GET() {
  const ctx = await getSuperAdminContext();
  return NextResponse.json({ data: { isFounder: !!ctx } });
}
