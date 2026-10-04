'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Download, FilePlus2 } from 'lucide-react';

import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { StatusPill } from '@/components/ui/status-pill';
import { FactList } from '@/components/app/FactList';
import { useCompaniesLite, useConsultantsLite, useMissionsLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DOCUMENT_KIND } from '@/lib/status';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DocumentVisibility, LibraryDocument } from '@/types';

export const VISIBILITY_LABEL: Record<DocumentVisibility, { fr: string; en: string }> = {
  internal: { fr: 'Interne', en: 'Internal' },
  client: { fr: 'Partagé au client', en: 'Shared with client' },
  consultant: { fr: 'Partagé au consultant', en: 'Shared with consultant' },
};

export function fileSize(n: number | null) {
  if (!n) return '—';
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

export function DocumentDetailDrawer({
  doc,
  versions,
  canEdit,
  onOpenChange,
  onChanged,
  onNewVersion,
}: {
  doc: LibraryDocument | null;
  /** Toutes les versions du document, la plus récente en premier. */
  versions: LibraryDocument[];
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onNewVersion: (doc: LibraryDocument) => void;
}) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { byId: companies } = useCompaniesLite();
  const { byId: consultants } = useConsultantsLite();
  const { byId: missions } = useMissionsLite(!!doc);
  const { byId: members } = useTeamMembers();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, success: string) {
    if (!doc) return;
    setBusy(true);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (fr ? 'Mise à jour impossible' : 'Update failed'));
      return;
    }
    toast.success(success);
    onChanged();
  }

  const company = doc?.company_id ? companies.get(doc.company_id) : null;
  const consultant = doc?.consultant_id ? consultants.get(doc.consultant_id) : null;
  const mission = doc?.mission_id ? missions.get(doc.mission_id) : null;

  return (
    <Drawer open={!!doc} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-lg">
        {doc && (
          <>
            <DrawerHeader>
              <DrawerTitle className="pr-8">{doc.title}</DrawerTitle>
              <DrawerDescription>
                {DOCUMENT_KIND[doc.kind]?.[lang] ?? doc.kind}
                {doc.archived && ` · ${fr ? 'archivé' : 'archived'}`}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerBody className="space-y-5">
              <Button asChild className="w-full">
                <a href={`/api/documents/${doc.id}`}>
                  <Download />
                  {fr ? 'Télécharger' : 'Download'} {versions.length > 1 && `(v${doc.version})`}
                </a>
              </Button>

              {doc.description && <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">{doc.description}</p>}

              <FactList
                facts={[
                  { label: fr ? 'Fichier' : 'File', value: <span className="break-all">{doc.file_name ?? '—'}</span> },
                  { label: fr ? 'Taille' : 'Size', value: fileSize(doc.size_bytes) },
                  {
                    label: 'Client',
                    value: company ? (
                      <Link href={`/clients/${company.id}`} className="text-primary-deep hover:underline">
                        {company.name}
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                  {
                    label: 'Consultant',
                    value: consultant ? (
                      <Link href={`/consultants/${consultant.id}`} className="text-primary-deep hover:underline">
                        {consultant.first_name} {consultant.last_name}
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                  {
                    label: 'Mission',
                    value: mission ? (
                      <Link href={`/missions/${mission.id}`} className="text-primary-deep hover:underline">
                        {mission.title}
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                  {
                    label: fr ? 'Déposé' : 'Uploaded',
                    value: `${formatDate(doc.created_at, lang)}${doc.created_by && members.get(doc.created_by) ? ` · ${members.get(doc.created_by)!.name}` : ''}`,
                  },
                ]}
              />

              {canEdit ? (
                <Field
                  label={fr ? 'Visibilité' : 'Visibility'}
                  htmlFor="doc-vis"
                  hint={fr ? 'S’applique à toutes les versions.' : 'Applies to all versions.'}
                >
                  <Select
                    id="doc-vis"
                    value={doc.visibility}
                    disabled={busy}
                    onChange={(e) => void patch({ visibility: e.target.value }, fr ? 'Visibilité mise à jour' : 'Visibility updated')}
                  >
                    <option value="internal">{VISIBILITY_LABEL.internal[lang]}</option>
                    <option value="client" disabled={!doc.company_id}>
                      {VISIBILITY_LABEL.client[lang]}
                      {!doc.company_id ? (fr ? ' (aucun client rattaché)' : ' (no client linked)') : ''}
                    </option>
                    <option value="consultant" disabled={!doc.consultant_id}>
                      {VISIBILITY_LABEL.consultant[lang]}
                      {!doc.consultant_id ? (fr ? ' (aucun consultant rattaché)' : ' (no consultant linked)') : ''}
                    </option>
                  </Select>
                </Field>
              ) : (
                <StatusPill tone={doc.visibility === 'internal' ? 'neutral' : 'info'}>{VISIBILITY_LABEL[doc.visibility][lang]}</StatusPill>
              )}

              <section>
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-[13px] font-medium">{fr ? 'Versions' : 'Versions'}</h3>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onNewVersion(doc)}>
                      <FilePlus2 />
                      {fr ? 'Nouvelle version' : 'New version'}
                    </Button>
                  )}
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {versions.map((v) => (
                    <li key={v.id} className={cn('flex items-center gap-3 px-3 py-2 text-[13px]', v.id === doc.id && 'bg-muted/50')}>
                      <span className="w-8 font-medium">v{v.version}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {formatDate(v.created_at, lang)} · {fileSize(v.size_bytes)}
                      </span>
                      <a href={`/api/documents/${v.id}`} className="text-primary-deep hover:underline" aria-label={fr ? `Télécharger la version ${v.version}` : `Download version ${v.version}`}>
                        <Download className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </DrawerBody>
            {canEdit && (
              <DrawerFooter>
                <Button
                  variant="ghost"
                  onClick={() => void patch({ archived: !doc.archived }, doc.archived ? (fr ? 'Document restauré' : 'Document restored') : fr ? 'Document archivé' : 'Document archived')}
                  disabled={busy}
                >
                  {doc.archived ? <ArchiveRestore /> : <Archive />}
                  {doc.archived ? (fr ? 'Restaurer' : 'Restore') : fr ? 'Archiver' : 'Archive'}
                </Button>
              </DrawerFooter>
            )}
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
