'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite } from '@/hooks/useOrgDirectory';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/format';
import type { Opportunity } from '@/types';

type WonOpp = Pick<Opportunity, 'id' | 'title' | 'company_id' | 'updated_at'>;

/**
 * « Transformer une opportunité gagnée » : les opportunités gagnées qui
 * n'ont pas encore de mission, un clic prépare la mission.
 */
export function WonOpportunityPicker({
  lang,
  onPick,
  label,
  variant = 'secondary',
}: {
  lang: 'fr' | 'en';
  onPick: (opportunityId: string) => void;
  label?: string;
  variant?: 'secondary' | 'default';
}) {
  const fr = lang === 'fr';
  const { activeOrgId } = useOrganization();
  const { byId: companies } = useCompaniesLite();
  const [open, setOpen] = useState(false);

  const { data, loading } = useCachedQuery<WonOpp[]>(
    `won-opps-without-mission:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const [{ data: opps }, { data: missions }] = await Promise.all([
        supabase
          .from('opportunities')
          .select('*')
          .eq('organization_id', activeOrgId!)
          .eq('status', 'won')
          .order('updated_at', { ascending: false })
          .limit(200),
        supabase.from('missions').select('opportunity_id').eq('organization_id', activeOrgId!).not('opportunity_id', 'is', null).limit(5000),
      ]);
      const linked = new Set(((missions ?? []) as Array<{ opportunity_id: string | null }>).map((m) => m.opportunity_id));
      return ((opps ?? []) as Opportunity[]).filter((o) => !o.archived && !linked.has(o.id));
    },
    { enabled: open && !!activeOrgId },
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant}>
          <Trophy />
          {label ?? (fr ? 'Transformer une opportunité gagnée' : 'Convert a won opportunity')}
          <ChevronDown className="opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[22rem] p-0">
        <p className="border-b border-border px-4 py-2.5 text-[12.5px] font-semibold text-muted-foreground">
          {fr ? 'Gagnées, sans mission' : 'Won, without a mission'}
        </p>
        <ul className="max-h-72 overflow-y-auto py-1">
          {loading && !data && <li className="px-4 py-3 text-[13px] text-muted-foreground">{fr ? 'Chargement…' : 'Loading…'}</li>}
          {(data ?? []).map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(o.id);
                }}
                className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-app-peach-light/60"
              >
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-app-terra" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{o.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {(o.company_id && companies.get(o.company_id)?.name) || '—'} · {fr ? 'gagnée le' : 'won on'} {formatDate(o.updated_at, lang, 'short')}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {data && data.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-muted-foreground">
              {fr ? 'Aucune opportunité gagnée en attente de mission.' : 'No won opportunity waiting for a mission.'}{' '}
              <Link href="/crm" className="font-medium text-app-terra-dark underline-offset-2 hover:underline">
                {fr ? 'Voir le pipeline' : 'Open the pipeline'}
              </Link>
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
