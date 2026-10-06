'use client';

import { useRef, useState } from 'react';
import { FileText, Download, Upload, Loader2, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { StatusBadge } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { formatDate } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// =========================================================================
// Documents personnels du consultant (CV, certifications, pièces…) :
// upload + liste + téléchargement + suppression (ses propres fichiers).
// Utilisé par /portal/documents (pleine page) ET /portal/profile
// (variante compacte intégrée au profil).
// =========================================================================

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
  visible_to_consultant: boolean;
};

const DOC_KIND_LABEL: Record<string, string> = {
  cv_source: 'CV source',
  cv_generated: 'CV généré',
  certification: 'Certification',
  id: 'Pièce d\'identité',
  id_card: 'Pièce d\'identité',
  kbis: 'Extrait Kbis',
  rc_pro: 'Attestation RC Pro',
  rib: 'RIB',
  contract: 'Contrat',
  other: 'Autre',
};

const DOC_KIND_LABEL_EN: Record<string, string> = {
  cv_source: 'Source CV',
  cv_generated: 'Generated CV',
  certification: 'Certification',
  id: 'ID document',
  id_card: 'ID document',
  kbis: 'Kbis extract',
  rc_pro: 'Professional liability cert.',
  rib: 'Bank details',
  contract: 'Contract',
  other: 'Other',
};

// Types que le consultant peut uploader lui-même (pas de 'contract')
const UPLOADABLE_KINDS = ['cv_source', 'certification', 'id', 'other'] as const;

type Props = {
  consultantId: string;
  userId: string | null;
  orgId: string | null;
  /** Variante profil : entête de section réduite, liste bornée. */
  compact?: boolean;
};

export function ConsultantSelfDocuments({ consultantId, userId, orgId, compact = false }: Props) {
  const brandName = useBrandName();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const kindLabel = (k: string) =>
    (isEn ? DOC_KIND_LABEL_EN[k] : DOC_KIND_LABEL[k]) ?? DOC_KIND_LABEL[k] ?? k;
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<string>('cv_source');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    data: docsData,
    loading,
    reload,
  } = useCachedQuery<DocRow[]>(`portal-documents:${consultantId}`, async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('consultant_documents')
      .select('*')
      .order('uploaded_at', { ascending: false });
    return (data ?? []) as DocRow[];
  });
  const docs = docsData ?? [];

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId || !consultantId || !orgId) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${orgId}/${consultantId}/${Date.now()}-${safeName}`;

      const up = await supabase.storage
        .from('consultant-documents')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) {
        toast.error((isEn ? 'Upload failed: ' : 'Upload échoué : ') + up.error.message);
        return;
      }

      const ins = await supabase.from('consultant_documents').insert({
        consultant_id: consultantId,
        kind,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: userId,
        visible_to_consultant: true, // imposé par la policy docs_self_insert
      });
      if (ins.error) {
        toast.error((isEn ? 'Save failed: ' : 'Enregistrement échoué : ') + ins.error.message);
        await supabase.storage.from('consultant-documents').remove([path]);
        return;
      }

      toast.success(isEn ? 'Document added' : 'Document ajouté');
      reload();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function download(doc: DocRow) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('consultant-documents')
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      toast.error(isEn ? 'Download unavailable' : 'Téléchargement impossible');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function deleteDoc(doc: DocRow) {
    if (!userId) return;
    if (doc.uploaded_by !== userId) {
      toast.error(isEn ? 'Only the author can delete this document' : 'Seul l\'auteur peut supprimer ce document');
      return;
    }
    if (!confirm(isEn ? `Delete ${doc.file_name}?` : `Supprimer ${doc.file_name} ?`)) return;
    const supabase = createClient();
    const [storageRes, dbRes] = await Promise.all([
      supabase.storage.from('consultant-documents').remove([doc.storage_path]),
      supabase.from('consultant_documents').delete().eq('id', doc.id),
    ]);
    if (storageRes.error || dbRes.error) {
      toast.error(isEn ? 'Partial deletion' : 'Suppression partielle');
    } else {
      toast.success(isEn ? 'Document deleted' : 'Document supprimé');
    }
    reload();
  }

  const visibleDocs = compact ? docs.slice(0, 6) : docs;

  return (
    <section aria-labelledby="my-files" className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="my-files" className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            {isEn ? 'My files' : 'Mes fichiers'}
          </h2>
          <p className="text-[12.5px] text-muted-foreground">
            {isEn
              ? `CV, certifications and other files, shared with the ${brandName} team.`
              : `CV, certifications et autres fichiers, partagés avec l’équipe ${brandName}.`}
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Ajout : type puis fichier, sur une ligne. */}
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="min-w-0 flex-1">
            <Combobox
              ariaLabel={isEn ? 'Document type' : 'Type de document'}
              value={kind}
              onChange={(v) => setKind(v)}
              options={UPLOADABLE_KINDS.map((k) => ({ value: k, label: kindLabel(k) }))}
            />
          </div>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading || !consultantId} className="shrink-0">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? (isEn ? 'Uploading…' : 'Envoi…') : isEn ? 'Add' : 'Ajouter'}
          </Button>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg" className="hidden" onChange={onFile} />
        </div>
        {loading ? (
          <div className="h-24 animate-pulse bg-foreground/[0.03]" />
        ) : visibleDocs.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted-foreground">
            <FileText className="h-4 w-4 shrink-0" />
            {isEn ? 'No file yet. Add your CV or a certification.' : 'Aucun fichier pour l’instant. Ajoutez votre CV ou une certification.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visibleDocs.map((d) => {
              const ownedByMe = userId !== null && d.uploaded_by === userId;
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium">{d.file_name}</span>
                      {!ownedByMe && (
                        <StatusBadge tone="violet" dot={false}>
                          <Lock className="h-2.5 w-2.5" />
                          {brandName}
                        </StatusBadge>
                      )}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {kindLabel(d.kind)} · {formatDate(d.uploaded_at)}
                      {d.size_bytes != null && ` · ${(d.size_bytes / 1024).toFixed(0)} ${isEn ? 'KB' : 'Ko'}`}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => download(d)} aria-label={isEn ? 'Download' : 'Télécharger'}>
                    <Download className="h-4 w-4 text-primary-deep" />
                  </Button>
                  {ownedByMe && (
                    <Button size="sm" variant="ghost" onClick={() => deleteDoc(d)} aria-label={isEn ? 'Delete' : 'Supprimer'}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
