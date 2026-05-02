import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth/guards';
import { getQuotaUsage } from '@/lib/billing/enforce';

// =========================================================================
// GET /api/billing/usage
// -------------------------------------------------------------------------
// Renvoie l'usage actuel + les limites pour l'org de l'utilisateur courant.
// Utilisé par les compteurs UI (/consultants, /settings/team) et la dialog
// "Limite atteinte" pour ouvrir le checkout vers le plan supérieur.
// =========================================================================

export const runtime = 'nodejs';

export async function GET() {
  const ctx = await requireOrg();
  const usage = await getQuotaUsage(ctx.organizationId);
  return NextResponse.json({ data: usage });
}
