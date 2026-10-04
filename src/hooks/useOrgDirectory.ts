'use client';

// =========================================================================
// Annuaire de l'organisation (équipe, clients, contacts, consultants) pour
// les sélecteurs et l'affichage des noms. Données légères, mises en cache
// par session (useCachedQuery), toujours lues sous RLS.
// =========================================================================

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useCachedQuery } from './useCachedQuery';
import type { ComboboxOption } from '@/components/ui/Combobox';

export type TeamMember = {
  user_id: string;
  role: string;
  name: string;
  email: string | null;
};

export function useTeamMembers() {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const q = useCachedQuery<TeamMember[]>(
    `team-members:${orgId ?? 'none'}`,
    async () => {
      const r = await fetch('/api/organizations/members', { credentials: 'include' });
      if (!r.ok) return [];
      const body = (await r.json()) as {
        data?: { members?: Array<{ user_id: string; role: string; email: string | null; first_name: string | null; last_name: string | null }> };
      };
      return (body.data?.members ?? []).map((m) => ({
        user_id: m.user_id,
        role: m.role,
        email: m.email,
        name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email || '—',
      }));
    },
    { enabled: !!orgId },
  );
  const byId = useMemo(() => new Map((q.data ?? []).map((m) => [m.user_id, m])), [q.data]);
  const options: ComboboxOption[] = useMemo(
    () => (q.data ?? []).map((m) => ({ value: m.user_id, label: m.name, sublabel: m.email ?? undefined })),
    [q.data],
  );
  return { members: q.data ?? [], byId, options, loading: q.loading };
}

export type CompanyLite = { id: string; name: string; kind: string | null; city: string | null };

export function useCompaniesLite() {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const q = useCachedQuery<CompanyLite[]>(
    `companies-lite:${orgId ?? 'none'}`,
    async () => {
      const { data } = await createClient()
        .from('companies')
        .select('id, name, kind, city')
        .eq('organization_id', orgId!)
        .eq('archived', false)
        .order('name')
        .limit(5000);
      return (data ?? []) as CompanyLite[];
    },
    { enabled: !!orgId },
  );
  const byId = useMemo(() => new Map((q.data ?? []).map((c) => [c.id, c])), [q.data]);
  const options: ComboboxOption[] = useMemo(
    () => (q.data ?? []).map((c) => ({ value: c.id, label: c.name, sublabel: c.city ?? undefined })),
    [q.data],
  );
  return { companies: q.data ?? [], byId, options, loading: q.loading, reload: q.reload };
}

export type ContactLite = {
  id: string;
  first_name: string;
  last_name: string;
  company_id: string | null;
  email: string | null;
  job_title: string | null;
};

export function useContactsLite() {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const q = useCachedQuery<ContactLite[]>(
    `contacts-lite:${orgId ?? 'none'}`,
    async () => {
      const { data } = await createClient()
        .from('contacts')
        .select('id, first_name, last_name, company_id, email, job_title')
        .eq('organization_id', orgId!)
        .eq('archived', false)
        .order('last_name')
        .limit(10000);
      return (data ?? []) as ContactLite[];
    },
    { enabled: !!orgId },
  );
  const byId = useMemo(() => new Map((q.data ?? []).map((c) => [c.id, c])), [q.data]);
  const optionsFor = (companyId?: string | null): ComboboxOption[] =>
    (q.data ?? [])
      .filter((c) => !companyId || c.company_id === companyId)
      .map((c) => ({
        value: c.id,
        label: `${c.first_name} ${c.last_name}`,
        sublabel: c.job_title ?? c.email ?? undefined,
      }));
  return { contacts: q.data ?? [], byId, optionsFor, loading: q.loading };
}

export type ConsultantLiteRow = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  status: string;
  city: string | null;
  is_prospect: boolean;
};

export function useConsultantsLite() {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const q = useCachedQuery<ConsultantLiteRow[]>(
    `consultants-lite:${orgId ?? 'none'}`,
    async () => {
      const { data } = await createClient()
        .from('consultants')
        .select('id, first_name, last_name, job_title, status, city, is_prospect')
        .eq('organization_id', orgId!)
        .eq('archived', false)
        .order('last_name')
        .limit(5000);
      return (data ?? []) as ConsultantLiteRow[];
    },
    { enabled: !!orgId },
  );
  const byId = useMemo(() => new Map((q.data ?? []).map((c) => [c.id, c])), [q.data]);
  const options: ComboboxOption[] = useMemo(
    () =>
      (q.data ?? [])
        .filter((c) => !c.is_prospect)
        .map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}`, sublabel: c.job_title ?? undefined })),
    [q.data],
  );
  return { consultants: q.data ?? [], byId, options, loading: q.loading };
}

export type MissionLite = {
  id: string;
  title: string;
  status: string;
  company_id: string | null;
  consultant_id: string | null;
};

export function useMissionsLite(enabled = true) {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const q = useCachedQuery<MissionLite[]>(
    `missions-lite:${orgId ?? 'none'}`,
    async () => {
      const { data } = await createClient()
        .from('missions')
        .select('id, title, status, company_id, consultant_id')
        .eq('organization_id', orgId!)
        .eq('archived', false)
        .order('start_date', { ascending: false })
        .limit(2000);
      return (data ?? []) as MissionLite[];
    },
    { enabled: !!orgId && enabled },
  );
  const byId = useMemo(() => new Map((q.data ?? []).map((m) => [m.id, m])), [q.data]);
  const optionsFor = (filter: { companyId?: string | null; consultantId?: string | null }): ComboboxOption[] =>
    (q.data ?? [])
      .filter((m) => (!filter.companyId || m.company_id === filter.companyId) && (!filter.consultantId || m.consultant_id === filter.consultantId))
      .map((m) => ({ value: m.id, label: m.title }));
  return { missions: q.data ?? [], byId, optionsFor, loading: q.loading };
}
