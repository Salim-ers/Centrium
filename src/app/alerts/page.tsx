'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
  Check,
  EyeOff,
  Search,
  MessageSquare,
  UserRound,
  CalendarClock,
  RotateCcw,
  Loader2,
  Settings2,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import {
  alertService,
  type ComputedAlert,
} from '@/lib/services';
import type { AlertComment, NotificationDelivery } from '@/types';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { relativeDate, cn } from '@/lib/utils';
import { notifyError } from '@/lib/notify';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/Combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PageHeader, EmptyState, StatusBadge, type StatusTone } from '@/components/app';

type Priority = ComputedAlert['priority'];

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low'];

type PriorityMeta = {
  label: string;
  sectionTitle: string;
  sectionHint: string;
  Icon: typeof ShieldAlert;
  cardBorder: string;
  cardBg: string;
  leftAccent: string;
  iconBorder: string;
  iconBg: string;
  iconText: string;
  badgeBg: string;
  badgeText: string;
  sectionHeaderText: string;
};

function buildPriorityMeta(tt: ReturnType<typeof useAppT>): Record<Priority, PriorityMeta> {
  return {
    critical: {
      label: tt.pages.alerts.chip_critical,
      sectionTitle: tt.pages.alerts.section_critical_title,
      sectionHint: tt.pages.alerts.section_critical_hint,
      Icon: ShieldAlert,
      cardBorder: 'border-red-500/40 hover:border-red-500/70',
      cardBg: 'bg-red-500/[0.05]',
      leftAccent: 'bg-red-500',
      iconBorder: 'border-red-500/30',
      iconBg: 'bg-red-500/15',
      iconText: 'text-red-700 dark:text-red-300',
      badgeBg: 'bg-red-500/15',
      badgeText: 'text-red-700 dark:text-red-300',
      sectionHeaderText: 'text-red-700 dark:text-red-300',
    },
    high: {
      label: tt.pages.alerts.chip_important,
      sectionTitle: tt.pages.alerts.section_important_title,
      sectionHint: tt.pages.alerts.section_important_hint,
      Icon: AlertTriangle,
      cardBorder: 'border-amber-500/40 hover:border-amber-500/70',
      cardBg: 'bg-amber-500/[0.05]',
      leftAccent: 'bg-amber-500',
      iconBorder: 'border-amber-500/30',
      iconBg: 'bg-amber-500/15',
      iconText: 'text-amber-700 dark:text-amber-300',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-700 dark:text-amber-300',
      sectionHeaderText: 'text-amber-700 dark:text-amber-300',
    },
    medium: {
      label: tt.pages.alerts.chip_moderate,
      sectionTitle: tt.pages.alerts.section_moderate_title,
      sectionHint: tt.pages.alerts.section_moderate_hint,
      Icon: Clock,
      cardBorder: 'border-blue-500/30 hover:border-blue-500/60',
      cardBg: 'bg-blue-500/[0.04]',
      leftAccent: 'bg-blue-500',
      iconBorder: 'border-blue-500/30',
      iconBg: 'bg-blue-500/15',
      iconText: 'text-blue-700 dark:text-blue-300',
      badgeBg: 'bg-blue-500/15',
      badgeText: 'text-blue-700 dark:text-blue-300',
      sectionHeaderText: 'text-blue-700 dark:text-blue-300',
    },
    low: {
      label: tt.pages.alerts.chip_info,
      sectionTitle: tt.pages.alerts.section_info_title,
      sectionHint: tt.pages.alerts.section_info_hint,
      Icon: Info,
      cardBorder: 'border-slate-500/25 hover:border-slate-500/50',
      cardBg: 'bg-slate-500/[0.04]',
      leftAccent: 'bg-slate-500',
      iconBorder: 'border-slate-500/30',
      iconBg: 'bg-slate-500/15',
      iconText: 'text-slate-700 dark:text-slate-300',
      badgeBg: 'bg-slate-500/15',
      badgeText: 'text-slate-700 dark:text-slate-300',
      sectionHeaderText: 'text-slate-700 dark:text-slate-300',
    },
  };
}

const PRIORITY_TONE: Record<Priority, StatusTone> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

function buildKindLabels(tt: ReturnType<typeof useAppT>): Record<string, string> {
  const a = tt.pages.alerts;
  return {
    invoice_overdue: a.kind_invoice_overdue,
    timesheet_pending: a.kind_timesheet_pending,
    mission_ending: a.kind_mission_ending,
    consultant_available: a.kind_consultant_available,
    client_follow_up: a.kind_client_follow_up,
    unanswered_message: a.kind_unanswered_message,
    offer_stale: a.kind_offer_stale,
    opportunity_cold: a.kind_opportunity_cold,
    profile_incomplete: a.kind_profile_incomplete,
    document_expiring: a.kind_document_expiring,
    timesheet_missing: a.kind_timesheet_missing,
    invoice_forgotten: a.kind_invoice_forgotten,
    invoice_draft_stale: a.kind_invoice_draft_stale,
    contract_pending_signature: a.kind_contract_pending_signature,
    contract_expiring: a.kind_contract_expiring,
    mission_no_contract: a.kind_mission_no_contract,
    mission_overrun: a.kind_mission_overrun,
    invitation_pending: a.kind_invitation_pending,
    system_issue: a.kind_system_issue,
  };
}

type Member = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
};

export default function AlertsPage() {
  const { activeOrgId, user } = useOrganization();
  const t = useAppT();
  const PRIORITY_META = buildPriorityMeta(t);
  const [filter, setFilter] = useState<Priority | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<ComputedAlert | null>(null);

  const {
    data: alertsData,
    loading,
    setData: setAlerts,
    reload: reloadAlerts,
  } = useCachedQuery<ComputedAlert[]>(
    `alerts-computed:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await alertService.listComputed(activeOrgId ?? undefined);
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const alerts = alertsData ?? [];

  // Membres internes de l'org — pour l'assignation d'une alerte.
  const { data: membersData } = useCachedQuery<Member[]>(
    `alerts:members:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await fetch('/api/organizations/members');
      if (!res.ok) throw new Error('members fetch failed');
      const json = await res.json();
      return ((json.data?.members ?? []) as Member[]).filter((m) => m.role !== 'consultant');
    },
    { enabled: !!activeOrgId },
  );
  const members = membersData ?? [];

  useRealtimeReload(
    ['alerts', 'consultants', 'missions', 'invoices', 'timesheets', 'contacts'],
    () => reloadAlerts(),
    { debounceMs: 500 },
  );

  async function handleDismiss(alert: ComputedAlert) {
    if (!activeOrgId) return;
    const previous = alerts;
    setAlerts((prev) => (prev ?? []).filter((a) => a.id !== alert.id));
    // Alertes matérialisées : statut dismissed (cycle de vie). Calculées :
    // table dismissed_alerts (comportement historique).
    const res =
      alert.source === 'computed'
        ? await alertService.dismissComputed(alert.id, activeOrgId)
        : await alertService.setStatus(alert.id, 'dismissed');
    if (res.error) {
      setAlerts(previous);
      notifyError(t.pages.alerts.cannot_hide_prefix + res.error.message);
    }
  }

  /** Actions de cycle de vie (alertes matérialisées uniquement). */
  async function handleLifecycle(
    alert: ComputedAlert,
    action: 'take' | 'snooze' | 'resolve' | 'reopen',
  ) {
    const status =
      action === 'take' ? 'in_progress'
      : action === 'snooze' ? 'snoozed'
      : action === 'resolve' ? 'resolved'
      : 'new';
    const previous = alerts;
    if (status === 'resolved' || status === 'snoozed') {
      setAlerts((prev) => (prev ?? []).filter((a) => a.id !== alert.id));
    } else {
      setAlerts((prev) =>
        (prev ?? []).map((a) => (a.id === alert.id ? { ...a, status } : a)),
      );
    }
    const res = await alertService.setStatus(alert.id, status, { userId: user?.id });
    if (res.error) {
      setAlerts(previous);
      notifyError(res.error.message);
      return;
    }
    setDetail(null);
  }

  async function handleAssign(alert: ComputedAlert, assigneeId: string | null) {
    const res = await alertService.assign(alert.id, assigneeId);
    if (res.error) {
      notifyError(res.error.message);
      return;
    }
    setAlerts((prev) =>
      (prev ?? []).map((a) => (a.id === alert.id ? { ...a, assignee_id: assigneeId } : a)),
    );
    setDetail((d) => (d && d.id === alert.id ? { ...d, assignee_id: assigneeId } : d));
  }

  const searched = useMemo(() => {
    if (!search.trim()) return alerts;
    const q = search.trim().toLowerCase();
    return alerts.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q),
    );
  }, [alerts, search]);

  const grouped = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: searched.filter((a) => a.priority === p),
  }));

  const totalCount = searched.length;
  const counts = {
    critical: grouped.find((g) => g.priority === 'critical')!.items.length,
    high: grouped.find((g) => g.priority === 'high')!.items.length,
    medium: grouped.find((g) => g.priority === 'medium')!.items.length,
    low: grouped.find((g) => g.priority === 'low')!.items.length,
  };

  const visibleGroups = grouped.filter(
    (g) => (filter === 'all' || g.priority === filter) && g.items.length > 0,
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.alerts.eyebrow}
        title={
          <>
            {t.pages.alerts.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.alerts.title_b}</span>
          </>
        }
        description={t.pages.alerts.description}
        actions={
          <Button variant="outline" asChild>
            <Link href="/settings/notifications" className="inline-flex items-center gap-1.5">
              <Settings2 className="h-4 w-4" />
              Notifications
            </Link>
          </Button>
        }
      />

      {/* Bandeau de stats cliquable = filtre par priorité */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="qc-premium mb-4 grid grid-cols-2 rounded-2xl border lg:grid-cols-4"
      >
        {PRIORITY_ORDER.map((p, i) => {
          const meta = PRIORITY_META[p];
          const c = counts[p];
          const active = filter === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(active ? 'all' : p)}
              title={active ? t.pages.alerts.filter_all : meta.label}
              className={cn(
                'relative px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                i === 1 && 'border-l border-hairline',
                i === 2 && 'border-t border-hairline lg:border-l lg:border-t-0',
                i === 3 && 'border-l border-t border-hairline lg:border-t-0',
                active ? meta.cardBg : 'hover-surface',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase tracking-[0.18em]',
                    active ? meta.sectionHeaderText : 'text-muted-foreground/80',
                  )}
                >
                  {meta.label}
                </span>
                <span
                  className={cn(
                    'relative flex h-7 w-7 items-center justify-center rounded-lg border',
                    meta.iconBorder,
                    meta.iconBg,
                    meta.iconText,
                  )}
                >
                  <meta.Icon className="h-3.5 w-3.5" />
                  {p === 'critical' && c > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </span>
              </div>
              <div
                className={cn(
                  'mt-1.5 font-display text-[1.75rem] font-light leading-none tracking-[-0.03em]',
                  c > 0 ? meta.sectionHeaderText : 'text-muted-foreground/50',
                )}
              >
                <AnimatedNumber value={loading ? null : c} />
              </div>
              {active && (
                <motion.span
                  layoutId="alerts-filter-active"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  className={cn('absolute inset-x-5 bottom-0 h-0.5 rounded-full', meta.leftAccent)}
                />
              )}
            </button>
          );
        })}
      </motion.section>

      {/* Recherche */}
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.pages.alerts.search_placeholder}
          className="pl-9"
          aria-label={t.pages.alerts.search_placeholder}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl surface-1 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      ) : totalCount === 0 || visibleGroups.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t.pages.alerts.empty_title}
          description={t.pages.alerts.empty_description}
        />
      ) : (
        <div className="space-y-8">
          {visibleGroups.map(({ priority, items }, sectionIdx) => {
            const meta = PRIORITY_META[priority];
            return (
              <motion.section
                key={priority}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 + sectionIdx * 0.06, ease: 'easeOut' }}
              >
                <header className="mb-3 flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                      meta.iconBorder,
                      meta.iconBg,
                      meta.iconText,
                    )}
                  >
                    <meta.Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className={cn('text-sm font-semibold tracking-tight', meta.sectionHeaderText)}>
                      {meta.sectionTitle}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {items.length}{' '}
                      {items.length > 1 ? t.pages.alerts.alert_word_many : t.pages.alerts.alert_word_one}
                      {' · '}
                      {meta.sectionHint}
                    </p>
                  </div>
                </header>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((a, i) => (
                      <AlertItem
                        key={a.id}
                        alert={a}
                        index={i}
                        members={members}
                        onDismiss={() => handleDismiss(a)}
                        onOpenDetail={() => setDetail(a)}
                        onTake={() => handleLifecycle(a, 'take')}
                        onResolve={() => handleLifecycle(a, 'resolve')}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            );
          })}
        </div>
      )}

      <AlertDetailDialog
        alert={detail}
        members={members}
        orgId={activeOrgId}
        userId={user?.id ?? null}
        onClose={() => setDetail(null)}
        onLifecycle={handleLifecycle}
        onAssign={handleAssign}
        onDismiss={handleDismiss}
      />
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Item d'alerte
// ─────────────────────────────────────────────────────────────────────────

function AlertItem({
  alert,
  index,
  members,
  onDismiss,
  onOpenDetail,
  onTake,
  onResolve,
}: {
  alert: ComputedAlert;
  index: number;
  members: Member[];
  onDismiss: () => void;
  onOpenDetail: () => void;
  onTake: () => void;
  onResolve: () => void;
}) {
  const t = useAppT();
  const meta = buildPriorityMeta(t)[alert.priority];
  const kindLabels = buildKindLabels(t);
  const kindLabel = kindLabels[alert.kind] ?? alert.kind.replace(/_/g, ' ');
  const managed = alert.source !== 'computed';
  const assignee = alert.assignee_id
    ? members.find((m) => m.user_id === alert.assignee_id)
    : null;

  const body = (
    <div className="pl-5 pr-4 sm:pr-32 md:pr-44 py-3 flex items-start gap-3">
      <div className={cn('rounded-lg border p-2 shrink-0', meta.iconBorder, meta.iconBg, meta.iconText)}>
        <meta.Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge tone={PRIORITY_TONE[alert.priority]}>{kindLabel}</StatusBadge>
          {managed && alert.status === 'in_progress' && (
            <StatusBadge tone="info">{t.pages.alerts.status_in_progress}</StatusBadge>
          )}
          {managed && alert.reminder_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              {alert.reminder_count} {t.pages.alerts.reminders_sent}
            </span>
          )}
          {assignee && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <UserRound className="h-3 w-3" />
              {assignee.first_name ?? assignee.email}
            </span>
          )}
          {alert.due_date && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {relativeDate(alert.due_date)}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold mt-1.5 leading-tight">{alert.title}</h3>
        {alert.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {alert.description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: index * 0.05, ease: 'easeOut' } }}
      exit={{ opacity: 0, x: 32, transition: { duration: 0.2, ease: 'easeIn' } }}
      className="group relative"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border transition-all hover:translate-x-0.5',
          meta.cardBorder,
          meta.cardBg,
        )}
      >
        <div className={cn('absolute left-0 top-0 bottom-0 w-1', meta.leftAccent)} />
        {managed ? (
          <button type="button" onClick={onOpenDetail} className="block w-full text-left" title={t.pages.alerts.view_detail}>
            {body}
          </button>
        ) : alert.link ? (
          <Link href={alert.link} className="block" title={t.pages.alerts.view_detail}>
            {body}
          </Link>
        ) : (
          body
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {alert.link && (
          <Link
            href={alert.link}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border border-hairline bg-card/80 backdrop-blur hover:border-foreground/30 hover:text-foreground text-muted-foreground transition"
            title={t.pages.alerts.view_detail}
            onClick={(e) => e.stopPropagation()}
          >
            <Check className="h-3 w-3" />
            {t.pages.alerts.view}
          </Link>
        )}
        {managed ? (
          <>
            {alert.status !== 'in_progress' && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTake(); }}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border border-hairline bg-card/80 backdrop-blur hover:border-foreground/30 hover:text-foreground text-muted-foreground transition"
                title={t.pages.alerts.take}
              >
                <UserRound className="h-3 w-3" />
                {t.pages.alerts.take}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onResolve(); }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border border-hairline bg-card/80 backdrop-blur hover:border-emerald-500/50 hover:text-emerald-500 text-muted-foreground transition"
              title={t.pages.alerts.resolve}
            >
              <CheckCircle2 className="h-3 w-3" />
              {t.pages.alerts.resolve}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border border-hairline bg-card/80 backdrop-blur hover:border-foreground/30 hover:text-foreground text-muted-foreground transition"
              title={t.pages.alerts.more_actions}
            >
              <MessageSquare className="h-3 w-3" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border border-hairline bg-card/80 backdrop-blur hover:border-foreground/30 hover:text-foreground text-muted-foreground transition"
            title={t.pages.alerts.hide_alert}
            aria-label={t.pages.alerts.hide_alert}
          >
            <EyeOff className="h-3 w-3" />
            {t.pages.alerts.hide_button}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Dialog de détail : actions complètes + assignation + commentaires + historique
// ─────────────────────────────────────────────────────────────────────────

function AlertDetailDialog({
  alert,
  members,
  orgId,
  userId,
  onClose,
  onLifecycle,
  onAssign,
  onDismiss,
}: {
  alert: ComputedAlert | null;
  members: Member[];
  orgId: string | null;
  userId: string | null;
  onClose: () => void;
  onLifecycle: (a: ComputedAlert, action: 'take' | 'snooze' | 'resolve' | 'reopen') => void;
  onAssign: (a: ComputedAlert, assigneeId: string | null) => void;
  onDismiss: (a: ComputedAlert) => void;
}) {
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const open = !!alert;
  const alertKey = alert?.id ?? '';

  const { data: comments, reload: reloadComments } = useCachedQuery<AlertComment[]>(
    `alert-comments:${orgId}:${alertKey}`,
    async () => {
      if (!orgId || !alertKey) return [];
      const res = await alertService.listComments(orgId, alertKey);
      return res.data ?? [];
    },
    { enabled: open && !!orgId },
  );

  const { data: deliveries } = useCachedQuery<NotificationDelivery[]>(
    `alert-deliveries:${orgId}:${alertKey}`,
    async () => {
      if (!orgId || !alertKey) return [];
      const res = await alertService.listDeliveries(orgId, alertKey);
      return res.data ?? [];
    },
    { enabled: open && !!orgId },
  );

  async function submitComment() {
    if (!alert || !orgId || !userId || !comment.trim()) return;
    setSending(true);
    try {
      const res = await alertService.addComment(orgId, alert.id, userId, comment.trim());
      if (res.error) {
        notifyError(res.error.message);
        return;
      }
      setComment('');
      await reloadComments();
    } finally {
      setSending(false);
    }
  }

  if (!alert) return null;
  const managed = alert.source !== 'computed';
  const memberName = (id: string | null) => {
    if (!id) return '—';
    const m = members.find((x) => x.user_id === id);
    return m ? `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email : '—';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">{alert.title}</DialogTitle>
          {alert.description && (
            <DialogDescription>{alert.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Méta */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-hairline p-2.5">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">{isEn ? 'Status' : 'Statut'}</div>
            {alert.status === 'in_progress'
              ? t.pages.alerts.status_in_progress
              : alert.status === 'snoozed'
                ? t.pages.alerts.status_snoozed
                : t.pages.alerts.status_new}
          </div>
          <div className="rounded-lg border border-hairline p-2.5">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">
              {t.pages.alerts.reminders_sent}
            </div>
            {alert.reminder_count}
            {alert.next_reminder_at && (
              <span className="text-muted-foreground">
                {' · '}
                {t.pages.alerts.next_reminder} {relativeDate(alert.next_reminder_at.slice(0, 10))}
              </span>
            )}
          </div>
        </div>

        {/* Actions de cycle de vie */}
        {managed && (
          <div className="flex flex-wrap gap-2">
            {alert.status !== 'in_progress' && (
              <Button size="sm" variant="outline" onClick={() => onLifecycle(alert, 'take')}>
                <UserRound className="h-3.5 w-3.5" />
                {t.pages.alerts.take}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onLifecycle(alert, 'snooze')}>
              <CalendarClock className="h-3.5 w-3.5" />
              {t.pages.alerts.snooze7}
            </Button>
            <Button size="sm" onClick={() => onLifecycle(alert, 'resolve')}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t.pages.alerts.resolve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onDismiss(alert);
                onClose();
              }}
            >
              <EyeOff className="h-3.5 w-3.5" />
              {t.pages.alerts.hide_button}
            </Button>
          </div>
        )}

        {/* Assignation */}
        {managed && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              {t.pages.alerts.assign_to}
            </div>
            <Combobox
              ariaLabel={t.pages.alerts.assign_to}
              value={alert.assignee_id ?? ''}
              onChange={(v) => onAssign(alert, v || null)}
              options={[
                { value: '', label: `— ${t.pages.alerts.unassign} —` },
                ...members.map((m) => ({
                  value: m.user_id,
                  label: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email,
                  sublabel: m.role,
                })),
              ]}
            />
          </div>
        )}

        {/* Commentaires */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            {t.pages.alerts.comments} {comments && comments.length > 0 ? `(${comments.length})` : ''}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(comments ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border border-hairline p-2.5 text-xs">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{memberName(c.author_id)}</span>
                  <span>{relativeDate(c.created_at.slice(0, 10))}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={t.pages.alerts.comment_placeholder}
              className="text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={sending || !comment.trim()}
              onClick={submitComment}
              className="self-end"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.pages.alerts.comment_send}
            </Button>
          </div>
        </div>

        {/* Historique des relances */}
        {managed && (deliveries ?? []).length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              {t.pages.alerts.history_title}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(deliveries ?? []).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded border border-hairline px-2 py-1.5 text-[11px]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <StatusBadge
                      tone={d.status === 'sent' ? 'success' : d.status === 'failed' ? 'danger' : 'neutral'}
                    >
                      {d.channel}
                    </StatusBadge>
                    <span className="text-muted-foreground">
                      {d.recipient ?? ''}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {relativeDate(d.created_at.slice(0, 10))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
