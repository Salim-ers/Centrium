'use client';

import Link from 'next/link';
import { ChevronRight, FileSignature, Receipt } from 'lucide-react';

import { useOrganization } from '@/lib/auth/context';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { KycDocuments } from '@/components/consultants/KycDocuments';
import { ConsultantSelfDocuments } from '@/components/portal/ConsultantSelfDocuments';
import { SharedDocumentsList } from '@/components/portal/SharedDocumentsList';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyProfile, isIndependent, type PortalProfile } from '@/lib/portal/consultant-data';
import { usePortalConsultant } from '../portal-context';

type ToSign = { id: string; title: string | null; contract_number: string | null };

/**
 * Mes documents : ce qui attend une signature, les pièces administratives
 * utiles à son statut, ce que l'ESN a transmis et ses propres fichiers.
 */
export default function PortalDocumentsPage() {
  const { consultantId, userId } = usePortalConsultant();
  const { activeOrgId: orgId } = useOrganization();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const { data: profile } = useCachedQuery<PortalProfile | null>(`portal-profile:${consultantId}`, () => fetchMyProfile(createClient()));
  const { data: toSign } = useCachedQuery<ToSign[]>(`portal-to-sign:${consultantId}`, async () => {
    const { data } = await createClient().from('contracts').select('id, title, contract_number').in('status', ['sent', 'pending_review']).limit(10);
    return (data ?? []) as ToSign[];
  });
  const independent = isIndependent(profile?.contract_type);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Mes documents' : 'My documents'}</h1>
        <p className="text-[13.5px] text-muted-foreground">
          {fr ? `Vos pièces, vos fichiers et ceux transmis par ${brandName}.` : `Your documents, your files and those shared by ${brandName}.`}
        </p>
      </header>

      {toSign && toSign.length > 0 && (
        <section aria-labelledby="docs-to-sign" className="space-y-2">
          <h2 id="docs-to-sign" className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            {fr ? 'À signer' : 'To sign'}
          </h2>
          <ul className="space-y-2">
            {toSign.map((c) => (
              <li key={c.id}>
                <Link href={`/portal/contracts/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card px-4 py-3.5 hover:bg-muted/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileSignature className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.title ?? c.contract_number ?? (fr ? 'Contrat' : 'Contract')}</span>
                    {c.title && c.contract_number && <span className="block text-[12.5px] text-muted-foreground">{c.contract_number}</span>}
                  </span>
                  <span className="shrink-0 text-[13px] font-medium text-primary-deep">{fr ? 'Signer' : 'Sign'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orgId && (
        <KycDocuments consultantId={consultantId} organizationId={orgId} asConsultant currentUserId={userId} contractType={profile?.contract_type ?? null} />
      )}

      <SharedDocumentsList
        endpoint="/api/portal/documents"
        cacheKey={`portal-shared-docs:${consultantId}`}
        title={fr ? `Transmis par ${brandName}` : `Shared by ${brandName}`}
      />

      <ConsultantSelfDocuments consultantId={consultantId} userId={userId} orgId={orgId} />

      <nav aria-label={fr ? 'Autres documents' : 'Other documents'} className="grid gap-2 sm:grid-cols-2">
        <LinkCard
          href="/portal/contracts"
          icon={FileSignature}
          title={fr ? 'Mes contrats' : 'My contracts'}
          detail={fr ? 'Signés, en cours et passés' : 'Signed, current and past'}
        />
        {independent && (
          <LinkCard
            href="/portal/invoices"
            icon={Receipt}
            title={fr ? 'Mes factures' : 'My invoices'}
            detail={fr ? `Vos factures à ${brandName} et leurs paiements` : `Your invoices to ${brandName} and their payments`}
          />
        )}
      </nav>
    </div>
  );
}

function LinkCard({ href, icon: Icon, title, detail }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; detail: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-muted/40">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block truncate text-[12.5px] text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
