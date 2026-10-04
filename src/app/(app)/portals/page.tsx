'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Copy, Inbox, Lock, Plus, UserCheck, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GrantPortalDialog } from '@/components/consultants/GrantPortalDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite, useContactsLite } from '@/hooks/useOrgDirectory';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { CLIENT_REQUEST_STATUS, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ClientPortalUser, ClientRequest } from '@/types';

type ConsultantRow = { id: string; first_name: string; last_name: string; email: string | null; job_title: string | null; status: string };
type Data = { accesses: ClientPortalUser[]; requests: ClientRequest[]; consultants: ConsultantRow[]; withPortal: string[] };

async function load(orgId: string, manage: boolean, requests: boolean): Promise<Data> {
  const supabase = createClient();
  const [accesses, reqs, consultants, profiles] = await Promise.all([
    manage ? fetch('/api/portals/clients', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { data: [] })) : Promise.resolve({ data: [] }),
    requests ? supabase.from('client_requests').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(300) : Promise.resolve({ data: [] }),
    manage
      ? supabase.from('consultants').select('id, first_name, last_name, email, job_title, status').eq('organization_id', orgId).eq('archived', false).eq('is_prospect', false).order('last_name')
      : Promise.resolve({ data: [] }),
    manage ? supabase.from('profiles').select('consultant_id').eq('organization_id', orgId).eq('role', 'consultant') : Promise.resolve({ data: [] }),
  ]);
  return {
    accesses: ((accesses as { data?: ClientPortalUser[] }).data ?? []) as ClientPortalUser[],
    requests: ((reqs as { data: unknown }).data ?? []) as ClientRequest[],
    consultants: ((consultants as { data: unknown }).data ?? []) as ConsultantRow[],
    withPortal: (((profiles as { data: unknown }).data ?? []) as Array<{ consultant_id: string | null }>).map((p) => p.consultant_id).filter((x): x is string => !!x),
  };
}

export default function PortalsPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const manage = can('portals.manage');
  const seeRequests = can('opportunities.view');
  const editRequests = can('opportunities.edit');
  const { byId: companies, options: companyOptions } = useCompaniesLite();
  const { byId: contacts, optionsFor: contactOptionsFor } = useContactsLite();
  const [tab, setTab] = useState(params.get('tab') ?? (manage ? 'clients' : 'requests'));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ company_id: '', contact_id: '', email: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [grantFor, setGrantFor] = useState<ConsultantRow | null>(null);

  const { data, loading, reload } = useCachedQuery<Data>(
    `portals:${activeOrgId ?? 'none'}:${manage ? 'm' : ''}${seeRequests ? 'r' : ''}`,
    () => load(activeOrgId!, manage, seeRequests),
    { enabled: !!activeOrgId && ready && (manage || seeRequests) },
  );

  const withPortal = useMemo(() => new Set(data?.withPortal ?? []), [data]);
  const newRequests = (data?.requests ?? []).filter((r) => r.status === 'new').length;

  if (ready && !manage && !seeRequests) {
    return (
      <AppShell>
        <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'Votre rôle ne donne pas accès aux portails.' : 'Your role has no access to portals.'} />
      </AppShell>
    );
  }

  async function sendInvite() {
    if (!invite.company_id || !invite.email) {
      toast.error(fr ? 'Client et email requis' : 'Client and email required');
      return;
    }
    setBusy('invite');
    const res = await fetch('/api/portals/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: invite.company_id, contact_id: invite.contact_id || null, email: invite.email }),
    });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (fr ? 'Invitation impossible' : 'Invitation failed'));
      return;
    }
    setInviteOpen(false);
    setInvite({ company_id: '', contact_id: '', email: '' });
    if (json.data?.email_sent) toast.success(fr ? 'Invitation envoyée par email' : 'Invitation emailed');
    else if (json.data?.invite_url) setFallbackLink(json.data.invite_url as string);
    void reload();
  }

  async function setAccess(userId: string, action: 'revoke' | 'restore') {
    setBusy(userId);
    const res = await fetch(`/api/portals/clients/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    setBusy(null);
    if (!res.ok) {
      toast.error(fr ? 'Action impossible' : 'Action failed');
      return;
    }
    toast.success(action === 'revoke' ? (fr ? 'Accès révoqué' : 'Access revoked') : fr ? 'Accès rétabli' : 'Access restored');
    void reload();
  }

  async function requestAction(id: string, action: 'convert' | 'in_review' | 'decline') {
    setBusy(id + action);
    const res = await fetch(`/api/portals/requests/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (fr ? 'Action impossible' : 'Action failed'));
      return;
    }
    toast.success(action === 'convert' ? (fr ? 'Opportunité créée' : 'Opportunity created') : fr ? 'Demande mise à jour' : 'Request updated');
    void reload();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Collaboration' : 'Collaboration'}
        title={fr ? 'Portails' : 'Portals'}
        description={
          fr
            ? 'Espaces sécurisés pour vos clients (missions, CRA, devis, documents, demandes) et vos consultants (CRA, documents).'
            : 'Secure spaces for your clients (missions, timesheets, quotes, documents, requests) and consultants (timesheets, documents).'
        }
        actions={
          manage && (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus />
              {fr ? 'Ouvrir un accès client' : 'Grant client access'}
            </Button>
          )
        }
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="underline">
            {manage && <TabsTrigger value="clients">{fr ? 'Accès clients' : 'Client access'}</TabsTrigger>}
            {seeRequests && (
              <TabsTrigger value="requests">
                {fr ? 'Demandes clients' : 'Client requests'}
                {newRequests > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] font-medium text-white">{newRequests}</span>}
              </TabsTrigger>
            )}
            {manage && <TabsTrigger value="consultants">{fr ? 'Portail consultant' : 'Consultant portal'}</TabsTrigger>}
          </TabsList>
        </Tabs>
      </PageHeader>

      {loading && !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsContent value="clients" className="mt-0">
            {!(data?.accesses ?? []).length ? (
              <EmptyState
                icon={Building2}
                title={fr ? 'Aucun accès client' : 'No client access yet'}
                description={
                  fr
                    ? 'Invitez un interlocuteur client : il suivra ses missions, approuvera les CRA et répondra à vos devis.'
                    : 'Invite a client contact to follow missions, approve timesheets and answer quotes.'
                }
                action={
                  <Button size="sm" onClick={() => setInviteOpen(true)}>
                    {fr ? 'Ouvrir un accès' : 'Grant access'}
                  </Button>
                }
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {data!.accesses.map((a) => {
                      const revoked = !!a.revoked_at;
                      const company = companies.get(a.company_id);
                      const contact = a.contact_id ? contacts.get(a.contact_id) : null;
                      return (
                        <li key={a.user_id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{company?.name ?? '—'}</span>
                              <StatusPill tone={revoked ? 'neutral' : a.last_seen_at ? 'success' : 'warning'}>
                                {revoked ? (fr ? 'Révoqué' : 'Revoked') : a.last_seen_at ? (fr ? 'Actif' : 'Active') : fr ? 'Invitation envoyée' : 'Invited'}
                              </StatusPill>
                            </div>
                            <div className="text-[12.5px] text-muted-foreground">
                              {contact ? `${contact.first_name} ${contact.last_name} · ` : ''}
                              {a.email}
                              {a.last_seen_at ? ` · ${fr ? 'vu le' : 'seen'} ${formatDate(a.last_seen_at, lang)}` : ''}
                            </div>
                          </div>
                          <Button variant={revoked ? 'secondary' : 'destructive-outline'} size="sm" onClick={() => void setAccess(a.user_id, revoked ? 'restore' : 'revoke')} loading={busy === a.user_id}>
                            {revoked ? (fr ? 'Rétablir' : 'Restore') : fr ? 'Révoquer' : 'Revoke'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-0">
            {!(data?.requests ?? []).length ? (
              <EmptyState
                icon={Inbox}
                title={fr ? 'Aucune demande' : 'No requests'}
                description={fr ? 'Les besoins exprimés par vos clients depuis leur portail arrivent ici.' : 'Needs submitted by clients from their portal land here.'}
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {data!.requests.map((r) => {
                      const st = statusOf(CLIENT_REQUEST_STATUS, r.status, lang);
                      return (
                        <li key={r.id} className={cn('flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center', r.status === 'new' && 'bg-brand-50/40')}>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{r.title}</span>
                              <StatusPill tone={st.tone}>{st.label}</StatusPill>
                            </div>
                            <div className="text-[12.5px] text-muted-foreground">
                              {companies.get(r.company_id)?.name ?? '—'} · {formatDate(r.created_at, lang)}
                              {r.skills?.length ? ` · ${r.skills.slice(0, 5).join(', ')}` : ''}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {r.opportunity_id ? (
                              <Button asChild variant="secondary" size="sm">
                                <Link href={`/opportunities/${r.opportunity_id}`}>{fr ? 'Voir l’opportunité' : 'Open opportunity'}</Link>
                              </Button>
                            ) : (
                              editRequests &&
                              r.status !== 'declined' && (
                                <>
                                  {r.status === 'new' && (
                                    <Button variant="ghost" size="sm" onClick={() => void requestAction(r.id, 'in_review')} disabled={!!busy}>
                                      {fr ? 'En étude' : 'In review'}
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => void requestAction(r.id, 'decline')} disabled={!!busy}>
                                    {fr ? 'Décliner' : 'Decline'}
                                  </Button>
                                  <Button size="sm" onClick={() => void requestAction(r.id, 'convert')} loading={busy === r.id + 'convert'}>
                                    {fr ? 'Créer l’opportunité' : 'Create opportunity'}
                                  </Button>
                                </>
                              )
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="consultants" className="mt-0 space-y-3">
            <p className="text-[13px] text-muted-foreground">
              {fr
                ? 'Le portail consultant donne accès aux missions, CRA (télétravail, absences), documents partagés et contrats — jamais au TJM de vente ni aux marges.'
                : 'The consultant portal gives access to missions, timesheets, shared documents and contracts — never to sale rates or margins.'}
            </p>
            {!(data?.consultants ?? []).length ? (
              <EmptyState icon={Users} title={fr ? 'Aucun consultant' : 'No consultants'} />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {data!.consultants.map((c) => {
                      const has = withPortal.has(c.id);
                      return (
                        <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                          <div className="min-w-0 flex-1">
                            <Link href={`/consultants/${c.id}`} className="font-medium hover:text-primary-deep">
                              {c.first_name} {c.last_name}
                            </Link>
                            <div className="truncate text-[12.5px] text-muted-foreground">{c.job_title ?? '—'}</div>
                          </div>
                          {has ? (
                            <StatusPill tone="success">
                              <UserCheck className="h-3 w-3" />
                              {fr ? 'Accès ouvert' : 'Has access'}
                            </StatusPill>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => setGrantFor(c)}>
                              {fr ? 'Inviter' : 'Invite'}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr ? 'Ouvrir un accès client' : 'Grant client access'}</DialogTitle>
            <DialogDescription>
              {fr
                ? 'L’interlocuteur reçoit un email pour choisir son mot de passe. Il ne verra que les données de sa société.'
                : 'The contact receives an email to set a password. They will only see their company’s data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Client" htmlFor="inv-company" required>
              <Combobox id="inv-company" options={companyOptions} value={invite.company_id} onChange={(v) => setInvite({ company_id: v, contact_id: '', email: '' })} placeholder={fr ? 'Choisir' : 'Choose'} />
            </Field>
            <Field label={fr ? 'Contact' : 'Contact'} htmlFor="inv-contact">
              <Combobox
                id="inv-contact"
                options={contactOptionsFor(invite.company_id || null)}
                value={invite.contact_id}
                onChange={(v) => setInvite((p) => ({ ...p, contact_id: v, email: p.email || contacts.get(v)?.email || '' }))}
                disabled={!invite.company_id}
                clearable
                placeholder={fr ? 'Facultatif' : 'Optional'}
              />
            </Field>
            <Field label="Email" htmlFor="inv-email" required>
              <Input id="inv-email" type="email" value={invite.email} onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))} autoComplete="off" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={() => void sendInvite()} loading={busy === 'invite'}>
              {fr ? 'Envoyer l’invitation' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fallbackLink} onOpenChange={(o) => !o && setFallbackLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr ? 'Email non envoyé' : 'Email not sent'}</DialogTitle>
            <DialogDescription>
              {fr ? 'L’accès est créé mais l’email n’a pas pu partir. Transmettez ce lien personnel à votre client :' : 'Access was created but the email failed. Send this personal link to your client:'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={fallbackLink ?? ''} />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                void navigator.clipboard.writeText(fallbackLink ?? '');
                toast.success(fr ? 'Lien copié' : 'Link copied');
              }}
              aria-label={fr ? 'Copier' : 'Copy'}
            >
              <Copy />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GrantPortalDialog open={!!grantFor} onOpenChange={(o) => !o && setGrantFor(null)} consultant={grantFor} onGranted={() => void reload()} />
    </AppShell>
  );
}
