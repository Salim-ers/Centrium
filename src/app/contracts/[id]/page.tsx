'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Edit, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

import { downloadElementAsPdf } from '@/lib/pdf/download-document';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { PageHeader, StatusBadge, EmptyState, type StatusTone } from '@/components/app';
import {
  QuadCoreContractAT,
  type ContractIssuer,
} from '@/components/contracts/QuadCoreContractAT';
import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { contractService } from '@/lib/services/contract.service';
import { useOrganization } from '@/lib/auth/context';
import type { Contract, ContractStatus } from '@/types';

const STATUS_TONE: Record<ContractStatus, StatusTone> = {
  draft: 'pending',
  pending_review: 'warning',
  sent: 'info',
  signed: 'success',
  active: 'success',
  ended: 'neutral',
  terminated: 'danger',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: 'Brouillon',
  pending_review: 'À relire',
  sent: 'Envoyé',
  signed: 'Signé',
  active: 'Actif',
  ended: 'Terminé',
  terminated: 'Résilié',
  cancelled: 'Annulé',
};

export default function ContractDetailPage() {
  const { activeOrgId, branding } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const docRef = useRef<HTMLDivElement | null>(null);

  // Issuer dérivé directement du branding context (Phase 3).
  const issuer: ContractIssuer | null = useMemo(() => {
    if (!branding) return null;
    return {
      brandName: branding.brandName ?? branding.name,
      legalName: branding.name,
      legalForm: branding.legalForm,
      capitalEur: branding.capitalEur,
      address: branding.address,
      city: branding.city,
      postalCode: branding.postalCode,
      country: branding.country,
      rcs: branding.rcs,
      representativeName: branding.representativeName,
      representativeTitle: branding.representativeTitle,
      logoUrl: branding.logoUrl,
      footerTagline: branding.footerTagline,
      signatureUrl: branding.signatureUrl,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding, branding?.version]);

  useEffect(() => {
    if (!id) return;
    contractService.getById(id).then((res) => {
      if (res.data) setContract(res.data);
      setLoading(false);
    });
  }, [id]);

  async function updateStatus(status: ContractStatus) {
    if (!contract) return;
    const res = await contractService.updateStatus(contract.id, status);
    if (res.error) return toast.error('Erreur');
    setContract({ ...contract, status });
    toast.success('Statut mis à jour');
  }

  function downloadPdf() {
    if (!contract) return;
    downloadElementAsPdf(docRef.current, {
      fileName: `Contrat_${contract.contract_number || contract.id}`,
    });
  }

  if (loading) {
    return (
      <AppShell>
        <div className="h-64 animate-pulse bg-white/[0.02] rounded-xl" />
      </AppShell>
    );
  }

  if (!contract) {
    return (
      <AppShell>
        <EmptyState
          icon={ArrowLeft}
          title="Contrat introuvable"
          description="Ce contrat n’existe plus ou a été supprimé."
          action={
            <Button variant="outline" onClick={() => router.push('/contracts')}>
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Toolbar — masquée à l'impression */}
      <div className="no-print">
        <PageHeader
          eyebrow={`Contrat · ${contract.contract_number}`}
          title={
            <>
              {contract.title}{' '}
              <span className="qc-italic-accent font-editorial italic">.</span>
            </>
          }
          description={
            <span className="inline-flex items-center gap-2">
              <StatusBadge tone={STATUS_TONE[contract.status]}>
                {STATUS_LABEL[contract.status]}
              </StatusBadge>
              {contract.client_name && <span>· Client : {contract.client_name}</span>}
            </span>
          }
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push('/contracts')}>
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
              {contract.status === 'draft' && (
                <Button variant="outline" onClick={() => updateStatus('sent')}>
                  <Send className="h-4 w-4" />
                  Marquer envoyé
                </Button>
              )}
              {contract.status === 'sent' && (
                <Button variant="outline" onClick={() => updateStatus('signed')}>
                  <CheckCircle2 className="h-4 w-4" />
                  Marquer signé
                </Button>
              )}
              <Button onClick={downloadPdf}>
                <Download className="h-4 w-4" />
                Télécharger PDF
              </Button>
            </>
          }
        />
      </div>

      {/* Preview du contrat (sert aussi de source pour le PDF) */}
      <div ref={docRef} className="overflow-auto bg-neutral-200 p-6 rounded-xl">
        <QuadCoreContractAT contract={contract} issuer={issuer} />
      </div>

      <ContractFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={activeOrgId ?? ''}
        contract={contract}
        onSaved={(c) => setContract(c)}
      />
    </AppShell>
  );
}
