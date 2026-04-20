'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Edit, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuadCoreContractAT } from '@/components/contracts/QuadCoreContractAT';
import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { contractService } from '@/lib/services/contract.service';
import type { Contract, ContractStatus } from '@/types';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

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

  function printContract() {
    window.print();
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
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Contrat introuvable
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Toolbar — masquée à l'impression */}
      <div className="no-print">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/contracts')}>
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">
                {contract.contract_number}
              </h1>
              <p className="text-sm text-muted-foreground">{contract.title}</p>
            </div>
            <Badge variant="outline" className="ml-2">
              {contract.status}
            </Badge>
          </div>
          <div className="flex gap-2">
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
            <Button onClick={printContract}>
              <Download className="h-4 w-4" />
              Exporter PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Preview du contrat */}
      <div className="overflow-auto bg-neutral-200 p-6 rounded-xl no-print">
        <QuadCoreContractAT contract={contract} />
      </div>

      {/* Version print plein écran */}
      <div className="hidden print:block">
        <QuadCoreContractAT contract={contract} />
      </div>

      <ContractFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={ORG_ID}
        contract={contract}
        onSaved={(c) => setContract(c)}
      />
    </AppShell>
  );
}
