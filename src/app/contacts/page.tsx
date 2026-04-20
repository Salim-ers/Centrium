'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserCircle, Plus, Linkedin, Mail, Phone, Pencil, Trash2 } from 'lucide-react';
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
import type { Contact } from '@/types';
import { CONTACT_TYPE_LABEL } from '@/constants';
import { relativeDate } from '@/lib/utils';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  async function reload() {
    const res = await contactService.list();
    if (res.data) setContacts(res.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

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
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Contact supprimé');
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau contact
        </Button>
      </div>

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingContact(null);
        }}
        organizationId={ORG_ID}
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
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">
                        {c.first_name} {c.last_name}
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
                    <TableCell className="text-xs">{relativeDate(c.last_interaction)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
