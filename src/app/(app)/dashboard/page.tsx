'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard';

/**
 * Tableau de bord : vues Direction, Commercial, Staffing et Finance, en
 * grille Bento contrôlée qui tient sur un écran. Données agrégées côté
 * serveur (/api/dashboard), jamais simulées. Agrandi sur grand écran
 * (.dash-zoom).
 */
export default function DashboardPage() {
  return (
    <AppShell fill>
      <div className="dash-zoom flex min-h-0 flex-1 flex-col">
        <ExecutiveDashboard />
      </div>
    </AppShell>
  );
}
