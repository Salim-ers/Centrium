import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { DASHBOARD_VIEWS, WIDGET_IDS, resolveLayout, type DashboardView, type LayoutItem } from '@/lib/dashboard/widgets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/layout — dispositions enregistrées de l'utilisateur
 * (organisation active). 204 si le stockage n'est pas encore migré : le
 * navigateur garde alors la disposition par défaut.
 */
export async function GET() {
  const auth = await apiPermission('dashboard.view');
  if (auth instanceof NextResponse) return auth;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_dashboard_layouts')
    .select('view, widgets')
    .eq('user_id', auth.user.id)
    .eq('organization_id', auth.organizationId);
  if (error) return new NextResponse(null, { status: 204 });
  const layouts: Partial<Record<DashboardView, LayoutItem[]>> = {};
  for (const row of (data ?? []) as Array<{ view: DashboardView; widgets: LayoutItem[] }>) {
    if ((DASHBOARD_VIEWS as readonly string[]).includes(row.view)) layouts[row.view] = resolveLayout(row.view, row.widgets);
  }
  return NextResponse.json({ data: layouts }, { headers: { 'Cache-Control': 'private, no-store' } });
}

const putSchema = z.object({
  view: z.enum(DASHBOARD_VIEWS),
  widgets: z
    .array(z.object({ id: z.enum(WIDGET_IDS), hidden: z.boolean().optional() }))
    .max(WIDGET_IDS.length),
});

/** PUT /api/dashboard/layout — enregistre la disposition d'une vue. */
export async function PUT(req: NextRequest) {
  const auth = await apiPermission('dashboard.view');
  if (auth instanceof NextResponse) return auth;
  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });

  const widgets = resolveLayout(parsed.data.view, parsed.data.widgets);
  const supabase = createClient();
  const { error } = await supabase.from('user_dashboard_layouts').upsert(
    {
      user_id: auth.user.id,
      organization_id: auth.organizationId,
      view: parsed.data.view,
      widgets,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,organization_id,view' },
  );
  if (error) return NextResponse.json({ error: 'layout_storage_unavailable' }, { status: 503 });
  return NextResponse.json({ data: widgets });
}

/** DELETE /api/dashboard/layout?view=… — revient à la disposition par défaut. */
export async function DELETE(req: NextRequest) {
  const auth = await apiPermission('dashboard.view');
  if (auth instanceof NextResponse) return auth;
  const view = req.nextUrl.searchParams.get('view');
  if (!view || !(DASHBOARD_VIEWS as readonly string[]).includes(view)) return NextResponse.json({ error: 'invalid_view' }, { status: 400 });
  const supabase = createClient();
  const { error } = await supabase
    .from('user_dashboard_layouts')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('organization_id', auth.organizationId)
    .eq('view', view);
  if (error) return NextResponse.json({ error: 'layout_storage_unavailable' }, { status: 503 });
  return new NextResponse(null, { status: 204 });
}
