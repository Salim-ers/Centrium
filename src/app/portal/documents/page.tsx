'use client';

import { useRef, useState } from 'react';
import { FileText, Download, Upload, Loader2, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { formatDate } from '@/lib/utils';
import { usePortalConsultant } from '../portal-context';

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
  cv_generated: 'CV généré QuadCore',
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

export default function PortalDocumentsPage() {
  const { consultantId, userId } = usePortalConsultant();
  const { activeOrgId: orgId } = useOrganization();
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<string>('cv_source');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    data: docsData,
    loading,
    reload,
    setData: setDocs,
  } = useCachedQuery<DocRow[]>(
    `portal-documents:${consultantId}`,
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('consultant_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      return (data ?? []) as DocRow[];
    },
  );
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-7 w-7 text-violet-glow" />
          Mes documents
        </h1>
        <p className="text-muted-foreground mt-1">
          Partage tes documents avec QuadCore et retrouve ceux qu&apos;on t&apos;a transmis.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-violet-glow" />
            Ajouter un document
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Type
            </label>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {UPLOADABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {DOC_KIND_LABEL[k]}
                </option>
              ))}
            </Select>
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
        </CardContent>
      </Card>

      {loading ? (
        <div className="h-40 rounded-xl bg-white/[0.02] animate-pulse" />
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun document pour le moment.</p>
            <p className="text-xs mt-1">
              Uploade ton CV, une certification ou contacte QuadCore.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            <ul className="space-y-1">
              {docs.map((d) => {
                const ownedByMe = userId !== null && d.uploaded_by === userId;
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {d.file_name}
                        {!ownedByMe && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                            title="Transmis par QuadCore"
                          >
                            <Lock className="h-3 w-3" />
                            QuadCore
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {DOC_KIND_LABEL[d.kind] ?? d.kind} · Ajouté le{' '}
                        {formatDate(d.uploaded_at)}
                        {d.size_bytes && ` · ${(d.size_bytes / 1024).toFixed(0)} Ko`}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => download(d)}>
                      <Download className="h-3.5 w-3.5" />
                      Télécharger
                    </Button>
                    {ownedByMe && (
                      <Button size="sm" variant="ghost" onClick={() => deleteDoc(d)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
