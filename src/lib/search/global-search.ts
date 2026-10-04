// =========================================================================
// Recherche globale (palette de commandes)
// -------------------------------------------------------------------------
// Interroge Supabase AVEC la session de l'utilisateur : la RLS garantit
// qu'aucun résultat d'une autre organisation (ou hors périmètre d'un rôle)
// ne remonte. Chaque famille est filtrée en amont par les permissions.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Permission } from '@/lib/auth/permissions';

export type SearchKind =
  | 'client'
  | 'contact'
  | 'consultant'
  | 'mission'
  | 'opportunity'
  | 'document'
  | 'quote';

export type SearchResult = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

/**
 * Nettoie la saisie pour les filtres PostgREST `or(...)` : les virgules,
 * parenthèses et jokers ont un sens syntaxique et ne doivent jamais venir
 * de l'utilisateur.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s.'@-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

type Can = (p: Permission) => boolean;

export async function globalSearch(
  supabase: SupabaseClient,
  rawTerm: string,
  can: Can,
  limit = 5,
): Promise<SearchResult[]> {
  const q = sanitizeSearchTerm(rawTerm);
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const tasks: Array<Promise<SearchResult[]>> = [];

  if (can('clients.view')) {
    tasks.push(
      Promise.resolve(
        supabase
          .from('companies')
          .select('id, name, city, kind')
          .eq('archived', false)
          .ilike('name', like)
          .limit(limit),
      ).then(({ data }) =>
        (data ?? []).map((c) => ({
          kind: 'client' as const,
          id: c.id as string,
          title: c.name as string,
          subtitle: (c.city as string | null) ?? undefined,
          href: `/clients/${c.id}`,
        })),
      ),
    );
    tasks.push(
      Promise.resolve(
        supabase
          .from('contacts')
          .select('id, first_name, last_name, job_title, company_id, companies(name)')
          .eq('archived', false)
          .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
          .limit(limit),
      ).then(({ data }) =>
        (data ?? []).map((c) => {
          const company = (c as { companies?: { name?: string } | null }).companies?.name;
          return {
            kind: 'contact' as const,
            id: c.id as string,
            title: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
            subtitle: [c.job_title, company].filter(Boolean).join(' · ') || undefined,
            href: c.company_id ? `/clients/${c.company_id}?tab=contacts` : `/crm?tab=contacts&q=${encodeURIComponent(q)}`,
          };
        }),
      ),
    );
  }

  if (can('consultants.view')) {
    tasks.push(
      Promise.resolve(
        supabase
          .from('consultants')
          .select('id, first_name, last_name, job_title, city')
          .eq('archived', false)
          .or(`first_name.ilike.${like},last_name.ilike.${like},job_title.ilike.${like}`)
          .limit(limit),
      ).then(({ data }) =>
        (data ?? []).map((c) => ({
          kind: 'consultant' as const,
          id: c.id as string,
          title: `${c.first_name} ${c.last_name}`,
          subtitle: [c.job_title, c.city].filter(Boolean).join(' · ') || undefined,
          href: `/consultants/${c.id}`,
        })),
      ),
    );
  }

  if (can('missions.view')) {
    tasks.push(
      Promise.resolve(
        supabase
          .from('missions')
          .select('id, title, status, consultants(first_name, last_name), companies(name)')
          .ilike('title', like)
          .limit(limit),
      ).then(({ data }) =>
        (data ?? []).map((m) => {
          const row = m as {
            id: string;
            title: string;
            consultants?: { first_name?: string; last_name?: string } | null;
            companies?: { name?: string } | null;
          };
          const who = row.consultants ? `${row.consultants.first_name ?? ''} ${row.consultants.last_name ?? ''}`.trim() : '';
          return {
            kind: 'mission' as const,
            id: row.id,
            title: row.title,
            subtitle: [who, row.companies?.name].filter(Boolean).join(' · ') || undefined,
            href: `/missions/${row.id}`,
          };
        }),
      ),
    );
  }

  if (can('opportunities.view')) {
    tasks.push(
      Promise.resolve(
        supabase
          .from('opportunities')
          .select('id, title, companies(name)')
          .ilike('title', like)
          .limit(limit),
      ).then(({ data }) =>
        (data ?? []).map((o) => ({
          kind: 'opportunity' as const,
          id: o.id as string,
          title: o.title as string,
          subtitle: (o as { companies?: { name?: string } | null }).companies?.name ?? undefined,
          href: `/opportunities/${o.id}`,
        })),
      ),
    );
  }

  if (can('documents.view')) {
    // Tables V2 : absentes tant que la migration 096 n'est pas appliquée
    // → erreur ignorée, la recherche continue sur le reste.
    tasks.push(
      Promise.resolve(
        supabase.from('documents').select('id, title, kind').ilike('title', like).limit(limit),
      ).then(({ data, error }) =>
        error
          ? []
          : (data ?? []).map((d) => ({
              kind: 'document' as const,
              id: d.id as string,
              title: d.title as string,
              href: `/documents?doc=${d.id}`,
            })),
      ),
    );
    tasks.push(
      Promise.resolve(
        supabase
          .from('quotes')
          .select('id, number, title, companies(name)')
          .or(`title.ilike.${like},number.ilike.${like}`)
          .limit(limit),
      ).then(({ data, error }) =>
        error
          ? []
          : (data ?? []).map((d) => ({
              kind: 'quote' as const,
              id: d.id as string,
              title: `${d.number ?? ''} ${d.title ?? ''}`.trim(),
              subtitle: (d as { companies?: { name?: string } | null }).companies?.name ?? undefined,
              href: `/documents/quotes/${d.id}`,
            })),
      ),
    );
  }

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));
}
