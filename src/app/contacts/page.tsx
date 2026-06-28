'use client';

import { useEffect, useState } from 'react';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import {
  UserCircle,
  Plus,
  Mail,
  Phone,
  Pencil,
  Trash2,
  PhoneCall,
  FileUp,
  Bell,
  Search,
  Users,
  Briefcase,
  Building2,
  Network,
} from 'lucide-react';

import {
  notifyDestructive,
  notifyError,
  notifyUpdated,
} from '@/lib/notify';
import { ContactCsvImportDialog } from '@/components/crm/ContactCsvImportDialog';
import { ContactReminderDialog } from '@/components/crm/ContactReminderDialog';
import { contactInteractionService } from '@/lib/services';
import type { ContactInteraction } from '@/types';
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
import { Input } from '@/components/ui/input';
import {
  PageHeader,
  KPICard,
  AppCard,
  EmptyState,
} from '@/components/app';
import { contactService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import type { Contact } from '@/types';
import { CONTACT_TYPE_LABEL } from '@/constants';
import { relativeDate } from '@/lib/utils';

/**
 * Carnet de contacts — version simplifiée.
 *
 * Colonnes essentielles uniquement : qui est-ce, comment le joindre,
 * quand l'a-t-on contacté pour la dernière fois.
 *
 * 4 actions seulement :
 *   - "Contacté" (stamp last_interaction = NOW())
 *   - "Rappel" (programmer une relance)
 *   - "Éditer"
 *   - "Supprimer"
 */
export default function ContactsPage() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [reminderContact, setReminderContact] = useState<Contact | null>(null);
  const [latestByContact, setLatestByContact] = useState<Map<string, ContactInteraction>>(
    new Map(),
  );
  const [search, setSearch] = useState('');

  const {
    data: contactsData,
    loading,
    reload,
    setData: setContacts,
  } = useCachedQuery<Contact[]>(
    `contacts:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await contactService.list();
      const rows = res.data ?? [];
      return rows.slice().sort((a, b) => {
        const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.toLowerCase();
        const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.toLowerCase();
        return an.localeCompare(bn, 'fr');
      });
    },
    { enabled: !!activeOrgId },
  );

  // Un collègue qui ajoute / édite / archive un contact → on voit la modif sans F5.
  useRealtimeReload(['contacts'], () => reload());

  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    contactInteractionService.latestPerContact(activeOrgId).then((res) => {
      if (cancelled) return;
      setLatestByContact(res.data ?? new Map());
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, contactsData]);

  const allContacts = contactsData ?? [];
  // Filtre client-side : nom, prénom, entreprise (source), email, poste,
  // téléphone. Diacritique-insensitive pour matcher "boubchir" sur
  // "Boubchir" et "elresalitate" sur "El Réssalitate".
  const q = search
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  function norm(s: string | null | undefined): string {
    return (s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
  const contacts = q
    ? allContacts.filter((c) =>
        [c.first_name, c.last_name, c.source, c.email, c.phone, c.job_title].some((f) =>
          norm(f).includes(q),
        ),
      )
    : allContacts;
  const pagination = usePagination(contacts.length, {
    storageKey: 'contacts-page-size',
  });
  const paginatedContacts = pagination.paginate(contacts);

  function openCreate() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  async function deleteContact(contact: Contact) {
    if (!confirm(`${t.pages.todos.delete_confirm_prefix} "${contact.first_name} ${contact.last_name}" ?`)) return;
    const res = await contactService.archive(contact.id);
    if (res.error) {
      notifyError(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    notifyDestructive(`${contact.first_name} ${contact.last_name}${t.pages.todos.toast_deleted_suffix}`);
    setContacts((prev) => (prev ?? []).filter((c) => c.id !== contact.id));
  }

  async function markContacted(contact: Contact) {
    const res = await contactService.markInteracted(contact.id, { clear: false });
    if (res.error || !res.data) {
      notifyError(t.toasts.error_generic + ': ' + (res.error?.message ?? ''));
      return;
    }
    setContacts((prev) =>
      (prev ?? []).map((c) => (c.id === contact.id ? res.data! : c)),
    );
    notifyUpdated(
      `${contact.first_name} ${contact.last_name}`,
    );
  }

  // KPIs : total / recruteurs / clients finaux / ESN partenaires
  const recruiterCount = allContacts.filter((c) => c.contact_type === 'recruiter').length;
  const clientCount = allContacts.filter((c) => c.contact_type === 'client_final').length;
  const partnerCount = allContacts.filter((c) => c.contact_type === 'esn_partner').length;

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.contacts.eyebrow}
        title={
          <>
            {t.pages.contacts.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.contacts.title_b}</span>
          </>
        }
        description={
          q ? (
            <>
              {contacts.length} / {t.pages.contacts.description_count.replace('{n}', String(allContacts.length))}
            </>
          ) : (
            <>{t.pages.contacts.description_count.replace('{n}', String(allContacts.length))}</>
          )
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setCsvOpen(true)}>
              <FileUp className="h-4 w-4" />
              {t.pages.contacts.import_csv}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t.pages.contacts.new}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label={t.pages.contacts.kpi_total}
          value={allContacts.length}
          icon={Users}
          tone="magenta"
        />
        <KPICard
          label={t.pages.contacts.kpi_recruiters}
          value={recruiterCount}
          icon={Briefcase}
          tone="cyan"
        />
        <KPICard
          label={t.pages.contacts.kpi_clients}
          value={clientCount}
          icon={Building2}
          tone="violet"
        />
        <KPICard
          label={t.pages.contacts.kpi_esn}
          value={partnerCount}
          icon={Network}
          tone="amber"
        />
      </div>

      <ContactCsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={() => reload()}
      />

      <ContactReminderDialog
        open={!!reminderContact}
        onOpenChange={(v) => {
          if (!v) setReminderContact(null);
        }}
        contact={reminderContact}
        onSaved={(updated) => {
          setContacts((prev) =>
            (prev ?? []).map((c) => (c.id === updated.id ? updated : c)),
          );
        }}
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

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t.pages.contacts.search_placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {!loading && contacts.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title={
            q
              ? `${t.pages.contacts.empty_title} « ${search.trim()} »`
              : t.pages.contacts.empty_title
          }
          description={q ? t.actions.no_results : t.pages.contacts.empty_description}
          action={
            !q ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setCsvOpen(true)}>
                  <FileUp className="h-4 w-4" />
                  {t.pages.contacts.import_csv}
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t.pages.contacts.new}
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
      <AppCard>
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.pages.contacts.table_contact}</TableHead>
                <TableHead className="w-[110px]">{t.pages.contacts.table_type}</TableHead>
                <TableHead>{t.pages.contacts.table_company}</TableHead>
                <TableHead>{t.pages.contacts.table_email}</TableHead>
                <TableHead className="w-[140px]">{t.pages.contacts.table_phone}</TableHead>
                <TableHead className="w-[140px]">{t.pages.contacts.table_last_contact}</TableHead>
                <TableHead className="text-right w-[180px]">{t.pages.contacts.table_actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // 3 lignes skeleton pour donner l'impression d'un tableau
                // qui se remplit (avant : 1 seule ligne qui faisait coller
                // l'œil au vide). Hauteur 10 ~= ligne réelle.
                <>
                  {[0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <div className="h-8 bg-foreground/[0.04] animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : (
                paginatedContacts.map((c) => {
                  const latest = latestByContact.get(c.id) ?? null;
                  const lastDate = latest?.created_at ?? c.last_interaction ?? null;
                  const hasReminder = !!c.next_call_reminder;
                  return (
                    <TableRow key={c.id} className="h-12">
                      <TableCell className="whitespace-nowrap">
                        <span
                          className="font-medium"
                          title={`${c.last_name} ${c.first_name}`}
                        >
                          <span className="uppercase">{c.last_name}</span>{' '}
                          {c.first_name}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {CONTACT_TYPE_LABEL[c.contact_type]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[240px]"
                        title={c.source ?? undefined}
                      >
                        {c.source ? (
                          <span className="font-medium">
                            {c.source.replace(/^ESN:\s*/, '')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-violet-glow transition-colors"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            {c.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-violet-glow transition-colors"
                          >
                            <Phone className="h-3 w-3 shrink-0" />
                            {c.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {lastDate ? (
                          <span title={new Date(lastDate).toLocaleString('fr-FR')}>
                            {relativeDate(lastDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">
                            {t.pages.contacts.never_contacted}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                          <IconButton
                            onClick={() => markContacted(c)}
                            title={t.pages.contacts.never_contacted}
                            colorClass="text-emerald-300 hover:bg-emerald-500/10"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            onClick={() => setReminderContact(c)}
                            title={
                              hasReminder
                                ? new Date(c.next_call_reminder!).toLocaleString(undefined, {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })
                                : t.actions.edit
                            }
                            colorClass={
                              hasReminder
                                ? 'text-amber-200 bg-amber-500/15 hover:bg-amber-500/25'
                                : 'text-amber-300 hover:bg-amber-500/10'
                            }
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            onClick={() => openEdit(c)}
                            title={t.actions.edit}
                            colorClass="text-violet-glow hover:bg-violet-glow/10"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            onClick={() => deleteContact(c)}
                            title={t.actions.delete}
                            colorClass="text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      )}

      <PaginationFooter
        pagination={pagination}
        total={contacts.length}
        itemLabel="contact"
      />
    </AppShell>
  );
}

function IconButton({
  onClick,
  title,
  colorClass,
  children,
}: {
  onClick: () => void;
  title: string;
  colorClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`h-7 w-7 rounded-md inline-flex items-center justify-center transition ${colorClass}`}
    >
      {children}
    </button>
  );
}
