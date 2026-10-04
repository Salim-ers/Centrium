'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Upload, Trash2, Download, Loader2, Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { useLocale } from '@/lib/i18n/LocaleProvider';
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

function docKindLabel(kind: string, isEn: boolean): string {
  return (isEn ? DOC_KIND_LABEL_EN[kind] : DOC_KIND_LABEL[kind]) ?? kind;
}

// Taille maximale par fichier — au-delà, on refuse côté client (un fichier de
// plusieurs Go bloquerait le worker et saturerait le stockage).
const MAX_DOC_BYTES = 20 * 1024 * 1024; // 20 Mo

// Nombre maximal de fichiers par rubrique (cohérence métier). `cv_generated`
// est produit par le système et n'est pas soumis à ces quotas d'upload.
const DOC_KIND_MAX: Record<string, number> = {
  cv_source: 1,
  id: 2,
  certification: 10,
  contract: 3,
  other: 3,
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
  const { locale } = useLocale();
  const isEn = locale === 'en';
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

    // Garde-fou taille (par fichier).
    if (file.size > MAX_DOC_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      toast.error(
        isEn
          ? `File too large (${mb} MB). Limit: 20 MB per file.`
          : `Fichier trop volumineux (${mb} Mo). Limite : 20 Mo par fichier.`,
      );
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size === 0) {
      toast.error(isEn ? 'Empty file.' : 'Fichier vide.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Garde-fou nombre de fichiers pour la rubrique sélectionnée.
    const max = DOC_KIND_MAX[kind];
    if (max != null) {
      const current = docs.filter((d) => d.kind === kind).length;
      if (current >= max) {
        toast.error(
          isEn
            ? `Limit reached for « ${docKindLabel(kind, true)} »: ${max} file${max > 1 ? 's' : ''} max. Delete an existing file to add another.`
            : `Limite atteinte pour « ${docKindLabel(kind, false)} » : ${max} fichier${max > 1 ? 's' : ''} maximum. Supprime un fichier existant pour en ajouter un autre.`,
        );
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        toast.error(isEn ? 'Session expired' : 'Session expirée');
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${organizationId}/${consultantId}/${Date.now()}-${safeName}`;

      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
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
      });
      if (ins.error) {
        toast.error((isEn ? 'Save failed: ' : 'Enregistrement échoué : ') + ins.error.message);
        await supabase.storage.from(BUCKET).remove([path]);
        return;
      }

      toast.success(isEn ? 'Document added' : 'Document ajouté');
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
      toast.info(isEn ? 'Analyzing the CV — this can take 10-20 seconds with AI…' : 'Analyse du CV en cours — ça peut prendre 10-20 secondes avec l\'IA…');

      // === Étape 1 : extraction texte ===
      step = 'extract';
      console.log('[QC CV] Étape 1 — extraction du texte du PDF/DOCX…');
      const text = await extractWithServerFallback(file);
      console.log('[QC CV] Texte extrait :', text.length, 'caractères');
      if (!text || text.trim().length < 50) {
        toast.warning(
          isEn
            ? 'CV text not found. If this is a scanned CV (image), OCR is not available — re-upload a text PDF or a DOCX.'
            : 'Texte du CV introuvable. Si c\'est un CV scanné (image), l\'OCR n\'est pas dispo — réuploade un PDF texte ou un DOCX.',
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
        toast.error(isEn ? 'The parser returned nothing. See console for details.' : 'Le parseur n\'a rien retourné. Voir console pour détails.');
        return;
      }

      if (
        (parsed.skills?.length ?? 0) === 0 &&
        (parsed.experiences?.length ?? 0) === 0 &&
        (parsed.educations?.length ?? 0) === 0 &&
        !parsed.summary
      ) {
        toast.warning(
          isEn
            ? 'No data detected in the CV. Check that the sections (Experiences / Skills / Education) are clearly named.'
            : 'Aucune donnée détectée dans le CV. Vérifie que les sections (Expériences / Compétences / Formation) sont clairement nommées.',
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
      if (applied.skillsAdded > 0) parts.push(isEn ? `${applied.skillsAdded} skills` : `${applied.skillsAdded} compétences`);
      if (applied.experiencesAdded > 0) parts.push(isEn ? `${applied.experiencesAdded} experiences` : `${applied.experiencesAdded} expériences`);
      if (applied.educationsAdded > 0) parts.push(isEn ? `${applied.educationsAdded} education entries` : `${applied.educationsAdded} formations`);
      if (applied.summaryUpdated) parts.push(isEn ? 'executive summary' : 'résumé exécutif');
      if (applied.languagesUpdated) parts.push(isEn ? 'languages' : 'langues');

      const modeLabel = mode === 'llm' ? (isEn ? '🤖 AI' : '🤖 IA') : (isEn ? '📝 heuristic' : '📝 heuristique');

      if (parts.length === 0) {
        toast.info(
          isEn
            ? `${modeLabel}: data detected but already present on the profile.`
            : `${modeLabel} : données détectées mais déjà présentes sur la fiche.`,
        );
      } else {
        toast.success(isEn ? `${modeLabel} — profile enriched: ${parts.join(', ')} imported` : `${modeLabel} — profil enrichi : ${parts.join(', ')} importés`);
        onProfileUpdated?.();
      }
    } catch (e) {
      console.error(`[QC CV] Erreur à l'étape "${step}" :`, e);
      const detail = e instanceof Error ? e.message : JSON.stringify(e);
      toast.error(isEn ? `Extraction failed (step: ${step}) — ${detail}` : `Extraction impossible (étape : ${step}) — ${detail}`);
    } finally {
      setParsing(false);
    }
  }

  async function reparseDoc(doc: DocRow) {
    if (doc.kind !== 'cv_source') {
      toast.error(isEn ? 'Only available for "Source CV" documents' : 'Uniquement disponible pour les documents "CV source"');
      return;
    }
    setParsing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 120);
      if (error || !data) {
        toast.error(isEn ? 'Could not retrieve the file' : 'Impossible de récupérer le fichier');
        return;
      }
      const res = await fetch(data.signedUrl);
      const blob = await res.blob();
      const file = new File([blob], doc.file_name, { type: doc.mime_type ?? blob.type });
      await autoFillFromCV(file);
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Re-analysis failed' : 'Re-analyse échouée');
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
      toast.error(isEn ? 'Download failed' : 'Téléchargement impossible');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function deleteDoc(doc: DocRow) {
    if (!confirm(isEn ? `Delete ${doc.file_name}?` : `Supprimer ${doc.file_name} ?`)) return;
    const supabase = createClient();
    const [storageRes, dbRes] = await Promise.all([
      supabase.storage.from(BUCKET).remove([doc.storage_path]),
      supabase.from('consultant_documents').delete().eq('id', doc.id),
    ]);
    if (storageRes.error || dbRes.error) {
      toast.error(isEn ? 'Partial deletion' : 'Suppression partielle');
    } else {
      toast.success(isEn ? 'Document deleted' : 'Document supprimé');
    }
    reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {isEn ? 'Documents & source CV' : 'Documents & CV source'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {isEn ? 'Type' : 'Type'}
            </label>
            <Combobox
              value={kind}
              onChange={(v) => setKind(v)}
              options={[
                { value: 'cv_source', label: docKindLabel('cv_source', isEn) },
                { value: 'certification', label: docKindLabel('certification', isEn) },
                { value: 'id', label: docKindLabel('id', isEn) },
                { value: 'contract', label: docKindLabel('contract', isEn) },
                { value: 'other', label: docKindLabel('other', isEn) },
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
            {uploading
              ? isEn ? 'Uploading…' : 'Upload…'
              : parsing
                ? isEn ? 'Analyzing…' : 'Analyse…'
                : isEn ? 'Add a file' : 'Ajouter un fichier'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg"
            className="hidden"
            onChange={onFile}
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          {DOC_KIND_MAX[kind] != null ? (
            <>
              {docKindLabel(kind, isEn)} :{' '}
              <span className="text-foreground/80">
                {docs.filter((d) => d.kind === kind).length} / {DOC_KIND_MAX[kind]}{' '}
                {isEn ? 'file' : 'fichier'}
                {DOC_KIND_MAX[kind]! > 1 ? 's' : ''}
              </span>{' '}
              · {isEn ? '20 MB max per file' : '20 Mo max par fichier'}
            </>
          ) : (
            <>{isEn ? '20 MB max per file' : '20 Mo max par fichier'}</>
          )}
        </p>

        {kind === 'cv_source' && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isEn ? (
                <>
                  When you upload a <strong className="text-foreground">source CV</strong>, Claude
                  (Sonnet 4.6) automatically extracts summary, skills, experiences, education and
                  languages — and enriches the consultant profile.
                  <br />
                  Works on text PDF/DOCX (not scanned image CVs). Heuristic fallback if
                  <code className="mx-1 px-1 rounded bg-muted">ANTHROPIC_API_KEY</code> is missing.
                </>
              ) : (
                <>
                  À l&apos;upload d&apos;un <strong className="text-foreground">CV source</strong>,
                  Claude (Sonnet 4.6) extrait automatiquement résumé, compétences, expériences,
                  formation et langues — et enrichit la fiche consultant.
                  <br />
                  Fonctionne sur PDF/DOCX texte (pas les CV scannés en image). Fallback heuristique si
                  <code className="mx-1 px-1 rounded bg-muted">ANTHROPIC_API_KEY</code> absente.
                </>
              )}
            </p>
          </div>
        )}

        {loading ? (
          <div className="h-10 rounded bg-card animate-pulse" />
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {isEn ? 'No document yet' : 'Aucun document pour l\'instant'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-hairline bg-card hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.file_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {docKindLabel(d.kind, isEn)} · {formatDate(d.uploaded_at)}
                    {d.size_bytes && ` · ${(d.size_bytes / 1024).toFixed(0)} ${isEn ? 'KB' : 'Ko'}`}
                  </div>
                </div>
                {d.kind === 'cv_source' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reparseDoc(d)}
                    disabled={parsing}
                    title={isEn ? 'Re-analyze this CV to enrich the profile' : 'Re-analyser ce CV pour enrichir le profil'}
                  >
                    {parsing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    )}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteDoc(d)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
