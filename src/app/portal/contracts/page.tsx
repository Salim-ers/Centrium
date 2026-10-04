'use client';

import Link from 'next/link';
import { FileSignature, FileText, Eye, CheckCircle2, Clock, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageHeader,
  KPICard,
  AppCard,
  AppCardBody,
  StatusBadge,
  EmptyState,
  Reveal,
  type StatusTone,
} from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { formatDate, formatCurrency } from '@/lib/utils';
import { usePortalConsultant } from '../portal-context';
import type { Contract } from '@/types';

const STATUS_TONE: Record<
  Contract['status'],
  { tone: StatusTone; label: string; label_en: string }
> = {
  draft: { tone: 'pending', label: 'Brouillon', label_en: 'Draft' },
  pending_review: { tone: 'warning', label: 'En revue', label_en: 'In review' },
  sent: { tone: 'warning', label: 'À signer', label_en: 'To sign' },
  signed: { tone: 'success', label: 'Signé', label_en: 'Signed' },
  active: { tone: 'success', label: 'Actif', label_en: 'Active' },
  ended: { tone: 'neutral', label: 'Terminé', label_en: 'Ended' },
  terminated: { tone: 'danger', label: 'Résilié', label_en: 'Terminated' },
  cancelled: { tone: 'neutral', label: 'Annulé', label_en: 'Cancelled' },
};

export default function PortalContractsPage() {
  const brandName = useBrandName();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { consultantId } = usePortalConsultant();
  const { data, loading } = useCachedQuery<Contract[]>(
    `portal-contracts:${consultantId}`,
    async () => {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from('contracts')
        .select('*')
        .order('start_date', { ascending: false });
      return (rows ?? []) as Contract[];
    },
  );
  const contracts = data ?? [];

  const active = contracts.filter((c) => c.status === 'active' || c.status === 'signed').length;
  const toSign = contracts.filter((c) => c.status === 'sent' || c.status === 'pending_review').length;
  const ended = contracts.filter(
    (c) => c.status === 'ended' || c.status === 'terminated' || c.status === 'cancelled',
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow={isEn ? 'My space' : 'Mon espace'}
        title={
          isEn ? (
            <>My <span className="text-primary font-display ">contracts.</span></>
          ) : (
            <>Mes <span className="text-primary font-display ">contrats.</span></>
          )
        }
        description={
          isEn
            ? `Find your contracts with ${brandName} and download the PDFs.`
            : `Retrouvez vos contrats avec ${brandName} et téléchargez les PDF.`
        }
      />

      <Reveal className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <KPICard label={isEn ? 'Active contracts' : 'Contrats actifs'} value={active} icon={CheckCircle2} tone="emerald" />
        <KPICard label={isEn ? 'To sign' : 'À signer'} value={toSign} icon={Clock} tone="amber" />
        <KPICard label={isEn ? 'Ended' : 'Terminés'} value={ended} icon={XCircle} tone="violet" />
      </Reveal>

      {loading ? (
        <div className="h-40 rounded-2xl bg-foreground/[0.03] animate-pulse" />
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={isEn ? 'No contracts yet' : 'Aucun contrat pour le moment'}
          description={
            isEn
              ? `Your contracts with ${brandName} will appear here as soon as they are created.`
              : `Vos contrats avec ${brandName} apparaîtront ici dès qu'ils seront créés.`
          }
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((c, idx) => {
            const s = STATUS_TONE[c.status];
            const pulse = c.status === 'sent' || c.status === 'pending_review';
            return (
              <Reveal key={c.id} delay={0.06 + idx * 0.04}>
              <AppCard interactive>
                <AppCardBody>
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div className="min-w-0">
                      <div className="font-display text-lg tracking-[-0.01em] text-foreground">
                        {c.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {c.contract_number}
                      </p>
                    </div>
                    <StatusBadge tone={s.tone} pulse={pulse}>
                      {isEn ? s.label_en : s.label}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <Field label="Client" value={c.client_name ?? '—'} />
                    <Field label="Mission" value={c.mission_title ?? '—'} />
                    <Field label="TJM" value={formatCurrency(Number(c.daily_rate_eur))} />
                    <Field
                      label={isEn ? 'Period' : 'Période'}
                      value={`${formatDate(c.start_date)} — ${c.end_date ? formatDate(c.end_date) : isEn ? 'Ongoing' : 'En cours'}`}
                    />
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-hairline/60 flex-wrap">
                    <Button size="sm" asChild>
                      <Link href={`/portal/contracts/${c.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        {isEn ? 'View & download' : <>Voir &amp; télécharger</>}
                      </Link>
                    </Button>
                    {c.signed_pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={c.signed_pdf_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-3.5 w-3.5" />
                          {isEn ? 'Signed contract (PDF)' : 'Contrat signé (PDF)'}
                        </a>
                      </Button>
                    )}
                    {!c.signed_pdf_url && c.pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-3.5 w-3.5" />
                          {isEn ? 'Original PDF' : 'PDF original'}
                        </a>
                      </Button>
                    )}
                  </div>
                </AppCardBody>
              </AppCard>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </div>
      <div className="font-medium mt-0.5 text-foreground truncate">{value}</div>
    </div>
  );
}
