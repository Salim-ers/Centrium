'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Upload, Trash2, Download, Loader2, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { extractTextFromFile } from '@/lib/cv/extract-text';
import { parseCVSmart } from '@/lib/cv/parse-cv-llm';
import { applyParsedCV } from '@/lib/cv/apply-parsed-cv';

const BUCKET = 'consultant-documents';

type DocRow = {
  id: string;
  consultant_id: string;
  kind: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
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

type Props = {
  consultantId: string;
  organizationId: string;
  onProfileUpdated?: () => void;
};

// Extraction serveur prioritaire (plus fiable que pdfjs-dist côté navigateur).
// Fallback client uniquement si la route est absente (404) ou injoignable (réseau).
async function extractWithServerFallback(file: File): Promise<string> {
  let serverReached = false;
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
    const res = await fetch('/api/cv/extract', { method: 'POST', body: form });
    serverReached = true;

    if (res.ok) {
      const data = (await res.json()) as { text?: string };
      if (data.text) {
        console.log('[QC CV] Extraction serveur OK -', data.text.length, 'caractères');
        return data.text;
      }
      console.warn('[QC CV] Serveur 200 mais pas de texte', data);
      return '';
    }

    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    console.warn('[QC CV] Extraction serveur KO', res.status, body);

    if (res.status === 404) {
      // Route pas encore compilée → dev server pas redémarré
      console.warn('[QC CV] Route /api/cv/extract introuvable — fallback client');
    } else {
      // 400/500 avec message explicite → on remonte au lieu de masquer avec le fallback
      throw new Error(
        body.message ?? `Serveur a rejeté l'extraction (HTTP ${res.status})`,
      );
    }
  } catch (e) {
    if (serverReached) throw e; // vraie erreur serveur → on ne masque pas
    console.warn('[QC CV] Serveur injoignable — fallback client', e);
  }
  console.log('[QC CV] Fallback extraction côté client…');
  return extractTextFromFile(file);
}

export function ConsultantDocuments({ consultantId, organizationId, onProfileUpdated }: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [kind, setKind] = useState<string>('cv_source');
  const inputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('consultant_documents')
      .select('*')
      .eq('consultant_id', consultantId)
      .order('uploaded_at', { ascending: false });
    if (!error) setDocs((data ?? []) as DocRow[]);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [consultantId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        toast.error('Session expirée');
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${organizationId}/${consultantId}/${Date.now()}-${safeName}`;

      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
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
      });
      if (ins.error) {
        toast.error('Enregistrement échoué : ' + ins.error.message);
        await supabase.storage.from(BUCKET).remove([path]);
        return;
      }

      toast.success('Document ajouté');
      reload();

      // Auto-extraction si c'est un CV source
      if (kind === 'cv_source') {
        await autoFillFromCV(file);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function autoFillFromCV(file: File) {
    setParsing(true);
    let step = 'init';
    try {
      toast.info('Analyse du CV en cours — ça peut prendre 10-20 secondes avec l\'IA…');

      // === Étape 1 : extraction texte ===
      step = 'extract';
      console.log('[QC CV] Étape 1 — extraction du texte du PDF/DOCX…');
      const text = await extractWithServerFallback(file);
      console.log('[QC CV] Texte extrait :', text.length, 'caractères');
      if (!text || text.trim().length < 50) {
        toast.warning(
          'Texte du CV introuvable. Si c\'est un CV scanné (image), l\'OCR n\'est pas dispo — réuploade un PDF texte ou un DOCX.',
        );
        return;
      }

      // === Étape 2 : parsing (LLM ou heuristique) ===
      step = 'parse';
      console.log('[QC CV] Étape 2 — appel parseCVSmart…');
      const result = await parseCVSmart(text);
      const { parsed, mode, model, usage, warnings } = result;
      console.log('[QC CV] Mode :', mode, model ? `(${model})` : '');
      if (usage) console.log('[QC CV] Tokens :', usage);
      console.log('[QC CV] Extraction :', {
        summary: !!parsed?.summary,
        skills: parsed?.skills?.length ?? 0,
        experiences: parsed?.experiences?.length ?? 0,
        educations: parsed?.educations?.length ?? 0,
        languages: parsed?.languages?.length ?? 0,
      });

      if (warnings && warnings.length > 0) {
        for (const w of warnings) toast.warning(w);
      }

      if (!parsed) {
        toast.error('Le parseur n\'a rien retourné. Voir console pour détails.');
        return;
      }

      if (
        (parsed.skills?.length ?? 0) === 0 &&
        (parsed.experiences?.length ?? 0) === 0 &&
        (parsed.educations?.length ?? 0) === 0 &&
        !parsed.summary
      ) {
        toast.warning(
          'Aucune donnée détectée dans le CV. Vérifie que les sections (Expériences / Compétences / Formation) sont clairement nommées.',
        );
        return;
      }

      // === Étape 3 : insertion DB ===
      step = 'apply';
      console.log('[QC CV] Étape 3 — insertion en DB (applyParsedCV)…');
      const applied = await applyParsedCV(consultantId, parsed);
      console.log('[QC CV] Résultat DB :', applied);

      for (const w of applied.warnings) {
        toast.warning(w, { duration: 8000 });
      }

      const parts: string[] = [];
      if (applied.skillsAdded > 0) parts.push(`${applied.skillsAdded} compétences`);
      if (applied.experiencesAdded > 0) parts.push(`${applied.experiencesAdded} expériences`);
      if (applied.educationsAdded > 0) parts.push(`${applied.educationsAdded} formations`);
      if (applied.summaryUpdated) parts.push('résumé exécutif');
      if (applied.languagesUpdated) parts.push('langues');

      const modeLabel = mode === 'llm' ? '🤖 IA' : '📝 heuristique';

      if (parts.length === 0) {
        toast.info(
          `${modeLabel} : données détectées mais déjà présentes sur la fiche.`,
        );
      } else {
        toast.success(`${modeLabel} — profil enrichi : ${parts.join(', ')} importés`);
        onProfileUpdated?.();
      }
    } catch (e) {
      console.error(`[QC CV] Erreur à l'étape "${step}" :`, e);
      const detail = e instanceof Error ? e.message : JSON.stringify(e);
      toast.error(`Extraction impossible (étape : ${step}) — ${detail}`);
    } finally {
      setParsing(false);
    }
  }

  async function reparseDoc(doc: DocRow) {
    if (doc.kind !== 'cv_source') {
      toast.error('Uniquement disponible pour les documents "CV source"');
      return;
    }
    setParsing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 120);
      if (error || !data) {
        toast.error('Impossible de récupérer le fichier');
        return;
      }
      const res = await fetch(data.signedUrl);
      const blob = await res.blob();
      const file = new File([blob], doc.file_name, { type: doc.mime_type ?? blob.type });
      await autoFillFromCV(file);
    } catch (e) {
      console.error(e);
      toast.error('Re-analyse échouée');
    } finally {
      setParsing(false);
    }
  }

  async function downloadDoc(doc: DocRow) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      toast.error('Téléchargement impossible');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function deleteDoc(doc: DocRow) {
    if (!confirm(`Supprimer ${doc.file_name} ?`)) return;
    const supabase = createClient();
    const [storageRes, dbRes] = await Promise.all([
      supabase.storage.from(BUCKET).remove([doc.storage_path]),
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-glow" />
          Documents &amp; CV source
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Type
            </label>
            <Combobox
              value={kind}
              onChange={(v) => setKind(v)}
              options={[
                { value: 'cv_source', label: 'CV source' },
                { value: 'certification', label: 'Certification' },
                { value: 'id', label: "Pièce d'identité" },
                { value: 'contract', label: 'Contrat' },
                { value: 'other', label: 'Autre' },
              ]}
            />
          </div>
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading || parsing}
            className="shrink-0"
          >
            {uploading || parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Upload…' : parsing ? 'Analyse…' : 'Ajouter un fichier'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg"
            className="hidden"
            onChange={onFile}
          />
        </div>

        {kind === 'cv_source' && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-violet-glow/20 bg-violet-glow/5">
            <Sparkles className="h-3.5 w-3.5 text-violet-glow shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              À l&apos;upload d&apos;un <strong className="text-foreground">CV source</strong>,
              Claude (Sonnet 4.6) extrait automatiquement résumé, compétences, expériences,
              formation et langues — et enrichit la fiche consultant.
              <br />
              Fonctionne sur PDF/DOCX texte (pas les CV scannés en image). Fallback heuristique si
              <code className="mx-1 px-1 rounded bg-white/5">ANTHROPIC_API_KEY</code> absente.
            </p>
          </div>
        )}

        {loading ? (
          <div className="h-10 rounded bg-white/[0.02] animate-pulse" />
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun document pour l&apos;instant</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-hairline bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.file_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {DOC_KIND_LABEL[d.kind] ?? d.kind} · {formatDate(d.uploaded_at)}
                    {d.size_bytes && ` · ${(d.size_bytes / 1024).toFixed(0)} Ko`}
                  </div>
                </div>
                {d.kind === 'cv_source' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reparseDoc(d)}
                    disabled={parsing}
                    title="Re-analyser ce CV pour enrichir le profil"
                  >
                    {parsing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-violet-glow" />
                    )}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteDoc(d)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
