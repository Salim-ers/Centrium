'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSignature, CheckCircle2, Clock, FileText, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { formatDate, formatCurrency } from '@/lib/utils';
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

export default function PortalContractsPage() {
  const brandName = useBrandName();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .order('start_date', { ascending: false });
      setContracts((data ?? []) as Contract[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileSignature className="h-7 w-7 text-violet-glow" />
          Mes contrats
        </h1>
        <p className="text-muted-foreground mt-1">
          Retrouve tes contrats avec {brandName} et télécharge les PDF.
        </p>
      </div>

      {loading ? (
        <div className="h-40 rounded-xl bg-white/[0.02] animate-pulse" />
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun contrat pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {c.contract_number}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLE[c.status] ?? ''}>
                    {c.status === 'signed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {c.status === 'sent' && <Clock className="h-3 w-3 mr-1" />}
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Field label="Client" value={c.client_name ?? '—'} />
                  <Field label="Mission" value={c.mission_title ?? '—'} />
                  <Field label="TJM" value={formatCurrency(Number(c.daily_rate_eur))} />
                  <Field
                    label="Période"
                    value={`${formatDate(c.start_date)} — ${c.end_date ? formatDate(c.end_date) : 'En cours'}`}
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-hairline flex-wrap">
                  <Button size="sm" asChild>
                    <Link href={`/portal/contracts/${c.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Voir &amp; télécharger (PDF)
                    </Link>
                  </Button>
                  {c.signed_pdf_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={c.signed_pdf_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3.5 w-3.5" />
                        Contrat signé (PDF original)
                      </a>
                    </Button>
                  )}
                  {!c.signed_pdf_url && c.pdf_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3.5 w-3.5" />
                        PDF original
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}
