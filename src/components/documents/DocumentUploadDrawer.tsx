'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileUp, UploadCloud } from 'lucide-react';

import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { useCompaniesLite, useConsultantsLite, useMissionsLite } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DOCUMENT_KIND } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { DocumentKind, DocumentVisibility, LibraryDocument } from '@/types';

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = '.pdf,.docx,.doc,.xlsx,.png,.jpg,.jpeg,.txt,.csv';

export type UploadPreset = {
  kind?: DocumentKind;
  company_id?: string | null;
  consultant_id?: string | null;
  mission_id?: string | null;
  opportunity_id?: string | null;
};

type Form = {
  kind: DocumentKind;
  title: string;
  description: string;
  company_id: string;
  consultant_id: string;
  mission_id: string;
  visibility: DocumentVisibility;
};

function sizeLabel(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

/**
 * Dépôt d'un document (ou d'une nouvelle version si `versionOf` est fourni).
 * Le contrôle du type réel, de la taille, de l'antivirus et des rattachements
 * est fait côté serveur (/api/documents) ; les vérifications ici ne servent
 * qu'au confort de saisie.
 */
export function DocumentUploadDrawer({
  open,
  onOpenChange,
  preset,
  versionOf,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: UploadPreset;
  versionOf?: LibraryDocument | null;
  onUploaded: (doc: LibraryDocument) => void;
}) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { options: companyOptions } = useCompaniesLite();
  const { options: consultantOptions } = useConsultantsLite();
  const { optionsFor: missionOptionsFor } = useMissionsLite(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form>(() => initialForm(preset, versionOf));

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setForm(initialForm(preset, versionOf));
  }, [open, preset, versionOf]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function pick(f: File | null | undefined) {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error(fr ? 'Fichier trop volumineux (25 Mo maximum).' : 'File too large (25 MB max).');
      return;
    }
    setFile(f);
    if (!versionOf && !form.title.trim()) set('title', f.name.replace(/\.[a-z0-9]+$/i, ''));
  }

  async function submit() {
    if (!file) {
      toast.error(fr ? 'Choisissez un fichier.' : 'Choose a file.');
      return;
    }
    if (!form.title.trim()) {
      toast.error(fr ? 'Titre requis.' : 'Title required.');
      return;
    }
    if (form.visibility === 'client' && !form.company_id) {
      toast.error(fr ? 'Rattachez le document à un client pour le partager dans son portail.' : 'Link a client to share it in their portal.');
      return;
    }
    if (form.visibility === 'consultant' && !form.consultant_id) {
      toast.error(fr ? 'Rattachez le document à un consultant pour le partager.' : 'Link a consultant to share it.');
      return;
    }
    const body = new FormData();
    body.set('file', file);
    body.set('kind', form.kind);
    body.set('title', form.title.trim());
    body.set('description', form.description);
    body.set('company_id', form.company_id);
    body.set('consultant_id', form.consultant_id);
    body.set('mission_id', form.mission_id);
    body.set('opportunity_id', versionOf?.opportunity_id ?? preset?.opportunity_id ?? '');
    body.set('visibility', form.visibility);
    if (versionOf) body.set('root_id', versionOf.root_id ?? versionOf.id);

    setBusy(true);
    const res = await fetch('/api/documents', { method: 'POST', body });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (res.status === 429 ? (fr ? 'Trop de dépôts, réessayez plus tard.' : 'Too many uploads, try later.') : fr ? 'Dépôt impossible' : 'Upload failed'));
      return;
    }
    toast.success(versionOf ? (fr ? `Version ${json.data.version} ajoutée` : `Version ${json.data.version} added`) : fr ? 'Document ajouté' : 'Document added');
    onUploaded(json.data as LibraryDocument);
    onOpenChange(false);
  }

  const kinds = Object.keys(DOCUMENT_KIND).filter((k) => k !== 'quote') as DocumentKind[];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>{versionOf ? (fr ? 'Nouvelle version' : 'New version') : fr ? 'Déposer un document' : 'Upload a document'}</DrawerTitle>
          <DrawerDescription>
            {versionOf
              ? fr
                ? `« ${versionOf.title} » — la version précédente reste consultable.`
                : `“${versionOf.title}” — the previous version stays available.`
              : fr
                ? 'PDF, Word, Excel, images, texte ou CSV — 25 Mo maximum. Stockage privé, liens de téléchargement temporaires.'
                : 'PDF, Word, Excel, images, text or CSV — 25 MB max. Private storage, temporary download links.'}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:shadow-focus',
              dragging && 'border-primary bg-brand-50/60',
            )}
          >
            {file ? <FileUp className="h-6 w-6 text-primary" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
            {file ? (
              <span className="text-[13px]">
                <span className="font-medium">{file.name}</span> <span className="text-muted-foreground">· {sizeLabel(file.size)}</span>
              </span>
            ) : (
              <span className="text-[13px] text-muted-foreground">{fr ? 'Glissez un fichier ici ou cliquez pour parcourir' : 'Drop a file here or click to browse'}</span>
            )}
          </button>
          <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />

          {!versionOf && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fr ? 'Type' : 'Type'} htmlFor="doc-kind">
                  <Select id="doc-kind" value={form.kind} onChange={(e) => set('kind', e.target.value as DocumentKind)}>
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {DOCUMENT_KIND[k]![lang]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={fr ? 'Titre' : 'Title'} htmlFor="doc-title" required>
                  <Input id="doc-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
                </Field>
              </div>
              <Field label={fr ? 'Description' : 'Description'} htmlFor="doc-desc">
                <Textarea id="doc-desc" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} showCounter={false} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fr ? 'Client' : 'Client'} htmlFor="doc-client">
                  <Combobox id="doc-client" options={companyOptions} value={form.company_id} onChange={(v) => setForm((f) => ({ ...f, company_id: v, mission_id: '' }))} clearable placeholder={fr ? 'Aucun' : 'None'} />
                </Field>
                <Field label="Consultant" htmlFor="doc-consultant">
                  <Combobox id="doc-consultant" options={consultantOptions} value={form.consultant_id} onChange={(v) => setForm((f) => ({ ...f, consultant_id: v, mission_id: '' }))} clearable placeholder={fr ? 'Aucun' : 'None'} />
                </Field>
              </div>
              <Field label="Mission" htmlFor="doc-mission">
                <Combobox
                  id="doc-mission"
                  options={missionOptionsFor({ companyId: form.company_id || null, consultantId: form.consultant_id || null })}
                  value={form.mission_id}
                  onChange={(v) => set('mission_id', v)}
                  clearable
                  placeholder={fr ? 'Aucune' : 'None'}
                />
              </Field>
            </>
          )}

          <Field
            label={fr ? 'Visibilité' : 'Visibility'}
            htmlFor="doc-visibility"
            hint={
              form.visibility === 'client'
                ? fr
                  ? 'Visible dans le portail client de l’entreprise rattachée.'
                  : 'Visible in the linked company’s client portal.'
                : form.visibility === 'consultant'
                  ? fr
                    ? 'Visible dans l’espace du consultant rattaché.'
                    : 'Visible in the linked consultant’s space.'
                  : fr
                    ? 'Visible uniquement par votre équipe.'
                    : 'Visible to your team only.'
            }
          >
            <Select id="doc-visibility" value={form.visibility} onChange={(e) => set('visibility', e.target.value as DocumentVisibility)}>
              <option value="internal">{fr ? 'Interne' : 'Internal'}</option>
              <option value="client">{fr ? 'Partagé au client' : 'Shared with client'}</option>
              <option value="consultant">{fr ? 'Partagé au consultant' : 'Shared with consultant'}</option>
            </Select>
          </Field>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {fr ? 'Annuler' : 'Cancel'}
          </Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!file}>
            {versionOf ? (fr ? 'Ajouter la version' : 'Add version') : fr ? 'Déposer' : 'Upload'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function initialForm(preset?: UploadPreset, versionOf?: LibraryDocument | null): Form {
  if (versionOf) {
    return {
      kind: versionOf.kind,
      title: versionOf.title,
      description: versionOf.description ?? '',
      company_id: versionOf.company_id ?? '',
      consultant_id: versionOf.consultant_id ?? '',
      mission_id: versionOf.mission_id ?? '',
      visibility: versionOf.visibility,
    };
  }
  return {
    kind: preset?.kind ?? 'other',
    title: '',
    description: '',
    company_id: preset?.company_id ?? '',
    consultant_id: preset?.consultant_id ?? '',
    mission_id: preset?.mission_id ?? '',
    visibility: 'internal',
  };
}
