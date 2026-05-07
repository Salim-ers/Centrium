'use client';

import { useEffect, useState } from 'react';
import {
  UserCircle,
  Plus,
  Linkedin,
  Mail,
  Phone,
  Pencil,
  Trash2,
  PhoneCall,
  X as XIcon,
  FileUp,
  CheckCheck,
  Undo2,
} from 'lucide-react';

import {
  notifyDestructive,
  notifyError,
  notifyUpdated,
} from '@/lib/notify';
import { ContactCsvImportDialog } from '@/components/crm/ContactCsvImportDialog';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContactFormDialog } from '@/components/crm/ContactFormDialog';
import { contactService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type { Contact } from '@/types';
import { CONTACT_TYPE_LABEL } from '@/constants';
import { relativeDate } from '@/lib/utils';

export default function ContactsPage() {
  const { activeOrgId } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const {
    data: contactsData,
    loading,
    reload,
    setData: setContacts,
  } = useCachedQuery<Contact[]>(
    `contacts:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await contactService.list();
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const contacts = contactsData ?? [];

  function openCreate() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  async function deleteContact(contact: Contact) {
    if (!confirm(`Supprimer le contact "${contact.first_name} ${contact.last_name}" ?`)) return;
    const res = await contactService.archive(contact.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyDestructive(`${contact.first_name} ${contact.last_name} supprimé`);
    setContacts((prev) => (prev ?? []).filter((c) => c.id !== contact.id));
  }

  async function toggleInteraction(contact: Contact) {
    // Click pour basculer : si le contact a déjà une date d'interaction,
    // on la garde et on actualise à maintenant ; si on Shift+click, on
    // efface la date pour repartir de zéro.
    const isClear = false;
    const res = await contactService.markInteracted(contact.id, { clear: isClear });
    if (res.error || !res.data) {
      notifyError('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    setContacts((prev) =>
      (prev ?? []).map((c) => (c.id === contact.id ? res.data! : c)),
    );
    notifyUpdated(
      `${contact.first_name} ${contact.last_name} — interaction enregistrée`,
      { description: 'Dernière interaction mise à jour à l\'instant' },
    );
  }

  async function clearInteraction(contact: Contact) {
    const res = await contactService.markInteracted(contact.id, { clear: true });
    if (res.error || !res.data) {
      notifyError('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    setContacts((prev) =>
      (prev ?? []).map((c) => (c.id === contact.id ? res.data! : c)),
    );
    notifyUpdated(
      `${contact.first_name} ${contact.last_name} — date effacée`,
    );
  }

  async function toggleProspecting(contact: Contact) {
    const next = !contact.prospecting_done;
    const res = await contactService.toggleProspectingDone(contact.id, next);
    if (res.error || !res.data) {
      notifyError('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    setContacts((prev) =>
      (prev ?? []).map((c) => (c.id === contact.id ? res.data! : c)),
    );
    notifyUpdated(
      next
        ? `${contact.first_name} ${contact.last_name} — démarchage terminé ✓`
        : `${contact.first_name} ${contact.last_name} — démarchage rouvert`,
      {
        description: next
          ? 'Le contact sort des listes de prospection active'
          : 'Le contact réintègre les listes de prospection',
      },
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <UserCircle className="h-7 w-7 text-violet-glow" />
            Carnet de contacts
          </h1>
          <p className="text-muted-foreground mt-1">
            {contacts.length} contact{contacts.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <FileUp className="h-4 w-4" />
            Importer CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau contact
          </Button>
        </div>
      </div>

      <ContactCsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={() => reload()}
      />

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingContact(null);
        }}
        organizationId={activeOrgId ?? ''}
        contact={editingContact}
        onSaved={() => reload()}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead>Dernière interaction</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Aucun contact
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((c) => (
                  <TableRow key={c.id} className={c.prospecting_done ? 'opacity-65' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">
                          {c.first_name} {c.last_name}
                        </div>
                        {c.prospecting_done && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[9px] uppercase tracking-wider font-semibold"
                            title={
                              c.prospecting_done_at
                                ? `Démarchage terminé le ${new Date(
                                    c.prospecting_done_at,
                                  ).toLocaleDateString('fr-FR')}`
                                : 'Démarchage terminé'
                            }
                          >
                            <CheckCheck className="h-2.5 w-2.5" />
                            Terminé
                          </span>
                        )}
                      </div>
                      {c.source && (
                        <div className="text-xs text-muted-foreground">via {c.source}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{CONTACT_TYPE_LABEL[c.contact_type]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.job_title ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-violet-glow transition-colors"
                        >
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-violet-glow transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.linkedin_url ? (
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-violet-glow transition-colors"
                        >
                          <Linkedin className="h-3 w-3" />
                          Profil
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <InteractionCell
                        lastInteraction={c.last_interaction}
                        onClear={() => clearInteraction(c)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant={c.last_interaction ? 'ghost' : 'outline'}
                          onClick={() => toggleInteraction(c)}
                          title={
                            c.last_interaction
                              ? 'Re-marquer comme contacté maintenant'
                              : 'Marquer comme contacté à l\'instant'
                          }
                          className={
                            c.last_interaction
                              ? 'text-emerald-300 hover:text-emerald-200'
                              : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                          }
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          {c.last_interaction ? '' : 'Contacté'}
                        </Button>
                        <Button
                          size="sm"
                          variant={c.prospecting_done ? 'ghost' : 'outline'}
                          onClick={() => toggleProspecting(c)}
                          title={
                            c.prospecting_done
                              ? 'Rouvrir le démarchage'
                              : 'Marquer le démarchage comme terminé'
                          }
                          className={
                            c.prospecting_done
                              ? 'text-amber-300 hover:text-amber-200'
                              : 'border-violet-glow/40 text-violet-100 hover:bg-violet-glow/10'
                          }
                        >
                          {c.prospecting_done ? (
                            <>
                              <Undo2 className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              <CheckCheck className="h-3.5 w-3.5" />
                              Démarchage OK
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(c)}
                          title="Éditer"
                        >
                          <Pencil className="h-3.5 w-3.5 text-violet-glow" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteContact(c)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function InteractionCell({
  lastInteraction,
  onClear,
}: {
  lastInteraction: string | null;
  onClear: () => void;
}) {
  if (!lastInteraction) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border border-amber-400/30 bg-amber-500/[0.06] text-amber-300">
        Jamais contacté
      </span>
    );
  }
  const d = new Date(lastInteraction);
  const dateStr = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="inline-flex items-center gap-1.5 group">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300">
        <span className="text-[11px] font-medium">{dateStr}</span>
        <span className="text-[10px] text-emerald-400/70">·</span>
        <span className="text-[10px] text-emerald-300/80">{timeStr}</span>
        <span className="text-[10px] text-emerald-400/60 ml-0.5">({relativeDate(lastInteraction)})</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        title="Effacer la date d'interaction"
        className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-red-400"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </div>
  );
}
