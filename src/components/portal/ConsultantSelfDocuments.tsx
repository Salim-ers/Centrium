'use client';

import { useRef, useState } from 'react';
import { FileText, Download, Upload, Loader2, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import {
  SectionHeader,
  AppCard,
  AppCardBody,
  EmptyState,
  DataRow,
  StatusBadge,
} from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { formatDate } from '@/lib/utils';

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
        toast.error('Upload échoué : ' + up.error.message);
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
        toast.error('Enregistrement échoué : ' + ins.error.message);
        await supabase.storage.from('consultant-documents').remove([path]);
        return;
      }

      toast.success('Document ajouté');
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
      toast.error('Téléchargement impossible');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function deleteDoc(doc: DocRow) {
    if (!userId) return;
    if (doc.uploaded_by !== userId) {
      toast.error('Seul l\'auteur peut supprimer ce document');
      return;
    }
    if (!confirm(`Supprimer ${doc.file_name} ?`)) return;
    const supabase = createClient();
    const [storageRes, dbRes] = await Promise.all([
      supabase.storage.from('consultant-documents').remove([doc.storage_path]),
      supabase.from('consultant_documents').delete().eq('id', doc.id),
    ]);
    if (storageRes.error || dbRes.error) {
      toast.error('Suppression partielle');
    } else {
      toast.success('Document supprimé');
    }
    reload();
  }

  const visibleDocs = compact ? docs.slice(0, 6) : docs;

  return (
    <>
      <AppCard className="mb-6">
        <AppCardBody size={compact ? 'sm' : 'md'}>
          <SectionHeader
            eyebrow="Ajouter"
            title={
              <>
                Téléverser un{' '}
                <span className="qc-italic-accent font-editorial italic">document.</span>
              </>
            }
            description={
              compact
                ? 'CV, certification, pièce d\'identité…'
                : 'CV, certification, pièce d\'identité ou autre justificatif.'
            }
            className="mb-4"
          />
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5 block">
                Type
              </label>
              <Combobox
                value={kind}
                onChange={(v) => setKind(v)}
                options={UPLOADABLE_KINDS.map((k) => ({ value: k, label: DOC_KIND_LABEL[k] }))}
              />
            </div>
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={uploading || !consultantId}
              className="shrink-0"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? 'Upload…' : 'Choisir un fichier'}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg"
              className="hidden"
              onChange={onFile}
            />
          </div>
        </AppCardBody>
      </AppCard>

      {loading ? (
        <div className="h-40 rounded-2xl bg-foreground/[0.03] animate-pulse" />
      ) : visibleDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document pour le moment"
          description={`Téléversez votre CV, une certification ou contactez ${brandName}.`}
        />
      ) : (
        <AppCard>
          <div>
            {visibleDocs.map((d) => {
              const ownedByMe = userId !== null && d.uploaded_by === userId;
              return (
                <DataRow
                  key={d.id}
                  leading={
                    <div className="rounded-xl border border-hairline bg-white/[0.04] p-2.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  }
                  primary={
                    <span className="flex items-center gap-2 truncate">
                      <span className="truncate">{d.file_name}</span>
                      {!ownedByMe && (
                        <StatusBadge tone="violet" dot={false}>
                          <Lock className="h-2.5 w-2.5" />
                          {brandName}
                        </StatusBadge>
                      )}
                    </span>
                  }
                  secondary={
                    <>
                      {DOC_KIND_LABEL[d.kind] ?? d.kind} · Ajouté le {formatDate(d.uploaded_at)}
                      {d.size_bytes != null && ` · ${(d.size_bytes / 1024).toFixed(0)} Ko`}
                    </>
                  }
                  trailing={
                    <>
                      <Button size="sm" variant="outline" onClick={() => download(d)}>
                        <Download className="h-3.5 w-3.5" />
                        Télécharger
                      </Button>
                      {ownedByMe && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDoc(d)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        </Button>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        </AppCard>
      )}
    </>
  );
}
