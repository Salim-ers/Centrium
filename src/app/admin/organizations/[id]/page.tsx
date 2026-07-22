'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Users,
  Activity,
  Receipt,
  Briefcase,
  FileText,
  Target,
  Contact,
  ClipboardCheck,
  Banknote,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Loader2,
  Ban,
} from 'lucide-react';

import { AdminConsoleHeader } from '@/components/admin/AdminConsoleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  SectionHeader,
  AppCard,
  AppCardBody,
  StatusBadge,
  type StatusTone,
} from '@/components/app';
import { deriveOrgStatus } from '@/lib/admin/org-status';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Quota = { used: number; max: number | null };
type Detail = {
  org: Record<string, unknown> & {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    brand_name: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    siren: string | null;
    siret: string | null;
    vat_number: string | null;
    legal_form: string | null;
    representative_name: string | null;
    representative_title: string | null;
    brand_primary_color: string | null;
    created_at: string;
  };
  subscription: {
    plan_id: string | null;
    status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean | null;
    trial_end: string | null;
    is_exempt_from_billing: boolean | null;
    created_at: string | null;
    plans: { name: string | null; price_monthly_eur: number | null } | null;
  } | null;
  usage: {
    consultants: Quota;
    members: Quota;
    opportunities: Quota;
    contacts: Quota;
    missions: Quota;
  };
  members: {
    user_id: string;
    role: string;
    joined_at: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    is_founder: boolean;
  }[];
  counts: {
    invoices: number;
    paidRevenue: number;
    consultants: number;
    missions: number;
    contracts: number;
    opportunities: number;
    contacts: number;
    timesheets: number;
    jobOffers: number;
  };
  activities: {
    id: string;
    entity_type: string;
    action: string;
    created_at: string;
    actor: { name: string | null; email: string | null } | null;
  }[];
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  business_manager: 'Business Manager',
  recruiter: 'Recruteur',
  finance: 'Finance',
  viewer: 'Viewer',
  consultant: 'Consultant',
};

const ROLE_LABEL_EN: Record<string, string> = {
  admin: 'Admin',
  business_manager: 'Business Manager',
  recruiter: 'Recruiter',
  finance: 'Finance',
  viewer: 'Viewer',
  consultant: 'Consultant',
};

const ENTITY_LABEL: Record<string, string> = {
  consultant: 'consultant',
  mission: 'mission',
  contract: 'contrat',
  invoice: 'facture',
  opportunity: 'opportunité',
  contact: 'contact',
  timesheet: 'CRA',
  job_offer: 'offre',
  company: 'entreprise',
  cv: 'CV',
};

const ENTITY_LABEL_EN: Record<string, string> = {
  consultant: 'consultant',
  mission: 'mission',
  contract: 'contract',
  invoice: 'invoice',
  opportunity: 'opportunity',
  contact: 'contact',
  timesheet: 'timesheet',
  job_offer: 'job offer',
  company: 'company',
  cv: 'CV',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'a créé',
  updated: 'a modifié',
  deleted: 'a supprimé',
  archived: 'a archivé',
  validated: 'a validé',
  sent: 'a envoyé',
  signed: 'a signé',
  requested: 'a demandé',
  restored: 'a restauré',
};

const ACTION_LABEL_EN: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  archived: 'archived',
  validated: 'validated',
  sent: 'sent',
  signed: 'signed',
  requested: 'requested',
  restored: 'restored',
};

function fmtDate(iso: string | null | undefined, isEn = false): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtEur(n: number, isEn = false): string {
  return new Intl.NumberFormat(isEn ? 'en-GB' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function relative(iso: string, isEn = false): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return isEn ? 'just now' : "à l'instant";
  if (min < 60) return isEn ? `${min} min ago` : `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return isEn ? `${h} h ago` : `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return isEn ? `${d} d ago` : `il y a ${d} j`;
  return fmtDate(iso, isEn);
}

function UsageBar({ label, quota }: { label: string; quota: Quota }) {
  const { used, max } = quota;
  const unlimited = max === null;
  const ratio = unlimited || max === 0 ? 0 : Math.min(1, used / max);
  const pct = Math.round(ratio * 100);
  const tone = unlimited
    ? 'bg-violet-400'
    : ratio >= 1
      ? 'bg-rose-400'
      : ratio >= 0.8
        ? 'bg-amber-400'
        : 'bg-emerald-400';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used}
          <span className="text-muted-foreground"> / {unlimited ? '∞' : max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: unlimited ? '100%' : `${pct}%` }} />
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Receipt;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-card/40 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function AdminOrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    try {
      const res = await fetch(`/api/admin/organizations/${params.id}`, { cache: 'no-store' });
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const body = (await res.json()) as { data: Detail };
      setDetail(body.data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminConsoleHeader
        title={isEn ? 'Organization file' : 'Fiche organisation'}
        subtitle={isEn ? 'Oversight · subscription · headcount · activity' : 'Supervision · abonnement · effectifs · activité'}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/organizations" className="inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              {isEn ? 'Organizations' : 'Organisations'}
            </Link>
          </Button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-card/40 border border-hairline animate-pulse" />
            <div className="grid lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-card/40 border border-hairline animate-pulse" />
              ))}
            </div>
          </div>
        ) : notFound || !detail ? (
          <div className="text-center py-20">
            <h1 className="font-display text-2xl font-bold">{isEn ? 'Organization not found' : 'Organisation introuvable'}</h1>
            <Button className="mt-6" asChild>
              <Link href="/admin/organizations">
                <ArrowLeft className="h-4 w-4" />
                {isEn ? 'Back to organizations' : 'Retour aux organisations'}
              </Link>
            </Button>
          </div>
        ) : (
          <OrgDetail detail={detail} onChanged={load} />
        )}
      </main>
    </div>
  );
}

function OrgDetail({ detail, onChanged }: { detail: Detail; onChanged: () => void | Promise<void> }) {
  const router = useRouter();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const roleLabel = isEn ? ROLE_LABEL_EN : ROLE_LABEL;
  const entityLabel = isEn ? ENTITY_LABEL_EN : ENTITY_LABEL;
  const actionLabel = isEn ? ACTION_LABEL_EN : ACTION_LABEL;
  const { org, subscription, usage, members, counts, activities } = detail;
  const status = deriveOrgStatus({
    status: subscription?.status,
    trial_end: subscription?.trial_end,
    current_period_end: subscription?.current_period_end,
    is_exempt_from_billing: subscription?.is_exempt_from_billing,
  });
  const cityLine = [org.postal_code, org.city].filter(Boolean).join(' ');
  const isExempt = !!subscription?.is_exempt_from_billing;
  // Suspendable = non exempt et pas déjà coupé.
  const canSuspend =
    !isExempt && !!subscription && !['canceled', 'paused'].includes(subscription.status ?? '');

  // Suppression définitive — confirmation par saisie du nom exact.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [suspending, setSuspending] = useState(false);

  async function handleSuspend() {
    if (!window.confirm(isEn
      ? `Suspend access for “${org.name}”? The subscription is canceled (no charge) and access is cut off. Data is kept.`
      : `Suspendre l'accès de « ${org.name} » ? L'abonnement est résilié (aucun débit) et l'accès coupé. Les données sont conservées.`)) {
      return;
    }
    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}/suspend`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Unable to suspend' : 'Suspension impossible'));
        return;
      }
      toast.success(isEn ? `Access for “${org.name}” suspended` : `Accès de « ${org.name} » suspendu`);
      await onChanged();
    } finally {
      setSuspending(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      // Console super-admin : la confirmation par saisie du nom exact fait
      // office de garde-fou. On lève l'obligation d'export préalable
      // (exported: true) pour laisser l'opérateur supprimer sans y être forcé.
      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exported: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Unable to delete' : 'Suppression impossible'));
        return;
      }
      const extra =
        body.data?.authAccountsDeleted > 0
          ? isEn
            ? ` · ${body.data.authAccountsDeleted} account(s) deleted`
            : ` · ${body.data.authAccountsDeleted} compte(s) supprimé(s)`
          : '';
      toast.success(isEn ? `“${org.name}” deleted${extra}` : `« ${org.name} » supprimée${extra}`);
      router.push('/admin/organizations');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Bandeau identité */}
      <AppCard variant="default" tone="magenta">
        <AppCardBody size="md" className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-foreground/[0.04] border border-hairline flex items-center justify-center shrink-0 overflow-hidden">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt="" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-2xl font-bold tracking-tight truncate">{org.name}</h2>
              <StatusBadge tone={status.tone as StatusTone} dot={false}>
                {status.label}
                {status.daysLeft !== null && status.daysLeft >= 0 ? ` · ${status.daysLeft} ${isEn ? 'd' : 'j'}` : ''}
              </StatusBadge>
              {org.brand_primary_color && (
                <span
                  className="h-4 w-4 rounded-full border border-hairline shrink-0"
                  style={{ backgroundColor: org.brand_primary_color }}
                  title={`${isEn ? 'Brand color' : 'Couleur de marque'} ${org.brand_primary_color}`}
                />
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {org.brand_name && org.brand_name !== org.name ? `${org.brand_name} · ` : ''}
              <span className="font-mono text-xs">{org.slug}</span> · {isEn ? 'created on' : 'créée le'} {fmtDate(org.created_at, isEn)}
            </div>
            <div className="mt-2 grid sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
              {(org.address || cityLine) && (
                <div>
                  {org.address}
                  {org.address && cityLine ? ', ' : ''}
                  {cityLine}
                </div>
              )}
              {org.siren && <div>SIREN {org.siren}</div>}
              {org.vat_number && <div>{isEn ? 'VAT' : 'TVA'} {org.vat_number}</div>}
              {org.representative_name && (
                <div>
                  {org.representative_name}
                  {org.representative_title ? ` — ${org.representative_title}` : ''}
                </div>
              )}
            </div>
          </div>
        </AppCardBody>
      </AppCard>

      {/* Barre d'oversight : suspendre l'accès (garde les données). */}
      {canSuspend && (
        <div className="flex justify-end -mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuspend}
            disabled={suspending}
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-400"
          >
            {suspending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            {isEn ? 'Suspend access' : <>Suspendre l&apos;accès</>}
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Abonnement */}
        <section className="lg:col-span-1">
          <SectionHeader
            eyebrow={isEn ? 'Billing' : 'Facturation'}
            title={<>{isEn ? 'Subscription' : 'Abonnement'}<span className="qc-italic-accent font-editorial italic">.</span></>}
            description={isEn ? 'Plan, status and Stripe deadlines.' : 'Plan, statut et échéances Stripe.'}
          />
          <AppCard variant="default">
            <AppCardBody size="md" className="space-y-3 text-sm">
              <Row label="Plan" value={subscription?.plans?.name ?? subscription?.plan_id ?? '—'} />
              <Row
                label={isEn ? 'Status' : 'Statut'}
                value={
                  <StatusBadge tone={status.tone as StatusTone} dot={false}>
                    {status.label}
                  </StatusBadge>
                }
              />
              {subscription?.plans?.price_monthly_eur != null && (
                <Row label={isEn ? 'Price' : 'Prix'} value={`${fmtEur(Number(subscription.plans.price_monthly_eur), isEn)} ${isEn ? '/ month' : '/ mois'}`} />
              )}
              {subscription?.trial_end && (
                <Row label={isEn ? 'Trial end' : "Fin d'essai"} value={fmtDate(subscription.trial_end, isEn)} />
              )}
              {subscription?.current_period_end && (
                <Row label={isEn ? 'Period end' : 'Fin de période'} value={fmtDate(subscription.current_period_end, isEn)} />
              )}
              {subscription?.cancel_at_period_end && (
                <Row label={isEn ? 'Cancellation' : 'Résiliation'} value={<span className="text-amber-400">{isEn ? 'scheduled at period end' : 'programmée en fin de période'}</span>} />
              )}
              <Row
                label={isEn ? 'Billing' : 'Facturation'}
                value={
                  subscription?.is_exempt_from_billing ? (
                    <span className="inline-flex items-center gap-1 text-violet-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> {isEn ? 'Exempt' : 'Exempt'}
                    </span>
                  ) : (
                    isEn ? 'Standard' : 'Standard'
                  )
                }
              />
              {subscription?.stripe_customer_id && (
                <Row
                  label="Stripe"
                  value={<span className="font-mono text-[11px] break-all">{subscription.stripe_customer_id}</span>}
                />
              )}
            </AppCardBody>
          </AppCard>
        </section>

        {/* Usage vs limites */}
        <section className="lg:col-span-2">
          <SectionHeader
            eyebrow={isEn ? 'Consumption' : 'Consommation'}
            title={<>{isEn ? 'Plan ' : 'Usage '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'usage.' : 'du plan.'}</span></>}
            description={isEn ? "What the organization consumes against its plan limits." : "Ce que l'organisation consomme face aux limites de son plan."}
          />
          <AppCard variant="default">
            <AppCardBody size="md" className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              <UsageBar label={isEn ? 'Consultants' : 'Consultants'} quota={usage.consultants} />
              <UsageBar label={isEn ? 'Internal members' : 'Membres internes'} quota={usage.members} />
              <UsageBar label={isEn ? 'Open opportunities' : 'Opportunités ouvertes'} quota={usage.opportunities} />
              <UsageBar label={isEn ? 'Contacts' : 'Contacts'} quota={usage.contacts} />
              <UsageBar label={isEn ? 'Active missions' : 'Missions actives'} quota={usage.missions} />
            </AppCardBody>
          </AppCard>
        </section>
      </div>

      {/* Effectifs métier */}
      <section>
        <SectionHeader
          eyebrow={isEn ? 'Business activity' : 'Activité métier'}
          title={isEn ? <>What they <span className="qc-italic-accent font-editorial italic">produce.</span></> : <>Ce qu'ils <span className="qc-italic-accent font-editorial italic">produisent.</span></>}
          description={isEn ? 'Volume created in the tool, across all periods.' : "Volumétrie créée dans l'outil, toutes périodes confondues."}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Metric icon={Banknote} label={isEn ? 'Collected revenue' : 'CA encaissé'} value={fmtEur(counts.paidRevenue, isEn)} />
          <Metric icon={Receipt} label={isEn ? 'Invoices' : 'Factures'} value={counts.invoices} />
          <Metric icon={FileText} label={isEn ? 'Contracts' : 'Contrats'} value={counts.contracts} />
          <Metric icon={Briefcase} label={isEn ? 'Missions' : 'Missions'} value={counts.missions} />
          <Metric icon={Target} label={isEn ? 'Opportunities' : 'Opportunités'} value={counts.opportunities} />
          <Metric icon={Contact} label={isEn ? 'Contacts' : 'Contacts'} value={counts.contacts} />
          <Metric icon={ClipboardCheck} label={isEn ? 'Timesheets' : 'CRA'} value={counts.timesheets} />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Membres */}
        <section>
          <SectionHeader
            eyebrow={isEn ? 'Access' : 'Accès'}
            title={isEn ? <>Internal <span className="qc-italic-accent font-editorial italic">team.</span></> : <>Équipe <span className="qc-italic-accent font-editorial italic">interne.</span></>}
            description={isEn ? `${members.length} member(s) with access to the workspace.` : `${members.length} membre(s) avec accès à l'espace.`}
          />
          <AppCard variant="default">
            <AppCardBody size="sm" className="p-0">
              {members.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {isEn ? 'No internal member.' : 'Aucun membre interne.'}
                </div>
              ) : (
                <div className="divide-y divide-hairline">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="h-8 w-8 rounded-full bg-qc-gradient ring-1 ring-foreground/10 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                        {(m.first_name?.[0] ?? m.email?.[0] ?? '?').toUpperCase()}
                        {(m.last_name?.[0] ?? '').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate flex items-center gap-1.5">
                          {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || '—'}
                          {m.is_founder && (
                            <StatusBadge tone="magenta" dot={false}>
                              ★
                            </StatusBadge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                      </div>
                      <StatusBadge tone="neutral" dot={false}>
                        {roleLabel[m.role] ?? m.role}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </AppCardBody>
          </AppCard>
        </section>

        {/* Flux d'activité */}
        <section>
          <SectionHeader
            eyebrow={isEn ? 'Monitoring' : 'Surveillance'}
            title={isEn ? <>Recent <span className="qc-italic-accent font-editorial italic">activity.</span></> : <>Activité <span className="qc-italic-accent font-editorial italic">récente.</span></>}
            description={isEn ? 'The latest actions performed in the tool.' : "Les dernières actions effectuées dans l'outil."}
          />
          <AppCard variant="default">
            <AppCardBody size="sm" className="p-0">
              {activities.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <Activity className="h-5 w-5 mx-auto mb-2 text-muted-foreground/60" />
                  {isEn ? 'No activity recorded.' : 'Aucune activité enregistrée.'}
                </div>
              ) : (
                <div className="divide-y divide-hairline max-h-[420px] overflow-y-auto">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-magenta mt-2 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          <span className="font-medium">
                            {a.actor?.name ?? a.actor?.email ?? (isEn ? 'Someone' : 'Quelqu’un')}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {actionLabel[a.action] ?? a.action}{' '}
                            {entityLabel[a.entity_type] ?? a.entity_type}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{relative(a.created_at, isEn)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AppCardBody>
          </AppCard>
        </section>
      </div>

      {/* ===== Zone de danger ===== */}
      <section>
        <SectionHeader
          eyebrow={isEn ? 'Danger zone' : 'Zone de danger'}
          title={isEn ? <>Delete <span className="qc-italic-accent font-editorial italic">the organization.</span></> : <>Supprimer <span className="qc-italic-accent font-editorial italic">l'organisation.</span></>}
          description={isEn ? 'Permanent and irreversible action.' : 'Action définitive et irréversible.'}
        />
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-4 sm:p-5">
          {isExempt ? (
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground">{isEn ? 'Protected organization' : 'Organisation protégée'}</div>
                {isEn
                  ? 'This organization is exempt from billing (founder/internal account) and cannot be deleted from the console.'
                  : 'Cette organisation est exemptée de facturation (compte fondateur/interne) et ne peut pas être supprimée depuis la console.'}
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="max-w-xl">
                  <div className="font-medium text-foreground">
                    {isEn ? `Permanently delete “${org.name}”` : `Supprimer définitivement « ${org.name} »`}
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    {isEn ? (
                      <>
                        All the organization&apos;s data (consultants, missions, invoices,
                        contracts, timesheets, members…) will be <strong>erased</strong> and the
                        associated user accounts deleted. The Stripe subscription is canceled. The
                        linked quote request, however, is kept. This action cannot be undone.
                      </>
                    ) : (
                      <>
                        Toutes les données de l'organisation (consultants, missions, factures,
                        contrats, CRA, membres…) seront <strong>effacées</strong> et les comptes
                        utilisateurs associés supprimés. L'abonnement Stripe est annulé. La demande de
                        devis liée, elle, est conservée. Cette action est irréversible.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => {
                  setConfirmText('');
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {isEn ? 'Delete' : 'Supprimer'}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Dialog de confirmation — saisie du nom exact */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              {isEn ? `Delete “${org.name}”?` : `Supprimer « ${org.name} » ?`}
            </DialogTitle>
            <DialogDescription>
              {isEn ? (
                <>
                  This action is <strong>permanent</strong>. To confirm, type the exact name of the
                  organization below.
                </>
              ) : (
                <>
                  Cette action est <strong>définitive</strong>. Pour confirmer, saisis le nom exact de
                  l'organisation ci-dessous.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={org.name}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && confirmText.trim() === org.name.trim() && !deleting) {
                  void handleDelete();
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              {isEn ? (
                <>Type <span className="font-mono text-foreground">{org.name}</span> to enable the button.</>
              ) : (
                <>Tape <span className="font-mono text-foreground">{org.name}</span> pour activer le bouton.</>
              )}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              {isEn ? 'Cancel' : 'Annuler'}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting || confirmText.trim() !== org.name.trim()}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isEn ? 'Delete permanently' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
