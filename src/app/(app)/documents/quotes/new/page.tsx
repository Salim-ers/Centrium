'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { QuoteEditor, emptyQuote, type QuoteDraft } from '@/components/documents/QuoteEditor';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import type { DocumentTemplate, Opportunity } from '@/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Brouillon initial : modèle par défaut + pré-remplissage opportunité / client. */
async function buildInitial(opportunityId: string | null, clientId: string | null): Promise<QuoteDraft> {
  const supabase = createClient();
  const draft = emptyQuote();
  const { data: tpl } = await supabase.from('document_templates').select('*').eq('kind', 'quote').eq('is_default', true).maybeSingle();
  if (tpl) {
    const t = tpl as DocumentTemplate;
    draft.template_id = t.id;
    draft.intro_text = t.intro_text ?? '';
    draft.terms_text = t.terms_text ?? '';
  }
  if (opportunityId) {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, company_id, contact_id, daily_rate_eur, duration_months')
      .eq('id', opportunityId)
      .maybeSingle();
    const o = data as Pick<Opportunity, 'id' | 'title' | 'company_id' | 'contact_id' | 'daily_rate_eur' | 'duration_months'> | null;
    if (o) {
      draft.opportunity_id = o.id;
      draft.title = o.title;
      draft.company_id = o.company_id;
      draft.contact_id = o.contact_id;
      // Estimation à ajuster : ~20 jours ouvrés par mois de mission.
      const days = o.duration_months ? Math.round(Number(o.duration_months) * 20) : 1;
      draft.items = [{ description: o.title, quantity: days, unit: 'jour', unit_price: Number(o.daily_rate_eur) || 0 }];
    }
  } else if (clientId) {
    draft.company_id = clientId;
  }
  return draft;
}

export default function NewQuotePage() {
  const router = useRouter();
  const search = useSearchParams();
  const { can, ready } = usePermissions();
  const { activeOrgId } = useOrganization();
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [initial, setInitial] = useState<QuoteDraft | null>(null);

  const opp = search.get('opportunity');
  const client = search.get('client');

  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    void buildInitial(opp && UUID.test(opp) ? opp : null, client && UUID.test(client) ? client : null).then((d) => {
      if (!cancelled) setInitial(d);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrgId, opp, client]);

  if (ready && !can('documents.edit')) {
    return (
      <AppShell>
        <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'Votre rôle ne permet pas de créer des devis.' : 'Your role cannot create quotes.'} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        backHref="/documents?tab=quotes"
        backLabel={fr ? 'Devis & documents' : 'Quotes & documents'}
        title={fr ? 'Nouveau devis' : 'New quote'}
        description={fr ? 'Le numéro est attribué à l’enregistrement (DEV-AAAA-NNNN).' : 'The number is assigned on save (DEV-YYYY-NNNN).'}
      />
      {initial ? (
        <QuoteEditor initial={initial} onSaved={(q) => router.replace(`/documents/quotes/${q.id}`)} onCancel={() => router.back()} />
      ) : (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
    </AppShell>
  );
}
