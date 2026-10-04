'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Copy,
  Trash2,
  Mail,
  Loader2,
  Shield,
  Hourglass,
  Armchair,
  Crown,
  SlidersHorizontal,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/select';
import { ASSIGNABLE_ROLES, ROLE_LABEL, type EffectiveRole } from '@/lib/auth/permissions';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrganization } from '@/lib/auth/context';
import { PlanLimitDialog, type PlanLimitPayload } from '@/components/billing/PlanLimitDialog';
import { UsageBanner, USAGE_REFRESH_EVENT } from '@/components/billing/UsageBanner';
import {
  PageHeader,
  SectionHeader,
  KPICard,
  AppCard,
  AppCardBody,
  StatusBadge,
  type StatusTone,
  EmptyState,
} from '@/components/app';

type Member = {
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  is_founder: boolean;
  is_owner?: boolean;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const roleLabel = (role: string, isEn: boolean): string =>
  ROLE_LABEL[role as EffectiveRole]?.[isEn ? 'en' : 'fr'] ?? role;

const ROLE_TONE: Record<string, StatusTone> = {
  admin: 'magenta',
  direction: 'violet',
  business_manager: 'violet',
  recruiter: 'info',
  finance: 'info',
  viewer: 'neutral',
  consultant: 'neutral',
};

export default function TeamSettingsPage() {
  const { activeOrgId, role, user } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [planLimit, setPlanLimit] = useState<PlanLimitPayload | null>(null);

  const isAdmin = role === 'admin';
  const [busyMember, setBusyMember] = useState<string | null>(null);

  // Source UNIQUE et admin-backed (cohérente avec le compteur de quota) :
  // la liste ne dépend plus de la RLS client, qui renvoyait 0 selon le
  // compte alors que le compteur affichait la vraie valeur.
  const load = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/organizations/members', { cache: 'no-store' });
      if (!res.ok) {
        setMembers([]);
        setInvitations([]);
        return;
      }
      const body = (await res.json()) as {
        data: { members: Member[]; invitations: Invitation[] };
      };
      setMembers(body.data?.members ?? []);
      setInvitations(body.data?.invitations ?? []);
    } catch {
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  /** Force le compteur de quota (UsageBanner) à se rafraîchir immédiatement. */
  function refreshUsageCounter() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(USAGE_REFRESH_EVENT));
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 402 && body?.error === 'plan_limit_reached') {
          setPlanLimit(body as PlanLimitPayload);
          return;
        }
        toast.error(body.message ?? t.toasts.error_generic);
        return;
      }
      const { url, email_sent, email_error } = (await res.json()) as {
        url: string;
        email_sent: boolean;
        email_error: string | null;
      };
      if (email_sent) {
        toast.success(`✉ ${inviteEmail}`, { duration: 6000 });
      } else {
        await navigator.clipboard.writeText(url);
        toast.warning(`${t.toasts.error_network} (${email_error ?? ''}) — ${inviteEmail}`, { duration: 8000 });
      }
      setInviteEmail('');
      refreshUsageCounter(); // une invitation en attente compte dans le quota
      load();
    } finally {
      setInviting(false);
    }
  }

  async function copyLink(token: string) {
    const appUrl = window.location.origin;
    await navigator.clipboard.writeText(`${appUrl}/invite/accept?token=${token}`);
    toast.success(t.toasts.copied);
  }

  async function revokeInvitation(id: string) {
    if (!confirm(t.toasts.confirm_delete)) return;
    // Optimiste, puis rollback si l'API échoue.
    const prev = invitations;
    setInvitations((p) => p.filter((i) => i.id !== id));
    const res = await fetch(`/api/invitations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setInvitations(prev);
      const body = await res.json().catch(() => ({}));
      toast.error(body.message ?? t.toasts.error_generic);
      return;
    }
    toast.success(t.toasts.deleted);
    refreshUsageCounter();
  }

  async function removeMember(userId: string) {
    if (!activeOrgId) return;
    if (!confirm(t.toasts.confirm_delete)) return;
    // Optimiste : on retire tout de suite de la liste, rollback si échec.
    const prev = members;
    setMembers((p) => p.filter((m) => m.user_id !== userId));
    const res = await fetch(
      `/api/organizations/members?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      setMembers(prev);
      const body = await res.json().catch(() => ({}));
      toast.error(body.message ?? t.toasts.error_generic);
      return;
    }
    toast.success(t.toasts.deleted);
    refreshUsageCounter(); // le compteur se met à jour instantanément
  }

  const iAmOwner = members.some((m) => m.user_id === user?.id && m.is_owner);

  async function changeRole(userId: string, nextRole: string) {
    setBusyMember(userId);
    const res = await fetch(`/api/team/members/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });
    setBusyMember(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.message ?? t.toasts.error_generic);
      return;
    }
    toast.success(isEn ? 'Role updated' : 'Rôle mis à jour');
    load();
  }

  async function transferOwnership(m: Member) {
    const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || '';
    if (
      !confirm(
        isEn
          ? `Transfer ownership to ${name}? They become the owner (admin); you stay admin.`
          : `Transférer la propriété à ${name} ? Ce membre devient propriétaire (administrateur) ; vous restez administrateur.`,
      )
    )
      return;
    setBusyMember(m.user_id);
    const res = await fetch('/api/team/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: m.user_id }),
    });
    setBusyMember(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.message ?? t.toasts.error_generic);
      return;
    }
    toast.success(isEn ? 'Ownership transferred' : 'Propriété transférée');
    load();
  }

  // KPI : nb membres, nb admins, invitations en attente
  const kpis = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === 'admin').length;
    const pending = invitations.length;
    // Heuristique : on n'a pas l'info de quota ici, on affiche un "—"
    // pour rester honnête (la UsageBanner reste source de vérité).
    return { total, admins, pending };
  }, [members, invitations]);

  return (
    <AppShell>
      <PlanLimitDialog
        payload={planLimit}
        onOpenChange={(o) => {
          if (!o) setPlanLimit(null);
        }}
      />

      <PageHeader
        backHref="/settings"
        backLabel={t.pages.settings.back_to_settings}
        eyebrow={t.pages.team.eyebrow}
        title={
          <>
            {t.pages.team.title_a}{' '}
            <span className="text-primary font-display ">{t.pages.team.title_b}</span>
          </>
        }
        description={t.pages.team.description}
        actions={
          isAdmin && (
            <Button asChild variant="secondary">
              <Link href="/settings/permissions">
                <SlidersHorizontal />
                {isEn ? 'Customise permissions' : 'Personnaliser les permissions'}
              </Link>
            </Button>
          )
        }
      />

      <UsageBanner resource="members" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <KPICard
          label={t.pages.team.kpi_members}
          value={kpis.total}
          icon={Users}
          tone="magenta"
          hint={t.pages.team.kpi_members_hint}
        />
        <KPICard
          label={t.pages.team.kpi_admins}
          value={kpis.admins}
          icon={Shield}
          tone="violet"
          hint={t.pages.team.kpi_admins_hint}
        />
        <KPICard
          label={t.pages.team.kpi_invitations}
          value={kpis.pending}
          icon={Hourglass}
          tone="amber"
          hint={t.pages.team.kpi_invitations_hint}
        />
        <KPICard
          label={t.pages.team.kpi_seats_left}
          valueText="—"
          icon={Armchair}
          tone="emerald"
          hint={t.pages.team.kpi_seats_left_hint}
        />
      </div>

      {isAdmin && (
        <section className="mb-8">
          <SectionHeader
            eyebrow={t.pages.team.invite_section_eyebrow}
            title={
              <>
                {t.pages.team.invite_section_title_a}{' '}
                <span className="text-primary font-display ">{t.pages.team.invite_section_title_b}</span>
              </>
            }
            description={t.pages.team.invite_section_description}
            actions={<UserPlus className="h-4 w-4 text-primary" />}
          />
          <AppCard variant="default" tone="magenta">
            <AppCardBody size="md">
              <form onSubmit={sendInvite} className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    {t.pages.team.email_label}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.pages.team.email_placeholder}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="w-44 space-y-1.5">
                  <Label htmlFor="role" className="text-xs">
                    {t.pages.team.role_label}
                  </Label>
                  <Combobox
                    id="role"
                    value={inviteRole}
                    onChange={(v) => setInviteRole(v)}
                    options={[...ASSIGNABLE_ROLES].reverse().map((r) => ({ value: r, label: roleLabel(r, isEn) }))}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={inviting}
                  className="bg-gradient-to-r from-primary to-primary hover:opacity-95"
                >
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {t.pages.team.invite_button}
                </Button>
              </form>
            </AppCardBody>
          </AppCard>
        </section>
      )}

      <section className="mb-8">
        <SectionHeader
          eyebrow={t.pages.team.members_section_eyebrow}
          title={
            <>
              {t.pages.team.members_section_title_a}{' '}
              <span className="text-primary font-display ">
                {t.pages.team.members_section_title_b.replace('{n}', String(members.length))}
              </span>
            </>
          }
          description={t.pages.team.members_section_description}
        />
        <AppCard variant="default">
          <AppCardBody size="sm" className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.pages.team.table_name}</TableHead>
                  <TableHead>{t.pages.team.table_email}</TableHead>
                  <TableHead>{t.pages.team.table_role}</TableHead>
                  <TableHead>{t.pages.team.table_joined_at}</TableHead>
                  {isAdmin && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4}>
                      <div className="h-8 bg-card animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="py-12">
                      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                        <Users className="h-6 w-6 text-primary" />
                        <span className="text-sm">{t.pages.team.empty_no_members}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>
                            {[m.first_name, m.last_name].filter(Boolean).join(' ') || '—'}
                          </span>
                          {m.is_owner && (
                            <StatusBadge tone="magenta" dot={false}>
                              <Crown className="h-3 w-3" />
                              {isEn ? 'Owner' : 'Propriétaire'}
                            </StatusBadge>
                          )}
                          {m.is_founder && (
                            <StatusBadge tone="magenta" dot={false}>
                              ★ Founder
                            </StatusBadge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.email ?? '—'}
                      </TableCell>
                      <TableCell>
                        {isAdmin && !m.is_owner ? (
                          <Select
                            value={m.role}
                            onChange={(e) => void changeRole(m.user_id, e.target.value)}
                            disabled={busyMember === m.user_id}
                            className="h-8 w-44"
                            aria-label={isEn ? 'Role' : 'Rôle'}
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r, isEn)}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <StatusBadge tone={ROLE_TONE[m.role] ?? 'neutral'} dot={false}>
                            {roleLabel(m.role, isEn)}
                          </StatusBadge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.joined_at).toLocaleDateString()}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {iAmOwner && !m.is_owner && (
                            <Button variant="ghost" size="sm" onClick={() => void transferOwnership(m)} disabled={busyMember === m.user_id} title={isEn ? 'Transfer ownership' : 'Transférer la propriété'}>
                              <Crown className="h-3 w-3" />
                            </Button>
                          )}
                          {/* Un fondateur ou le propriétaire ne se retire pas depuis cet écran. */}
                          {!m.is_founder && !m.is_owner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(m.user_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </AppCardBody>
        </AppCard>
      </section>

      {isAdmin && invitations.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t.pages.team.kpi_invitations}
            title={
              <>
                {t.pages.team.kpi_invitations}{' '}
                <span className="text-primary font-display ">
                  ({invitations.length}).
                </span>
              </>
            }
            description={t.pages.team.kpi_invitations_hint}
          />
          <AppCard variant="default" tone="amber">
            <AppCardBody size="sm" className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.pages.team.table_email}</TableHead>
                    <TableHead>{t.pages.team.table_role}</TableHead>
                    <TableHead>{t.forms.contract.status}</TableHead>
                    <TableHead>{t.dashboard.pending}</TableHead>
                    <TableHead className="text-right">{t.pages.consultants.table_actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell>
                        <StatusBadge tone={ROLE_TONE[i.role] ?? 'neutral'} dot={false}>
                          {roleLabel(i.role, isEn)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="pending">{t.dashboard.pending}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(i.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => copyLink(i.token)}>
                          <Copy className="h-3 w-3" />
                          {t.toasts.copied}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeInvitation(i.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AppCardBody>
          </AppCard>
        </section>
      )}

      {isAdmin && invitations.length === 0 && !loading && (
        <section>
          <EmptyState
            icon={Hourglass}
            title={t.pages.team.pending_invitations_title}
            description={t.pages.team.all_invites_accepted}
          />
        </section>
      )}
    </AppShell>
  );
}
