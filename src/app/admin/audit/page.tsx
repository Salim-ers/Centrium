import Link from 'next/link';
import { ArrowLeft, Activity, AlertTriangle, ShieldAlert, Users as UsersIcon } from 'lucide-react';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

import { AuditTable } from './AuditTable';
import {
  PageHeader,
  SectionHeader,
  KPICard,
  AppCard,
  AppCardBody,
} from '@/components/app';

export const dynamic = 'force-dynamic';

const CRITICAL_ACTIONS = new Set(['deleted', 'archived', 'requested']);

/**
 * Page /admin/audit — accessible UNIQUEMENT au super_admin (gate
 * middleware + double check ici). Affiche les 200 dernières activités
 * journalisées, toutes organisations confondues.
 */
export default async function AdminAuditPage() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  const { data: rows } = await admin
    .from('activities')
    .select('id, organization_id, user_id, entity_type, entity_id, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const list = rows ?? [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last24 = list.filter((r) => now - new Date(r.created_at).getTime() < day).length;
  const last7d = list.filter((r) => now - new Date(r.created_at).getTime() < 7 * day).length;
  const critical = list.filter((r) => CRITICAL_ACTIONS.has(r.action)).length;
  const uniqueUsers = new Set(list.map((r) => r.user_id).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-background text-white">
      <header className="border-b border-hairline bg-card/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-magenta" />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">
                Audit &amp; conformité
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Journal des actions sensibles · multi-tenant
              </p>
            </div>
          </div>
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Console admin
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          eyebrow="Admin"
          title={
            <>
              Journal{' '}
              <span className="qc-italic-accent font-editorial italic">d&apos;audit.</span>
            </>
          }
          description={
            <>
              Source : table <code className="text-magenta">activities</code>. À étendre
              via <code className="text-magenta">logAudit()</code> dans les services
              métier.
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <KPICard
            label="Événements 24h"
            value={last24}
            icon={Activity}
            tone="magenta"
            hint="Sur la dernière journée"
          />
          <KPICard
            label="Événements 7j"
            value={last7d}
            icon={Activity}
            tone="violet"
            hint="Sur la dernière semaine"
          />
          <KPICard
            label="Critiques"
            value={critical}
            icon={AlertTriangle}
            tone="rose"
            hint="Suppressions, archives, demandes"
          />
          <KPICard
            label="Utilisateurs actifs"
            value={uniqueUsers}
            icon={UsersIcon}
            tone="emerald"
            hint="Distinct sur 200 derniers"
          />
        </div>

        <SectionHeader
          eyebrow="Journal"
          title={
            <>
              {list.length} dernières{' '}
              <span className="qc-italic-accent font-editorial italic">activités.</span>
            </>
          }
          description="Filtrez par entité et action."
        />

        <AppCard variant="default">
          <AppCardBody size="md">
            <AuditTable rows={list} />
          </AppCardBody>
        </AppCard>
      </main>
    </div>
  );
}
