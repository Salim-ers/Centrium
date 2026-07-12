'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Briefcase,
  Activity,
  Search,
  ChevronRight,
  CircleCheck,
  Hourglass,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { AdminConsoleHeader } from '@/components/admin/AdminConsoleHeader';
import { StripeStatusBanner } from '@/components/admin/StripeStatusBanner';
import { PageHeader, KPICard, AppCard, AppCardBody, StatusBadge, EmptyState } from '@/components/app';
import { deriveOrgStatus, type OrgStatusCategory } from '@/lib/admin/org-status';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  plan_id: string | null;
  plan_name: string | null;
  sub_status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_exempt: boolean;
  members_count: number;
  consultants_count: number;
  active_missions: number;
  invoices_count: number;
  last_activity_at: string | null;
  activity_7d: number;
};

type Filter = 'all' | OrgStatusCategory;

const FILTERS: { key: Filter; label: string; labelEn: string }[] = [
  { key: 'all', label: 'Toutes', labelEn: 'All' },
  { key: 'active', label: 'Actives', labelEn: 'Active' },
  { key: 'trial', label: 'En essai', labelEn: 'Trial' },
  { key: 'risk', label: 'À risque', labelEn: 'At risk' },
  { key: 'exempt', label: 'Exemptes', labelEn: 'Exempt' },
];

function relativeDate(iso: string | null, isEn: boolean): string {
  if (!iso) return isEn ? 'Never' : 'Jamais';
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days <= 0) return isEn ? 'Today' : "Aujourd'hui";
  if (days === 1) return isEn ? 'Yesterday' : 'Hier';
  if (days < 30) return isEn ? `${days}d ago` : `Il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return isEn ? `${months}mo ago` : `Il y a ${months} mois`;
  const years = Math.floor(months / 12);
  return isEn ? `${years}y ago` : `Il y a ${years} an(s)`;
}

export default function AdminOrganizationsPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/organizations', { cache: 'no-store' });
        if (res.ok) {
          const body = (await res.json()) as { data: OrgRow[] };
          setRows(body.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const enriched = useMemo(
    () => rows.map((r) => ({ row: r, status: deriveOrgStatus(r) })),
    [rows],
  );

  const counts = useMemo(() => {
    const c = { all: enriched.length, active: 0, trial: 0, risk: 0, exempt: 0 };
    for (const e of enriched) c[e.status.category] += 1;
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter(({ row, status }) => {
      if (filter !== 'all' && status.category !== filter) return false;
      if (q && !`${row.name} ${row.slug}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enriched, filter, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminConsoleHeader
        title={isEn ? 'Super-admin console' : 'Console super-admin'}
        subtitle={
          isEn
            ? 'Organizations supervision · subscriptions · activity'
            : 'Supervision des organisations · abonnements · activité'
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <PageHeader
          eyebrow={isEn ? 'Supervision' : 'Supervision'}
          title={
            <>
              {isEn ? 'Your ' : 'Vos '}
              <span className="qc-italic-accent font-editorial italic">
                {isEn ? 'organizations.' : 'organisations.'}
              </span>
            </>
          }
          description={
            isEn
              ? 'All your clients — new, old, active or dormant. Click an organization for its full record: subscription, headcount and activity.'
              : 'Tous vos clients — nouveaux, anciens, actifs ou dormants. Cliquez une organisation pour sa fiche complète : abonnement, effectifs et activité.'
          }
        />

        <StripeStatusBanner />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard label="Total" value={counts.all} icon={Building2} tone="magenta" />
          <KPICard label={isEn ? 'Active' : 'Actives'} value={counts.active} icon={CircleCheck} tone="emerald" />
          <KPICard label={isEn ? 'Trial' : 'En essai'} value={counts.trial} icon={Hourglass} tone="amber" />
          <KPICard label={isEn ? 'At risk' : 'À risque'} value={counts.risk} icon={AlertTriangle} tone="rose" />
          <KPICard label={isEn ? 'Exempt' : 'Exemptes'} value={counts.exempt} icon={Sparkles} tone="violet" />
        </div>

        {/* Recherche + filtres */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isEn ? 'Search an organization…' : 'Rechercher une organisation…'}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-magenta/10 text-magenta ring-1 ring-magenta/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
                  }`}
                >
                  {isEn ? f.labelEn : f.label}
                  <span className="text-[10px] tabular-nums opacity-70">
                    {counts[f.key as keyof typeof counts]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-hairline bg-card/40 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 border-b border-hairline last:border-0 bg-white/[0.01] animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={isEn ? 'No organization' : 'Aucune organisation'}
            description={
              query || filter !== 'all'
                ? isEn
                  ? 'No result for this filter or search.'
                  : 'Aucun résultat pour ce filtre ou cette recherche.'
                : isEn
                  ? 'Organizations appear here as soon as they are created.'
                  : "Les organisations apparaissent ici dès qu'elles sont créées."
            }
          />
        ) : (
          <AppCard variant="default">
            <AppCardBody size="sm" className="p-0">
              <div className="divide-y divide-hairline">
                {filtered.map(({ row, status }) => (
                  <Link
                    key={row.id}
                    href={`/admin/organizations/${row.id}`}
                    className="group flex items-center gap-4 px-4 py-3.5 hover:bg-foreground/[0.03] transition-colors"
                  >
                    {/* Logo / initiale */}
                    <div className="h-10 w-10 rounded-xl bg-foreground/[0.04] border border-hairline flex items-center justify-center shrink-0 overflow-hidden">
                      {row.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.logo_url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {row.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Nom + plan */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{row.name}</span>
                        <StatusBadge tone={status.tone} dot={false}>
                          {status.label}
                          {status.daysLeft !== null && status.daysLeft >= 0
                            ? ` · ${status.daysLeft} j`
                            : ''}
                        </StatusBadge>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {row.plan_name ?? row.plan_id ?? '—'} ·{' '}
                        {isEn ? 'created ' : 'créée '}
                        {relativeDate(row.created_at, isEn)}
                      </div>
                    </div>

                    {/* Effectifs */}
                    <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground shrink-0">
                      <span className="inline-flex items-center gap-1.5" title={isEn ? 'Internal members' : 'Membres internes'}>
                        <Users className="h-3.5 w-3.5" />
                        {row.members_count}
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Consultants">
                        <Briefcase className="h-3.5 w-3.5" />
                        {row.consultants_count}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          row.activity_7d > 0 ? 'text-emerald-400' : ''
                        }`}
                        title={isEn ? 'Actions over 7 days' : 'Actions sur 7 jours'}
                      >
                        <Activity className="h-3.5 w-3.5" />
                        {row.activity_7d}
                      </span>
                      <span className="w-24 text-right" title={isEn ? 'Last activity' : 'Dernière activité'}>
                        {relativeDate(row.last_activity_at, isEn)}
                      </span>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-magenta transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </AppCardBody>
          </AppCard>
        )}
      </main>
    </div>
  );
}
