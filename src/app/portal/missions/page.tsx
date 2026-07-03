'use client';

import { Briefcase } from 'lucide-react';

import { ConsultantMissionsList } from '@/components/missions/ConsultantMissionsList';
import { usePortalConsultant } from '../portal-context';

export default function PortalMissionsPage() {
  const { consultantId } = usePortalConsultant();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Briefcase className="h-7 w-7 text-violet-glow" />
          Mes missions
        </h1>
        <p className="text-muted-foreground mt-1">
          Toutes les missions auxquelles tu es affecté — proposées, en cours, terminées.
        </p>
      </div>

      <ConsultantMissionsList
        consultantId={consultantId}
        canManage={false}
        linkBase="/portal/missions"
      />
    </div>
  );
}
