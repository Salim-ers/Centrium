'use client';

/**
 * Branche un callback de rechargement sur les changements postgres d'un
 * ensemble de tables Supabase. Avec migration 056, ces tables font partie
 * de la publication `supabase_realtime` — donc les events arrivent vraiment.
 *
 * - Une seule channel Supabase par tableau de tables, scope orgId.
 * - Debounce 200 ms : un drag&drop CRM ou un batch d'import peut tirer 30
 *   events en 100 ms ; on ne veut pas tirer 30 reloads.
 * - RLS appliquée par Realtime → un peer d'une autre org ne déclenche rien.
 *
 * Usage :
 *   useRealtimeReload(['missions', 'invoices'], () => reload());
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';

export function useRealtimeReload(
  tables: string[],
  onChange: () => void,
  opts: { debounceMs?: number; enabled?: boolean } = {},
) {
  const { debounceMs = 200, enabled = true } = opts;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId ?? null;

  // Clé stable du set de tables (évite de relancer la subscription quand le
  // composant rerender avec un nouveau tableau littéral identique).
  const tablesKey = tables.slice().sort().join(',');

  useEffect(() => {
    if (!enabled || !orgId || tables.length === 0) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), debounceMs);
    };

    const channel = supabase.channel(`reload:${orgId}:${tablesKey}`);
    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => trigger(),
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // tablesKey couvre les changements de contenu de `tables`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, tablesKey, debounceMs, enabled]);
}
