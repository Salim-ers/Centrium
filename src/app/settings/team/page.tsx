'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Users, UserPlus, Copy, Trash2, Mail, Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

type Member = {
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
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

export default function TeamSettingsPage() {
  const { activeOrgId, role } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    const supabase = createClient();

    // Membres : jointure avec profiles pour récupérer email + nom
    const { data: membersData } = await supabase
      .from('organization_members')
      .select('user_id, role, joined_at, profiles!inner(email, first_name, last_name)')
      .eq('organization_id', activeOrgId)
      .order('joined_at', { ascending: true });

    const formatted: Member[] = (membersData ?? []).map((m) => {
      const p = m.profiles as unknown as {
        email: string | null;
        first_name: string | null;
        last_name: string | null;
      } | null;
      return {
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        email: p?.email ?? null,
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
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
    if (!confirm('Retirer ce membre de l\'organisation ?')) return;
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

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users className="h-7 w-7 text-violet-glow" />
          Équipe
        </h1>
        <p className="text-muted-foreground mt-1">Membres & invitations de l&apos;organisation</p>
      </div>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Inviter un membre
            </CardTitle>
            <CardDescription className="text-xs">
              Un email Centrium sera envoyé automatiquement à l&apos;invité avec un lien de
              connexion. Le lien expire après 7 jours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendInvite} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
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
                <Select id="role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="recruiter">Recruteur</option>
                  <option value="business_manager">Business Manager</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Inviter
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Membres ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              ) : (
                members.map((m) => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-medium">
                      {[m.first_name, m.last_name].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABEL[m.role] ?? m.role}</Badge>
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
        </CardContent>
      </Card>

      {isAdmin && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitations en cours ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Expire</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABEL[i.role] ?? i.role}</Badge>
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
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
