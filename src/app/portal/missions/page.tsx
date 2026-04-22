'use client';

import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';

import { ConsultantMissionsList } from '@/components/missions/ConsultantMissionsList';
import { createClient } from '@/lib/supabase/client';

export default function PortalMissionsPage() {
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('consultant_id')
        .eq('id', userRes.user.id)
        .maybeSingle();
      setConsultantId(profile?.consultant_id ?? null);
      setLoading(false);
    })();
  }, []);

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

      {loading ? (
        <div className="h-32 rounded-xl bg-white/[0.02] animate-pulse" />
      ) : !consultantId ? (
        <p className="text-muted-foreground">Profil consultant introuvable.</p>
      ) : (
        <ConsultantMissionsList consultantId={consultantId} canManage={false} />
      )}
    </div>
  );
}
