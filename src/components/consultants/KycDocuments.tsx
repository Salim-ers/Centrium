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
import { useLocale } from '@/lib/i18n/LocaleProvider';

const BUCKET = 'consultant-documents';

export type KycSlotKind = 'kbis' | 'id_card' | 'rc_pro' | 'rib';

export const KYC_SLOTS: Array<{
  kind: KycSlotKind;
  label: string;
  labelEn: string;
  hint: string;
  hintEn: string;
  icon: typeof FileText;
}> = [
  {
    kind: 'kbis',
    label: 'Extrait Kbis',
    labelEn: 'Kbis extract',
    hint: '< 3 mois — preuve d\'immatriculation de la société.',
    hintEn: '< 3 months — proof of company registration.',
    icon: Building2,
  },
  {
    kind: 'id_card',
    label: "Pièce d'identité",
    labelEn: 'ID document',
    hint: 'Carte nationale, passeport ou titre de séjour.',
    hintEn: 'National ID card, passport or residence permit.',
    icon: Contact,
  },
  {
    kind: 'rc_pro',
    label: 'Attestation RC Pro',
    labelEn: 'Professional liability certificate',
    hint: 'Responsabilité civile professionnelle en cours de validité.',
    hintEn: 'Valid professional liability insurance.',
    icon: ShieldCheck,
  },
  {
    kind: 'rib',
    label: 'RIB',
    labelEn: 'Bank details (IBAN)',
    hint: 'Coordonnées bancaires pour les règlements.',
    hintEn: 'Bank details for payments.',
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
  /** Date d'expiration (migration 084) — alimente les alertes de renouvellement. */
  expires_at: string | null;
};

/** Jours restants avant expiration (négatif = expiré). */
function daysLeft(expiresAt: string): number {
  const d = new Date(expiresAt + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

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
  const { locale } = useLocale();
  const isEn = locale === 'en';
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
        toast.error(isEn ? 'Session expired, please sign in again.' : 'Session expirée, reconnecte-toi.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(isEn ? 'File too large (10 MB max).' : 'Fichier trop gros (10 Mo max).');
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${organizationId}/${consultantId}/${kind}-${Date.now()}-${safeName}`;

      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (up.error) {
        toast.error((isEn ? 'Upload failed: ' : 'Upload échoué : ') + up.error.message);
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
        toast.error((isEn ? 'Save failed: ' : 'Enregistrement échoué : ') + ins.error.message);
        await supabase.storage.from(BUCKET).remove([path]);
        return;
      }

      if (previous) {
        await Promise.all([
          supabase.storage.from(BUCKET).remove([previous.storage_path]),
          supabase.from('consultant_documents').delete().eq('id', previous.id),
        ]);
      }

      toast.success(isEn ? 'Document added' : 'Document ajouté');
      reload();
    } finally {
      setBusyKind(null);
    }
  }

  async function setExpiry(d: DocRow, dateIso: string | null) {
    const supabase = createClient();
    const { error } = await supabase
      .from('consultant_documents')
      .update({ expires_at: dateIso })
      .eq('id', d.id);
    if (error) {
      toast.error(
        (isEn ? 'Could not save the expiry date: ' : "Impossible d'enregistrer la date d'expiration : ") +
          error.message,
      );
      return;
    }
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, expires_at: dateIso } : x)));
  }

  async function downloadDoc(d: DocRow) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(d.storage_path, 60);
    if (error || !data) {
      toast.error(isEn ? 'Download failed' : 'Téléchargement impossible');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function deleteDoc(d: DocRow, kind: KycSlotKind) {
    if (!confirm(isEn ? `Delete ${d.file_name}?` : `Supprimer ${d.file_name} ?`)) return;
    setBusyKind(kind);
    try {
      const supabase = createClient();
      const [storageRes, dbRes] = await Promise.all([
        supabase.storage.from(BUCKET).remove([d.storage_path]),
        supabase.from('consultant_documents').delete().eq('id', d.id),
      ]);
      if (storageRes.error || dbRes.error) {
        toast.error(isEn ? 'Partial deletion' : 'Suppression partielle');
      } else {
        toast.success(isEn ? 'Document deleted' : 'Document supprimé');
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
          {isEn ? 'Legal & administrative documents' : 'Documents légaux & administratifs'}
        </CardTitle>
        <CardDescription>
          {asConsultant
            ? isEn
              ? 'Upload your documents here — QuadCore uses them for contracts, payments and compliance.'
              : 'Dépose ici tes documents — QuadCore les utilise pour les contrats, les paiements et la conformité.'
            : isEn
              ? 'KYC documents uploaded by the consultant. They are synced with their portal.'
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
                        {isEn ? slot.labelEn : slot.label}
                        {doc ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{isEn ? slot.hintEn : slot.hint}</p>
                      {doc ? (
                        <>
                          <div className="text-[11px] text-white/70 mt-2 truncate">
                            📄 {doc.file_name}{' '}
                            <span className="text-white/40">· {formatDate(doc.uploaded_at)}</span>
                          </div>
                          {doc.expires_at && (
                            <div
                              className={cn(
                                'text-[11px] mt-1 font-medium',
                                daysLeft(doc.expires_at) < 0
                                  ? 'text-red-400'
                                  : daysLeft(doc.expires_at) <= 30
                                    ? 'text-amber-300'
                                    : 'text-white/50',
                              )}
                            >
                              {daysLeft(doc.expires_at) < 0
                                ? isEn
                                  ? `⚠ Expired on ${formatDate(doc.expires_at)}`
                                  : `⚠ Expiré le ${formatDate(doc.expires_at)}`
                                : isEn
                                  ? `Expires on ${formatDate(doc.expires_at)} (${daysLeft(doc.expires_at)}d)`
                                  : `Expire le ${formatDate(doc.expires_at)} (${daysLeft(doc.expires_at)} j)`}
                            </div>
                          )}
                          <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            {isEn ? 'Expiry:' : 'Expiration :'}
                            <input
                              type="date"
                              value={doc.expires_at ?? ''}
                              onChange={(e) => setExpiry(doc, e.target.value || null)}
                              className="rounded border border-hairline bg-transparent px-1.5 py-0.5 text-[10px] text-foreground [color-scheme:dark]"
                              aria-label={`${isEn ? 'Expiry date' : "Date d'expiration"} — ${isEn ? slot.labelEn : slot.label}`}
                            />
                          </label>
                        </>
                      ) : (
                        <div className="text-[11px] text-amber-300/80 mt-2">{isEn ? 'Missing' : 'Manquant'}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1 flex-wrap">
                    {doc && (
                      <Button size="sm" variant="ghost" onClick={() => downloadDoc(doc)}>
                        <Download className="h-3.5 w-3.5" />
                        {isEn ? 'Download' : 'Télécharger'}
                      </Button>
                    )}
                    {(asConsultant || (doc && (ownedByMe || !asConsultant))) && (
                      <UploadButton
                        slot={slot.kind}
                        replacing={!!doc}
                        busy={busy}
                        isEn={isEn}
                        onPicked={(f) => uploadFor(slot.kind, f)}
                      />
                    )}
                    {doc && (asConsultant ? ownedByMe : true) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteDoc(doc, slot.kind)}
                        disabled={busy}
                        title={isEn ? 'Delete' : 'Supprimer'}
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
  isEn,
  onPicked,
}: {
  slot: KycSlotKind;
  replacing: boolean;
  busy: boolean;
  isEn: boolean;
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
        title={replacing ? (isEn ? 'Replace' : 'Remplacer') : isEn ? 'Upload' : 'Téléverser'}
        data-kind={slot}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {replacing ? (isEn ? 'Replace' : 'Remplacer') : isEn ? 'Upload' : 'Téléverser'}
      </Button>
    </>
  );
}
