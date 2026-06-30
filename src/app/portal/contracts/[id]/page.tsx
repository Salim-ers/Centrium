'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContractDocument, type ContractDocIssuer } from '@/components/contracts/ContractDocument';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { downloadElementAsPdf } from '@/lib/pdf/download-document';
import type { Contract } from '@/types';

const STATUS_STYLE: Partial<Record<Contract['status'], string>> = {
  draft: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  pending_review: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  sent: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  signed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  ended: 'bg-slate-600/10 text-slate-400 border-slate-600/20',
  terminated: 'bg-red-500/10 text-red-300 border-red-500/20',
  cancelled: 'bg-slate-600/10 text-slate-400 border-slate-600/20',
};

const STATUS_LABEL: Record<Contract['status'], string> = {
  draft: 'Brouillon',
  pending_review: 'En revue',
  sent: 'À signer',
  signed: 'Signé',
  active: 'Actif',
  ended: 'Terminé',
  terminated: 'Résilié',
  cancelled: 'Annulé',
};

export default function PortalContractDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { branding } = useOrganization();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<HTMLDivElement | null>(null);

  // Le consultant voit le contrat avec le branding de l'org propriétaire
  // (qui = son org dans Centrium puisqu'il est membership consultant).
  const issuer: ContractDocIssuer | null = useMemo(() => {
    if (!branding) return null;
    return {
      brandName: branding.brandName ?? branding.name,
      legalName: branding.name,
      address: branding.address,
      city: branding.city,
      postalCode: branding.postalCode,
      siren: branding.siren,
      footerTagline: branding.footerTagline,
      logoUrl: branding.logoUrl,
      signatureUrl: branding.signatureUrl,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      representativeName: branding.representativeName,
      representativeTitle: branding.representativeTitle,
      version: branding.version,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding, branding?.version]);

  useEffect(() => {
    (async () => {
      if (!params?.id) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();
      if (error || !data) {
        toast.error('Contrat introuvable ou accès refusé');
        router.push('/portal/contracts');
        return;
      }
      setContract(data as Contract);
      setLoading(false);
    })();
  }, [params?.id, router]);

  if (loading) {
    return <div className="h-[70vh] rounded-xl bg-white/[0.02] animate-pulse" />;
  }
  if (!contract) return null;

  const pdfUrl = contract.signed_pdf_url || contract.pdf_url;

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/contracts">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={STATUS_STYLE[contract.status] ?? ''}>
            {STATUS_LABEL[contract.status]}
          </Badge>
          {pdfUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                PDF original
              </a>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() =>
              downloadElementAsPdf(docRef.current, {
                fileName: `Contrat_${contract.contract_number || contract.id}`,
              })
            }
          >
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      <div ref={docRef} className="bg-neutral-200 rounded-xl p-6 overflow-auto">
        <ContractDocument contract={contract} issuer={issuer} />
      </div>
    </div>
  );
}
