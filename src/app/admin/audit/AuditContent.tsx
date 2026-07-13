'use client';

import { Activity, AlertTriangle, Users as UsersIcon } from 'lucide-react';

import { AuditTable, type AuditRow } from './AuditTable';
import { AdminConsoleHeader } from '@/components/admin/AdminConsoleHeader';
import {
  PageHeader,
  SectionHeader,
  KPICard,
  AppCard,
  AppCardBody,
} from '@/components/app';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Props = {
  rows: AuditRow[];
  last24: number;
  last7d: number;
  critical: number;
  uniqueUsers: number;
};

/**
 * Rendu (client) de la console d'audit — extrait de la page serveur (qui
 * garde l'auth super_admin + la requête cross-org) pour la bilinguisation.
 */
export function AuditContent({ rows, last24, last7d, critical, uniqueUsers }: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminConsoleHeader
        title={isEn ? 'Audit & compliance' : 'Audit & conformité'}
        subtitle={isEn ? 'Sensitive actions log · multi-tenant' : 'Journal des actions sensibles · multi-tenant'}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          eyebrow="Admin"
          title={
            isEn ? (
              <>
                Audit{' '}
                <span className="qc-italic-accent font-editorial italic">log.</span>
              </>
            ) : (
              <>
                Journal{' '}
                <span className="qc-italic-accent font-editorial italic">d&apos;audit.</span>
              </>
            )
          }
          description={
            isEn ? (
              <>
                Source: <code className="text-magenta">activities</code> table. Extend it via{' '}
                <code className="text-magenta">logAudit()</code> in the business services.
              </>
            ) : (
              <>
                Source : table <code className="text-magenta">activities</code>. À étendre
                via <code className="text-magenta">logAudit()</code> dans les services
                métier.
              </>
            )
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <KPICard
            label={isEn ? 'Events 24h' : 'Événements 24h'}
            value={last24}
            icon={Activity}
            tone="magenta"
            hint={isEn ? 'Over the last day' : 'Sur la dernière journée'}
          />
          <KPICard
            label={isEn ? 'Events 7d' : 'Événements 7j'}
            value={last7d}
            icon={Activity}
            tone="violet"
            hint={isEn ? 'Over the last week' : 'Sur la dernière semaine'}
          />
          <KPICard
            label={isEn ? 'Critical' : 'Critiques'}
            value={critical}
            icon={AlertTriangle}
            tone="rose"
            hint={isEn ? 'Deletions, archives, requests' : 'Suppressions, archives, demandes'}
          />
          <KPICard
            label={isEn ? 'Active users' : 'Utilisateurs actifs'}
            value={uniqueUsers}
            icon={UsersIcon}
            tone="emerald"
            hint={isEn ? 'Distinct over last 200' : 'Distinct sur 200 derniers'}
          />
        </div>

        <SectionHeader
          eyebrow={isEn ? 'Log' : 'Journal'}
          title={
            isEn ? (
              <>
                {rows.length} latest{' '}
                <span className="qc-italic-accent font-editorial italic">activities.</span>
              </>
            ) : (
              <>
                {rows.length} dernières{' '}
                <span className="qc-italic-accent font-editorial italic">activités.</span>
              </>
            )
          }
          description={isEn ? 'Filter by entity and action.' : 'Filtrez par entité et action.'}
        />

        <AppCard variant="default">
          <AppCardBody size="md">
            <AuditTable rows={rows} />
          </AppCardBody>
        </AppCard>
      </main>
    </div>
  );
}
