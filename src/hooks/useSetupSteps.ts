'use client';

import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export type SetupStep = {
  key: 'identity' | 'branding' | 'team' | 'consultants' | 'clients';
  done: boolean;
  label: string;
  hint: string;
  href: string;
};

type SetupState = {
  identity: boolean;
  branding: boolean;
  team: boolean;
  consultants: boolean;
  clients: boolean;
};

/**
 * État RÉEL de la mise en route de l'organisation (aucune étape cochée
 * par défaut). Partagé par la progression de la sidebar et le dashboard.
 */
export function useSetupSteps() {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId ?? null;
  const { locale } = useLocale();
  const fr = locale !== 'en';

  const { data, loading } = useCachedQuery<SetupState>(
    `setup-steps:${orgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const [orgRow, members, consultants, clients] = await Promise.all([
        supabase.from('organizations').select('siren, address, logo_url').eq('id', orgId!).maybeSingle(),
        supabase
          .from('organization_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', orgId!),
        supabase
          .from('consultants')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('archived', false),
        supabase
          .from('companies')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('archived', false),
      ]);
      return {
        identity: !!orgRow.data?.siren && !!orgRow.data?.address,
        branding: !!orgRow.data?.logo_url,
        team: (members.count ?? 0) > 1,
        consultants: (consultants.count ?? 0) > 0,
        clients: (clients.count ?? 0) > 0,
      };
    },
    { enabled: !!orgId },
  );

  const steps: SetupStep[] = data
    ? [
        {
          key: 'identity',
          done: data.identity,
          label: fr ? 'Identité de la société' : 'Company identity',
          hint: fr ? 'SIREN, adresse, informations commerciales' : 'SIREN, address, business details',
          href: '/settings/facturation',
        },
        {
          key: 'branding',
          done: data.branding,
          label: fr ? 'Logo et branding' : 'Logo and branding',
          hint: fr ? 'Utilisés sur vos devis, dossiers et portails' : 'Used on quotes, dossiers and portals',
          href: '/settings/branding',
        },
        {
          key: 'team',
          done: data.team,
          label: fr ? 'Inviter l’équipe' : 'Invite your team',
          hint: fr ? 'Business managers, recruteurs, finance' : 'Business managers, recruiters, finance',
          href: '/settings/team',
        },
        {
          key: 'consultants',
          done: data.consultants,
          label: fr ? 'Importer les consultants' : 'Import consultants',
          hint: fr ? 'Depuis un CSV ou des CV' : 'From a CSV file or CVs',
          href: '/consultants',
        },
        {
          key: 'clients',
          done: data.clients,
          label: fr ? 'Ajouter les clients' : 'Add clients',
          hint: fr ? 'Pour suivre opportunités et missions' : 'To track opportunities and missions',
          href: '/clients?import=1',
        },
      ]
    : [];

  const doneCount = steps.filter((s) => s.done).length;
  return {
    loading,
    steps,
    doneCount,
    total: steps.length,
    complete: steps.length > 0 && doneCount === steps.length,
  };
}
