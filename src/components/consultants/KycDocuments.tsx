'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Upload,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Building2,
  Contact,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const BUCKET = 'consultant-documents';

export type KycSlotKind = 'kbis' | 'id_card' | 'rc_pro' | 'rib';

export const KYC_SLOTS: Array<{
  kind: KycSlotKind;
  label: string;
  hint: string;
  icon: typeof FileText;
}> = [
  {
    kind: 'kbis',
    label: 'Extrait Kbis',
    hint: '< 3 mois — preuve d\'immatriculation de la société.',
    icon: Building2,
  },
  {
    kind: 'id_card',
    label: "Pièce d'identité",
    hint: 'Carte nationale, passeport ou titre de séjour.',
    icon: Contact,
  },
  {
    kind: 'rc_pro',
    label: 'Attestation RC Pro',
    hint: 'Responsabilité civile professionnelle en cours de validité.',
    icon: ShieldCheck,
  },
  {
    kind: 'rib',
    label: 'RIB',
    hint: 'Coordonnées bancaires pour les règlements.',
    icon: CreditCard,
  },
];

type DocRow = {
  id: string;
  consultant_id: string;
  kind: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

type Props = {
  consultantId: string;
  organizationId: string;
  /** true côté portail (le consultant peut déposer / supprimer ses propres docs).
   *  false côté admin (lecture + téléchargement, suppression à distance). */
  asConsultant?: boolean;
  /** Côté admin : userId courant pour identifier ses propres uploads. */
  currentUserId?: string | null;
};

export function KycDocuments({
  consultantId,
  organizationId,
  asConsultant = false,
  currentUserId = null,
}: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<KycSlotKind | null>(null);

  async function reload() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_documents')
      .select('*')
      .eq('consultant_id', consultantId)
      .in(
        'kind',
        KYC_SLOTS.map((s) => s.kind),
      )
      .order('uploaded_at', { ascending: false });
    if (!error) setDocs((data ?? []) as DocRow[]);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantId]);

  function latestDocFor(kind: KycSlotKind): DocRow | null {
    return docs.find((d) => d.kind === kind) ?? null;
  }

  async function uploadFor(kind: KycSlotKind, file: File) {
    setBusyKind(kind);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        toast.error('Session expirée, reconnecte-toi.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Fichier trop gros (10 Mo max).');
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${organizationId}/${consultantId}/${kind}-${Date.now()}-${safeName}`;

      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (up.error) {
        toast.error('Upload échoué : ' + up.error.message);
        return;
      }

      // Si un doc du même kind existe déjà, on le remplace (DB + storage).
      const previous = latestDocFor(kind);

      const ins = await supabase.from('consultant_documents').insert({
        consultant_id: consultantId,
        kind,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: userId,
        visible_to_consultant: true,
      });
      if (ins.error) {
        toast.error('Enregistrement échoué : ' + ins.error.message);
        await supabase.storage.from(BUCKET).remove([path]);
        return;
      }

      if (previous) {
        await Promise.all([
          supabase.storage.from(BUCKET).remove([previous.storage_path]),
          supabase.from('consultant_documents').delete().eq('id', previous.id),
        ]);
      }

      toast.success('Document ajouté');
      reload();
    } finally {
      setBusyKind(null);
    }
  }

  async function downloadDoc(d: DocRow) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(d.storage_path, 60);
    if (error || !data) {
      toast.error('Téléchargement impossible');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function deleteDoc(d: DocRow, kind: KycSlotKind) {
    if (!confirm(`Supprimer ${d.file_name} ?`)) return;
    setBusyKind(kind);
    try {
      const supabase = createClient();
      const [storageRes, dbRes] = await Promise.all([
        supabase.storage.from(BUCKET).remove([d.storage_path]),
        supabase.from('consultant_documents').delete().eq('id', d.id),
      ]);
      if (storageRes.error || dbRes.error) {
        toast.error('Suppression partielle');
      } else {
        toast.success('Document supprimé');
      }
      reload();
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-glow" />
          Documents légaux & administratifs
        </CardTitle>
        <CardDescription>
          {asConsultant
            ? 'Dépose ici tes documents — QuadCore les utilise pour les contrats, les paiements et la conformité.'
            : 'Documents KYC déposés par le consultant. Ils sont synchronisés avec son portail.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {KYC_SLOTS.map((s) => (
              <div key={s.kind} className="h-24 rounded-lg bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {KYC_SLOTS.map((slot) => {
              const doc = latestDocFor(slot.kind);
              const Icon = slot.icon;
              const busy = busyKind === slot.kind;
              const ownedByMe =
                doc != null && currentUserId != null && doc.uploaded_by === currentUserId;
              return (
                <div
                  key={slot.kind}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    doc
                      ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                      : 'border-amber-500/25 bg-amber-500/[0.04]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'rounded-md p-2 shrink-0',
                        doc ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        {slot.label}
                        {doc ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{slot.hint}</p>
                      {doc ? (
                        <div className="text-[11px] text-white/70 mt-2 truncate">
                          📄 {doc.file_name}{' '}
                          <span className="text-white/40">· {formatDate(doc.uploaded_at)}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-300/80 mt-2">Manquant</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1 flex-wrap">
                    {doc && (
                      <Button size="sm" variant="ghost" onClick={() => downloadDoc(doc)}>
                        <Download className="h-3.5 w-3.5" />
                        Télécharger
                      </Button>
                    )}
                    {(asConsultant || (doc && (ownedByMe || !asConsultant))) && (
                      <UploadButton
                        slot={slot.kind}
                        replacing={!!doc}
                        busy={busy}
                        onPicked={(f) => uploadFor(slot.kind, f)}
                      />
                    )}
                    {doc && (asConsultant ? ownedByMe : true) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteDoc(doc, slot.kind)}
                        disabled={busy}
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UploadButton({
  slot,
  replacing,
  busy,
  onPicked,
}: {
  slot: KycSlotKind;
  replacing: boolean;
  busy: boolean;
  onPicked: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPicked(f);
          e.target.value = '';
        }}
      />
      <Button
        size="sm"
        variant={replacing ? 'ghost' : 'outline'}
        onClick={() => ref.current?.click()}
        disabled={busy}
        title={replacing ? 'Remplacer' : 'Téléverser'}
        data-kind={slot}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {replacing ? 'Remplacer' : 'Téléverser'}
      </Button>
    </>
  );
}
