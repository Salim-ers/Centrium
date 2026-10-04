'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard';
import { SetupChecklist } from '@/components/dashboard/SetupChecklist';

/**
 * Tableau de bord : vues Direction, Commercial, Staffing et Finance, en
 * grille Bento personnalisable. Données agrégées côté serveur
 * (/api/dashboard), jamais simulées. Agrandi sur grand écran (.dash-zoom).
 */
export default function DashboardPage() {
  return (
    <AppShell wide>
      <div className="dash-zoom">
        <div className="mx-auto w-full max-w-[1480px]">
          <SetupChecklist />
        </div>
        <ExecutiveDashboard />
      </div>
    </AppShell>
  );
}
