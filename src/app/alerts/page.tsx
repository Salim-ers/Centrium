'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
  Check,
  EyeOff,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { alertService, type ComputedAlert } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { relativeDate, cn } from '@/lib/utils';
import { notifyError } from '@/lib/notify';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
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
  return {
    invoice_overdue: tt.pages.alerts.kind_invoice_overdue,
    timesheet_pending: tt.pages.alerts.kind_timesheet_pending,
    mission_ending: tt.pages.alerts.kind_mission_ending,
    consultant_available: tt.pages.alerts.kind_consultant_available,
    client_follow_up: tt.pages.alerts.kind_client_follow_up,
    unanswered_message: tt.pages.alerts.kind_unanswered_message,
    offer_stale: tt.pages.alerts.kind_offer_stale,
    opportunity_cold: tt.pages.alerts.kind_opportunity_cold,
  };
}

export default function AlertsPage() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const PRIORITY_META = buildPriorityMeta(t);
  // Filtre par priorité — piloté par le bandeau de stats cliquable.
  // 'all' = pas de filtre. Re-cliquer sur la cellule active le désactive.
  const [filter, setFilter] = useState<Priority | 'all'>('all');

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

  // Les alertes computed se basent sur consultants/missions/invoices/timesheets/contacts.
  // Le moindre changement sur l'une de ces tables peut faire apparaître ou
  // disparaître une alerte — on relance le calcul.
  useRealtimeReload(
    ['alerts', 'consultants', 'missions', 'invoices', 'timesheets', 'contacts'],
    () => reloadAlerts(),
    { debounceMs: 500 },
  );

  async function handleDismiss(alert: ComputedAlert) {
    if (!activeOrgId) return;
    // Optimistic : on retire localement avant l'aller-retour DB. Si ça échoue
    // on rollback. Évite le flash visuel quand on enchaîne les dismiss.
    const previous = alerts;
    setAlerts((prev) => (prev ?? []).filter((a) => a.id !== alert.id));
    const res = await alertService.dismissComputed(alert.id, activeOrgId);
    if (res.error) {
      setAlerts(previous);
      notifyError(t.pages.alerts.cannot_hide_prefix + res.error.message);
      return;
    }
  }

  const grouped = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: alerts.filter((a) => a.priority === p),
  }));

  const totalCount = alerts.length;
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
      />

      {/* ============ Bandeau de stats cliquable = filtre par priorité ============
          Chaque cellule affiche le compteur animé de sa priorité. Cliquer
          filtre la liste ; re-cliquer revient à "Toutes". */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="qc-premium mb-6 grid grid-cols-2 rounded-2xl border lg:grid-cols-4"
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
      ) : totalCount === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t.pages.alerts.empty_title}
          description={t.pages.alerts.empty_description}
        />
      ) : visibleGroups.length === 0 ? (
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
                        onDismiss={() => handleDismiss(a)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function AlertItem({
  alert,
  index,
  onDismiss,
}: {
  alert: ComputedAlert;
  index: number;
  onDismiss: () => void;
}) {
  const t = useAppT();
  const meta = buildPriorityMeta(t)[alert.priority];
  const kindLabels = buildKindLabels(t);
  const kindLabel = kindLabels[alert.kind] ?? alert.kind.replace(/_/g, ' ');

  const body = (
    <div className="pl-5 pr-4 sm:pr-24 md:pr-32 py-3 flex items-start gap-3">
      <div className={cn('rounded-lg border p-2 shrink-0', meta.iconBorder, meta.iconBg, meta.iconText)}>
        <meta.Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge tone={PRIORITY_TONE[alert.priority]}>{kindLabel}</StatusBadge>
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
        {alert.link ? (
          <Link href={alert.link} className="block" title={t.pages.alerts.view_detail}>
            {body}
          </Link>
        ) : (
          body
        )}
      </div>

      {/* Barre d'actions en haut à droite : "Voir" + "Masquer". Révélée au
          survol sur desktop (toujours visible au clavier via focus-within),
          pleinement visible sur mobile. */}
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
      </div>
    </motion.div>
  );
}
