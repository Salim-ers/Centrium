'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useContactTypeLabels } from '@/lib/i18n/useBadges';
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

import { notifyError } from '@/lib/notify';
import { ContactCsvImportDialog } from '@/components/crm/ContactCsvImportDialog';
import { ContactReminderDialog } from '@/components/crm/ContactReminderDialog';
import { contactInteractionService } from '@/lib/services';
import type { ContactInteraction } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
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
  StatusBadge,
  type StatusTone,
} from '@/components/app';
import { presenceColor, presenceInitials } from '@/lib/realtime/presence-utils';
import { cn } from '@/lib/utils';
import { contactService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import type { Contact } from '@/types';
import { CONTACT_TYPE_LABEL } from '@/constants';
import { relativeDate } from '@/lib/utils';
import { SectionTabs } from '@/components/layout/SectionTabs';

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
  const isEn = useLocale().locale === 'en';
  const contactTypeLabels = useContactTypeLabels();
  const params = useSearchParams();
  // « + Créer → Contact » ouvre directement le formulaire (?new=1).
  const [dialogOpen, setDialogOpen] = useState(params.get('new') === '1');
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
  }

  // KPIs : total / recruteurs / clients finaux / ESN partenaires
  const recruiterCount = allContacts.filter((c) => c.contact_type === 'recruiter').length;
  const clientCount = allContacts.filter((c) => c.contact_type === 'client_final').length;
  const partnerCount = allContacts.filter((c) => c.contact_type === 'esn_partner').length;

  return (
    <AppShell>
      <PageHeader
        eyebrow={isEn ? 'Sales' : 'Activité commerciale'}
        title="CRM"
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
        tabs={<SectionTabs section="crm" />}
      />

      <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard accent="terra"
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
        <KPICard accent="soft"
          label={t.pages.contacts.kpi_esn}
          value={partnerCount}
          icon={Network}
          tone="amber"
        />
      </Reveal>

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

      <Reveal delay={0.05}>
        <div className="qc-premium relative mb-4 rounded-2xl border p-3">
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
        </div>
      </Reveal>

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
      <Reveal delay={0.1}>
      <AppCard>
        {/* overflow-x-auto : sur écran étroit le tableau défile au lieu de
            clipper la colonne Actions (carte en overflow-hidden arrondi). */}
        <div className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.pages.contacts.table_contact}</TableHead>
                <TableHead className="w-[96px]">{t.pages.contacts.table_type}</TableHead>
                <TableHead>{t.pages.contacts.table_company}</TableHead>
                <TableHead>{t.pages.contacts.table_email}</TableHead>
                <TableHead className="w-[132px]">{t.pages.contacts.table_phone}</TableHead>
                <TableHead className="w-[104px]">{t.pages.contacts.table_last_contact}</TableHead>
                <TableHead className="text-right w-[124px] pr-4">{t.pages.contacts.table_actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // 3 lignes skeleton pour donner l'impression d'un tableau
                // qui se remplit (avant : 1 seule ligne qui faisait coller
                // l'œil au vide). Hauteur 10 ~= ligne réelle.
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <div
                          className="h-8 surface-1 animate-pulse rounded-lg"
                          style={{ animationDelay: `${i * 120}ms` }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : (
                paginatedContacts.map((c, rowIdx) => {
                  const latest = latestByContact.get(c.id) ?? null;
                  const lastDate = latest?.created_at ?? c.last_interaction ?? null;
                  const hasReminder = !!c.next_call_reminder;
                  const avatarColor = presenceColor(c.id);
                  const initials = presenceInitials(c.first_name, c.last_name, c.email ?? '');
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(rowIdx, 10) * 0.03,
                        ease: 'easeOut',
                      }}
                      className="group h-12 border-b border-hairline transition-colors hover-surface"
                    >
                      <TableCell className="whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-2.5 font-medium"
                          title={`${c.last_name} ${c.first_name}`}
                        >
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-foreground/10 transition-transform duration-200 group-hover:scale-105',
                              avatarColor.bg,
                              avatarColor.text,
                            )}
                          >
                            {initials}
                          </span>
                          <span>
                            <span className="uppercase">{c.last_name}</span>{' '}
                            {c.first_name}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge
                          tone={CONTACT_TYPE_TONE[c.contact_type] ?? 'neutral'}
                          dot={false}
                          className="px-2 py-0.5 text-[10px]"
                        >
                          {contactTypeLabels[c.contact_type as keyof typeof contactTypeLabels] ?? CONTACT_TYPE_LABEL[c.contact_type]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell
                        className="text-xs max-w-[170px] truncate"
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
                      <TableCell className="text-xs max-w-[190px]">
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center gap-1 max-w-full min-w-0 text-muted-foreground hover:text-primary transition-colors"
                            title={c.email}
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
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
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                          <IconButton
                            onClick={() => markContacted(c)}
                            title={t.pages.contacts.action_mark_contacted}
                            colorClass="text-success hover:bg-success/10"
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
                                ? 'text-warning bg-warning/15 hover:bg-warning/25'
                                : 'text-warning hover:bg-warning/10'
                            }
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            onClick={() => openEdit(c)}
                            title={t.actions.edit}
                            colorClass="text-primary hover:bg-primary/10"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            onClick={() => deleteContact(c)}
                            title={t.actions.delete}
                            colorClass="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      </Reveal>
      )}

      <PaginationFooter
        pagination={pagination}
        total={contacts.length}
        itemLabel="contact"
      />
    </AppShell>
  );
}

/** Tone du badge type — aligné sur les couleurs des KPI (cyan/violet/amber). */
const CONTACT_TYPE_TONE: Record<string, StatusTone> = {
  recruiter: 'info',
  client_final: 'violet',
  esn_partner: 'warning',
};

/** Entrée en cascade des sections de la page (fondu + translation). */
function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
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
