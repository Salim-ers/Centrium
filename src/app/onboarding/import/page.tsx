'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, Building2, CheckCircle2, FileText, FileUp, Mail, Plus, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CentriumMark } from '@/components/brand/CentriumMark';
import { CsvImportDialog } from '@/components/consultants/CsvImportDialog';
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import { ClientCsvImportDialog } from '@/components/clients/ClientCsvImportDialog';
import { ClientDrawer } from '@/components/clients/ClientDrawer';
import { PlanLimitDialog, type PlanLimitPayload } from '@/components/billing/PlanLimitDialog';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { ASSIGNABLE_ROLES, ROLE_LABEL } from '@/lib/auth/permissions';

/**
 * Onboarding, dernière étape : inviter l'équipe et importer les données
 * (consultants par CSV ou CV, clients par CSV). Chaque bloc est facultatif ;
 * le dashboard est exploitable dès que des consultants et des missions
 * existent.
 */
export default function OnboardingImportPage() {
  const { activeOrgId, role } = useOrganization();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const isAdmin = role === 'admin';

  const [counts, setCounts] = useState<{ consultants: number; clients: number; members: number } | null>(null);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('business_manager');
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const [planLimit, setPlanLimit] = useState<PlanLimitPayload | null>(null);
  const [dialog, setDialog] = useState<'consultants-csv' | 'consultant-cv' | 'clients-csv' | 'client' | null>(null);

  const loadCounts = useCallback(async () => {
    if (!activeOrgId) return;
    const supabase = createClient();
    const [c, k, m] = await Promise.all([
      supabase.from('consultants').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId).eq('archived', false),
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId).eq('archived', false),
      supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).eq('organization_id', activeOrgId).neq('role', 'consultant'),
    ]);
    setCounts({ consultants: c.count ?? 0, clients: k.count ?? 0, members: m.count ?? 0 });
  }, [activeOrgId]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error(fr ? 'Adresse email invalide' : 'Invalid email address');
      return;
    }
    setInviting(true);
    const res = await fetch('/api/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role: inviteRole }) });
    setInviting(false);
    const body = await res.json().catch(() => ({}));
    if (res.status === 402 && body?.error === 'plan_limit_reached') {
      setPlanLimit(body as PlanLimitPayload);
      return;
    }
    if (!res.ok) {
      toast.error(body.message ?? (fr ? 'Invitation impossible' : 'Invitation failed'));
      return;
    }
    toast.success(body.email_sent ? (fr ? `Invitation envoyée à ${email}` : `Invitation sent to ${email}`) : fr ? 'Invitation créée : copiez le lien depuis Paramètres → Équipe.' : 'Invitation created: copy the link from Settings → Team.');
    setInvited((p) => [...p, email]);
    setEmail('');
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-4 py-10 text-center text-[14px] text-muted-foreground">
            <p>{fr ? 'Cette étape est réservée aux administrateurs de l’organisation.' : 'This step is for organisation administrators.'}</p>
            <Button asChild>
              <Link href="/dashboard">{fr ? 'Accéder au dashboard' : 'Go to dashboard'}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const done = (n: number | undefined) => (n ?? 0) > 0;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex justify-center">
          <CentriumMark size="md" />
        </div>
        <div>
          <div className="text-[13px] font-medium text-primary-deep">{fr ? 'Étape 4 sur 4' : 'Step 4 of 4'}</div>
          <h1 className="mt-1 font-display text-[26px] font-semibold tracking-tight">{fr ? 'Votre équipe et vos données' : 'Your team and your data'}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {fr ? 'Tout est facultatif : vous pourrez compléter plus tard depuis chaque module.' : 'Everything is optional: you can complete it later from each module.'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {fr ? 'Inviter l’équipe' : 'Invite your team'}
              {done((counts?.members ?? 0) - 1 + invited.length) && <CheckCircle2 className="h-4 w-4 text-success" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={fr ? 'prenom@votre-esn.fr' : 'name@yourfirm.com'} aria-label="Email" className="sm:flex-1" />
              <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} aria-label={fr ? 'Rôle' : 'Role'} className="sm:w-48">
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r][lang]}
                  </option>
                ))}
              </Select>
              <Button type="submit" loading={inviting}>
                <Mail />
                {fr ? 'Inviter' : 'Invite'}
              </Button>
            </form>
            {invited.length > 0 && <p className="text-[13px] text-muted-foreground">{fr ? `Invités : ${invited.join(', ')}` : `Invited: ${invited.join(', ')}`}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {fr ? 'Importer vos consultants' : 'Import your consultants'}
              {done(counts?.consultants) && <CheckCircle2 className="h-4 w-4 text-success" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[14px] text-muted-foreground">
              {counts ? (fr ? `${counts.consultants} consultant${counts.consultants > 1 ? 's' : ''} dans votre espace.` : `${counts.consultants} consultant(s) in your space.`) : '…'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => setDialog('consultants-csv')}>
                <FileUp />
                {fr ? 'Importer un fichier CSV' : 'Import a CSV file'}
              </Button>
              <Button variant="secondary" onClick={() => setDialog('consultant-cv')}>
                <Plus />
                {fr ? 'Créer depuis un CV' : 'Create from a CV'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {fr ? 'Importer vos clients' : 'Import your clients'}
              {done(counts?.clients) && <CheckCircle2 className="h-4 w-4 text-success" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[14px] text-muted-foreground">
              {counts ? (fr ? `${counts.clients} société${counts.clients > 1 ? 's' : ''} dans votre espace.` : `${counts.clients} compan(ies) in your space.`) : '…'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => setDialog('clients-csv')}>
                <FileUp />
                {fr ? 'Importer un fichier CSV' : 'Import a CSV file'}
              </Button>
              <Button variant="secondary" onClick={() => setDialog('client')}>
                <Plus />
                {fr ? 'Ajouter un client' : 'Add a client'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/onboarding/setup" className="text-[14px] text-muted-foreground hover:text-foreground">
            ← {fr ? 'Identité et branding' : 'Identity and branding'}
          </Link>
          <Button asChild>
            <Link href="/dashboard">
              {fr ? 'Accéder au dashboard' : 'Go to dashboard'}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      <CsvImportDialog open={dialog === 'consultants-csv'} onOpenChange={(o) => !o && setDialog(null)} onImported={() => void loadCounts()} />
      {activeOrgId && (
        <>
          <ConsultantFormDialog open={dialog === 'consultant-cv'} onOpenChange={(o) => !o && setDialog(null)} organizationId={activeOrgId} onSaved={() => void loadCounts()} />
          <ClientDrawer open={dialog === 'client'} onOpenChange={(o) => !o && setDialog(null)} organizationId={activeOrgId} onSaved={() => void loadCounts()} />
        </>
      )}
      <ClientCsvImportDialog open={dialog === 'clients-csv'} onOpenChange={(o) => !o && setDialog(null)} onImported={() => void loadCounts()} />
      <PlanLimitDialog payload={planLimit} onOpenChange={(o) => !o && setPlanLimit(null)} />
    </main>
  );
}
