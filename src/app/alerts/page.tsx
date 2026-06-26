'use client';

import Link from 'next/link';
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
import { alertService, type ComputedAlert } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { relativeDate } from '@/lib/utils';
import { notifyDestructive, notifyError } from '@/lib/notify';
import { PageHeader, EmptyState, StatusBadge, type StatusTone } from '@/components/app';

type Priority = ComputedAlert['priority'];

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low'];

const PRIORITY_META: Record<
  Priority,
  {
    label: string;
    sectionTitle: string;
    sectionHint: string;
    Icon: typeof ShieldAlert;
    cardBorder: string;
    cardBg: string;
    leftAccent: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
    sectionHeaderText: string;
  }
> = {
  critical: {
    label: 'Critique',
    sectionTitle: 'Critique — à traiter immédiatement',
    sectionHint: 'Bloquant ou échu, action requise aujourd\'hui',
    Icon: ShieldAlert,
    cardBorder: 'border-red-500/40 hover:border-red-500/70',
    cardBg: 'bg-red-500/[0.05]',
    leftAccent: 'bg-red-500',
    iconBg: 'bg-red-500/15',
    iconText: 'text-red-700 dark:text-red-300',
    badgeBg: 'bg-red-500/15',
    badgeText: 'text-red-700 dark:text-red-300',
    sectionHeaderText: 'text-red-700 dark:text-red-300',
  },
  high: {
    label: 'Important',
    sectionTitle: 'Important — à traiter cette semaine',
    sectionHint: 'Échéance proche ou risque significatif',
    Icon: AlertTriangle,
    cardBorder: 'border-amber-500/40 hover:border-amber-500/70',
    cardBg: 'bg-amber-500/[0.05]',
    leftAccent: 'bg-amber-500',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-300',
    sectionHeaderText: 'text-amber-700 dark:text-amber-300',
  },
  medium: {
    label: 'Modéré',
    sectionTitle: 'Modéré — à planifier',
    sectionHint: 'À traiter dans les prochaines semaines',
    Icon: Clock,
    cardBorder: 'border-blue-500/30 hover:border-blue-500/60',
    cardBg: 'bg-blue-500/[0.04]',
    leftAccent: 'bg-blue-500',
    iconBg: 'bg-blue-500/15',
    iconText: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-700 dark:text-blue-300',
    sectionHeaderText: 'text-blue-700 dark:text-blue-300',
  },
  low: {
    label: 'Info',
    sectionTitle: 'Info — bon à savoir',
    sectionHint: 'Signaux faibles, pas d\'urgence',
    Icon: Info,
    cardBorder: 'border-slate-500/25 hover:border-slate-500/50',
    cardBg: 'bg-slate-500/[0.04]',
    leftAccent: 'bg-slate-500',
    iconBg: 'bg-slate-500/15',
    iconText: 'text-slate-700 dark:text-slate-300',
    badgeBg: 'bg-slate-500/15',
    badgeText: 'text-slate-700 dark:text-slate-300',
    sectionHeaderText: 'text-slate-700 dark:text-slate-300',
  },
};

const PRIORITY_TONE: Record<Priority, StatusTone> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

const KIND_LABEL_FR: Record<string, string> = {
  invoice_overdue: 'Facturation',
  timesheet_pending: 'CRA',
  mission_ending: 'Mission',
  consultant_available: 'Intercontrat',
  client_follow_up: 'Relance client',
  unanswered_message: 'Message',
  offer_stale: 'Offre',
  opportunity_cold: 'Opportunité',
};

export default function AlertsPage() {
  const { activeOrgId } = useOrganization();

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
      notifyError('Impossible de masquer cette alerte — ' + res.error.message);
      return;
    }
    notifyDestructive('Alerte masquée', {
      description: 'Elle ne réapparaîtra plus tant que la situation reste identique.',
    });
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

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pilotage"
        title={
          <>
            Alertes{' '}
            <span className="qc-italic-accent font-editorial italic">prioritaires.</span>
          </>
        }
        description="Signaux à traiter, classés par importance et calculés en temps réel sur ton activité."
      />

      {/* Sommaire en chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PRIORITY_ORDER.map((p) => {
          const meta = PRIORITY_META[p];
          const c = counts[p];
          return (
            <div
              key={p}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
                c > 0
                  ? `${meta.cardBorder} ${meta.cardBg} ${meta.sectionHeaderText}`
                  : 'border-hairline bg-foreground/[0.04] text-muted-foreground'
              }`}
            >
              <meta.Icon className="h-3.5 w-3.5" />
              <span className="font-semibold">{meta.label}</span>
              <span className="text-[10px] opacity-80">{c}</span>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-foreground/[0.04] animate-pulse" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Tout est sous contrôle"
          description="Aucune action urgente, aucune échéance dépassée. Bonne nouvelle."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ priority, items }) => {
            if (items.length === 0) return null;
            const meta = PRIORITY_META[priority];
            return (
              <section key={priority}>
                <header className="mb-3 flex items-baseline gap-3">
                  <div className={`flex items-center gap-2 ${meta.sectionHeaderText}`}>
                    <meta.Icon className="h-4 w-4" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">
                      {meta.sectionTitle}
                    </h2>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {items.length} alerte{items.length > 1 ? 's' : ''} · {meta.sectionHint}
                  </span>
                </header>

                <div className="space-y-2">
                  {items.map((a) => (
                    <AlertItem
                      key={a.id}
                      alert={a}
                      onDismiss={() => handleDismiss(a)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function AlertItem({
  alert,
  onDismiss,
}: {
  alert: ComputedAlert;
  onDismiss: () => void;
}) {
  const meta = PRIORITY_META[alert.priority];
  const kindLabel = KIND_LABEL_FR[alert.kind] ?? alert.kind.replace(/_/g, ' ');

  const body = (
    <div className="pl-5 pr-4 sm:pr-24 md:pr-32 py-3 flex items-start gap-3">
      <div className={`rounded-md p-2 shrink-0 ${meta.iconBg} ${meta.iconText}`}>
        <meta.Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge tone={PRIORITY_TONE[alert.priority]}>{kindLabel}</StatusBadge>
          {alert.due_date && (
            <span className="text-[11px] text-muted-foreground">
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
    <div className="group relative">
      <div
        className={`relative overflow-hidden rounded-lg border ${meta.cardBorder} ${meta.cardBg} transition`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.leftAccent}`} />
        {alert.link ? (
          <Link href={alert.link} className="block hover:brightness-110" title="Voir le détail">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>

      {/* Barre d'actions en haut à droite : "Traité" + "Masquer". Pleinement
          visibles dès qu'on survole, deux verbes clairs au lieu d'icônes
          ambiguës qui se superposaient à la flèche de lien. */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
        {alert.link && (
          <Link
            href={alert.link}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium border border-hairline bg-card/80 backdrop-blur hover:border-white/30 hover:text-foreground text-muted-foreground transition"
            title="Voir le détail"
            onClick={(e) => e.stopPropagation()}
          >
            <Check className="h-3 w-3" />
            Voir
          </Link>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium border border-hairline bg-card/80 backdrop-blur hover:border-white/30 hover:text-foreground text-muted-foreground transition"
          title="Masquer cette alerte"
          aria-label="Masquer cette alerte"
        >
          <EyeOff className="h-3 w-3" />
          Masquer
        </button>
      </div>
    </div>
  );
}
