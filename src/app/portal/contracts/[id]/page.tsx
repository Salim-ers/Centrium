'use client';

import { useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Eraser, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContractDocument, type ContractDocIssuer } from '@/components/contracts/ContractDocument';
import { SignaturePad, type SignaturePadHandle } from '@/components/portal/SignaturePad';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
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
  const docRef = useRef<HTMLDivElement | null>(null);

  // --- Signature ---
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [consent, setConsent] = useState(false);
  const [padDirty, setPadDirty] = useState(false);
  const [signing, setSigning] = useState(false);

  const {
    data: contract,
    loading,
    setData: setContract,
  } = useCachedQuery<Contract | null>(
    `portal-contract:${params?.id ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', params!.id)
        .maybeSingle();
      if (error || !data) {
        toast.error('Contrat introuvable ou accès refusé');
        router.push('/portal/contracts');
        return null;
      }
      return data as Contract;
    },
    { enabled: !!params?.id },
  );

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

  async function sign() {
    if (!contract) return;
    const signatureData = padRef.current?.toDataURL();
    if (!signatureData) {
      toast.error('Trace ta signature dans le cadre avant de valider.');
      return;
    }
    if (signedName.trim().length < 3) {
      toast.error('Saisis ton nom complet.');
      return;
    }
    if (!consent) {
      toast.error('Coche la case de consentement pour signer.');
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/portal/contracts/${contract.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_data: signatureData, signed_name: signedName.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? 'Signature impossible — réessaie.');
        return;
      }
      setContract(body.data as Contract);
      setSignOpen(false);
      toast.success('Contrat signé — ton employeur a été notifié.');
    } catch {
      toast.error('Erreur réseau — vérifie ta connexion.');
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <div className="h-[70vh] rounded-xl bg-foreground/[0.03] animate-pulse" />;
  }
  if (!contract) return null;

  const pdfUrl = contract.signed_pdf_url || contract.pdf_url;
  const canSign =
    (contract.status === 'sent' || contract.status === 'pending_review') &&
    !contract.consultant_signed_at;

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
            variant="outline"
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
          {canSign && (
            <Button size="sm" onClick={() => setSignOpen(true)}>
              <PenLine className="h-4 w-4" />
              Signer ce contrat
            </Button>
          )}
        </div>
      </div>

      {canSign && (
        <div className="no-print mb-4 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/[0.07] px-4 py-3">
          <PenLine className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-blue-600 dark:text-blue-300/90">
            Ce contrat attend ta signature. Relis-le, puis clique sur «&nbsp;Signer ce
            contrat&nbsp;» — ta signature manuscrite sera apposée sur le document et ton
            employeur sera notifié.
          </p>
        </div>
      )}

      <div ref={docRef} className="bg-neutral-200 rounded-xl p-6 overflow-auto">
        <ContractDocument contract={contract} issuer={issuer} />
      </div>

      <Dialog open={signOpen} onOpenChange={(v) => !signing && setSignOpen(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Signer le contrat {contract.contract_number}</DialogTitle>
            <DialogDescription>
              Trace ta signature dans le cadre ci-dessous, comme sur papier. Elle sera
              apposée sur le document au nom de ta société.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Signature manuscrite
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => padRef.current?.clear()}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Effacer
                </Button>
              </div>
              <SignaturePad ref={padRef} height={170} onDirtyChange={setPadDirty} />
            </div>

            <div>
              <Label htmlFor="signed-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nom complet
              </Label>
              <Input
                id="signed-name"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Prénom Nom"
                className="mt-1.5"
                autoComplete="name"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-current"
              />
              <span>
                Je reconnais avoir lu l&apos;intégralité du contrat {contract.contract_number} et
                consens à le signer électroniquement. Cette signature a valeur d&apos;engagement.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)} disabled={signing}>
              Annuler
            </Button>
            <Button onClick={sign} disabled={signing || !padDirty || !consent || signedName.trim().length < 3}>
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              Signer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
