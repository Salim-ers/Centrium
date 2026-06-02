'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { PlanLimitDialog, type PlanLimitPayload } from '@/components/billing/PlanLimitDialog';
import { UsageBanner } from '@/components/billing/UsageBanner';
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

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  business_manager: 'Business Manager',
  recruiter: 'Recruteur',
  finance: 'Finance',
  viewer: 'Viewer',
  consultant: 'Consultant',
};

const ROLE_TONE: Record<string, StatusTone> = {
  admin: 'magenta',
  business_manager: 'violet',
  recruiter: 'info',
  finance: 'info',
  viewer: 'neutral',
  consultant: 'neutral',
};

export default function TeamSettingsPage() {
  const { activeOrgId, role } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [planLimit, setPlanLimit] = useState<PlanLimitPayload | null>(null);

  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    const supabase = createClient();

    // Membres : jointure avec profiles pour récupérer email + nom
    const { data: membersData } = await supabase
      .from('organization_members')
      .select('user_id, role, joined_at, profiles!inner(email, first_name, last_name, is_founder)')
      .eq('organization_id', activeOrgId)
      .order('joined_at', { ascending: true });

    const formatted: Member[] = (membersData ?? []).map((m) => {
      const p = m.profiles as unknown as {
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        is_founder: boolean | null;
      } | null;
      return {
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        email: p?.email ?? null,
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        is_founder: !!p?.is_founder,
      };
    });
    setMembers(formatted);

    // Invitations en cours (non acceptées, non expirées)
    const { data: invitesData } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', activeOrgId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });
    setInvitations((invitesData ?? []) as Invitation[]);

    setLoading(false);
  }, [activeOrgId]);

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
        toast.error(body.message ?? 'Invitation échouée');
        return;
      }
      const { url, email_sent, email_error } = (await res.json()) as {
        url: string;
        email_sent: boolean;
        email_error: string | null;
      };
      if (email_sent) {
        toast.success(`✉ Email envoyé à ${inviteEmail}`, { duration: 6000 });
      } else {
        // Fallback : on n'a pas pu envoyer l'email, on copie le lien
        await navigator.clipboard.writeText(url);
        toast.warning(
          `Email non envoyé (${email_error ?? 'erreur SMTP'}) — lien copié dans le presse-papier, envoie-le manuellement à ${inviteEmail}.`,
          { duration: 8000 },
        );
      }
      setInviteEmail('');
      load();
    } finally {
      setInviting(false);
    }
  }

  async function copyLink(token: string) {
    const appUrl = window.location.origin;
    await navigator.clipboard.writeText(`${appUrl}/invite/accept?token=${token}`);
    toast.success('Lien copié');
  }

  async function revokeInvitation(id: string) {
    if (!confirm('Révoquer cette invitation ?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('organization_invitations').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Invitation révoquée');
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  }

  async function removeMember(userId: string) {
    if (!activeOrgId) return;
    if (!confirm("Retirer ce membre de l'organisation ?")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', activeOrgId)
      .eq('user_id', userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Membre retiré');
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
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
        eyebrow="Organisation"
        title={
          <>
            Équipe{' '}
            <span className="qc-italic-accent font-editorial italic">Centrium.</span>
          </>
        }
        description="Membres, invitations et rôles de l'organisation."
      />

      <UsageBanner resource="members" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <KPICard
          label="Membres"
          value={kpis.total}
          icon={Users}
          tone="magenta"
          hint="Compte actif"
        />
        <KPICard
          label="Administrateurs"
          value={kpis.admins}
          icon={Shield}
          tone="violet"
          hint="Accès total"
        />
        <KPICard
          label="Invitations"
          value={kpis.pending}
          icon={Hourglass}
          tone="amber"
          hint="En attente"
        />
        <KPICard
          label="Sièges restants"
          valueText="—"
          icon={Armchair}
          tone="emerald"
          hint="Voir bannière plan"
        />
      </div>

      {isAdmin && (
        <section className="mb-8">
          <SectionHeader
            eyebrow="Invitation"
            title={
              <>
                Inviter un{' '}
                <span className="qc-italic-accent font-editorial italic">membre.</span>
              </>
            }
            description="Un email Centrium sera envoyé automatiquement à l'invité avec un lien de connexion. Le lien expire après 7 jours."
            actions={<UserPlus className="h-4 w-4 text-magenta" />}
          />
          <AppCard variant="default" tone="magenta">
            <AppCardBody size="md">
              <form onSubmit={sendInvite} className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="collegue@entreprise.fr"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="w-44 space-y-1.5">
                  <Label htmlFor="role" className="text-xs">
                    Rôle
                  </Label>
                  <Select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="recruiter">Recruteur</option>
                    <option value="business_manager">Business Manager</option>
                    <option value="finance">Finance</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={inviting}
                  className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
                >
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Inviter
                </Button>
              </form>
            </AppCardBody>
          </AppCard>
        </section>
      )}

      <section className="mb-8">
        <SectionHeader
          eyebrow="Membres"
          title={
            <>
              Équipe{' '}
              <span className="qc-italic-accent font-editorial italic">
                active ({members.length}).
              </span>
            </>
          }
          description="Tous les utilisateurs de votre organisation."
        />
        <AppCard variant="default">
          <AppCardBody size="sm" className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Rejoint le</TableHead>
                  {isAdmin && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4}>
                      <div className="h-8 bg-white/[0.02] animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="py-12">
                      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                        <Users className="h-6 w-6 text-magenta/70" />
                        <span className="text-sm">Aucun membre pour l&apos;instant.</span>
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
                          {m.is_founder && (
                            <StatusBadge tone="magenta" dot={false}>
                              ★ Fondateur
                            </StatusBadge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.email ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={ROLE_TONE[m.role] ?? 'neutral'} dot={false}>
                          {ROLE_LABEL[m.role] ?? m.role}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.joined_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(m.user_id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
            eyebrow="Pipeline"
            title={
              <>
                Invitations{' '}
                <span className="qc-italic-accent font-editorial italic">
                  en cours ({invitations.length}).
                </span>
              </>
            }
            description="Liens d'accès non encore acceptés."
          />
          <AppCard variant="default" tone="amber">
            <AppCardBody size="sm" className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expire</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell>
                        <StatusBadge tone={ROLE_TONE[i.role] ?? 'neutral'} dot={false}>
                          {ROLE_LABEL[i.role] ?? i.role}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="pending">En attente</StatusBadge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(i.expires_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => copyLink(i.token)}>
                          <Copy className="h-3 w-3" />
                          Copier le lien
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeInvitation(i.id)}
                          className="text-red-400 hover:text-red-300"
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
            title="Aucune invitation en cours"
            description="Toutes les invitations envoyées ont été acceptées (ou révoquées)."
          />
        </section>
      )}
    </AppShell>
  );
}
