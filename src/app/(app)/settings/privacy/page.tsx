'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Download,
  Cookie,
  Trash2,
  Loader2,
  AlertTriangle,
  Building2,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { notifyError, notifyInfo } from '@/lib/notify';
import {
  PageHeader,
  SectionHeader,
  AppCard,
  AppCardBody,
} from '@/components/app';

export default function PrivacySettingsPage() {
  const { user, role } = useOrganization();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const isAdmin = role === 'admin';
  const [exporting, setExporting] = useState(false);
  const [exportingOrg, setExportingOrg] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [reason, setReason] = useState('');
  const [deleteReceipt, setDeleteReceipt] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/me/export', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        notifyError(body?.message ?? (isEn ? 'Export unavailable at the moment.' : 'Export impossible pour le moment.'));
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') ?? '';
      const match = /filename="?([^"]+)"?/.exec(cd);
      const filename =
        match?.[1] ?? `centrium-export-${new Date().toISOString().slice(0, 10)}.json`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notifyInfo(isEn ? 'Your data has been downloaded.' : 'Vos données ont été téléchargées.');
    } finally {
      setExporting(false);
    }
  }

  async function handleOrgExport() {
    setExportingOrg(true);
    try {
      const res = await fetch('/api/organizations/export', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        notifyError(body?.message ?? (isEn ? 'Organization export unavailable at the moment.' : 'Export de l’organisation impossible pour le moment.'));
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') ?? '';
      const match = /filename="?([^"]+)"?/.exec(cd);
      const filename =
        match?.[1] ?? `centrium-org-export-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notifyInfo(isEn ? 'Your organization data has been downloaded.' : 'Les données de votre organisation ont été téléchargées.');
    } finally {
      setExportingOrg(false);
    }
  }

  function openCookiePreferences() {
    window.dispatchEvent(new CustomEvent('centrium-open-cookie-preferences'));
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      notifyError(isEn ? 'The email entered does not match your account email.' : 'L’email saisi ne correspond pas à celui de votre compte.');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/me/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm_email: confirmEmail.trim(),
          reason: reason.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError(body?.message ?? (isEn ? 'Request unavailable at the moment.' : 'Demande impossible pour le moment.'));
        return;
      }
      setDeleteReceipt(body?.data?.reference ?? 'OK');
      setConfirmEmail('');
      setReason('');
      notifyInfo(isEn ? 'Your request has been recorded.' : 'Votre demande a été enregistrée.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        backHref="/settings"
        backLabel={isEn ? 'Back to settings' : 'Retour aux paramètres'}
        eyebrow={isEn ? 'Organization' : 'Organisation'}
        title={
          <>
            {isEn ? 'My' : 'Mes'}{' '}
            <span className="text-primary font-display ">
              {isEn ? 'data.' : 'données.'}
            </span>
          </>
        }
        description={
          isEn
            ? 'Exercise your GDPR rights: access your data, manage your consent, or request the deletion of your account.'
            : 'Exercez vos droits RGPD : accédez à vos données, gérez votre consentement, ou demandez la suppression de votre compte.'
        }
      />

      <div className="space-y-8 max-w-3xl">
        <section>
          <SectionHeader
            eyebrow={isEn ? 'Compliance' : 'Conformité'}
            title={
              <>
                {isEn ? 'Your' : 'Vos'}{' '}
                <span className="text-primary font-display ">
                  {isEn ? 'rights.' : 'droits.'}
                </span>
              </>
            }
            description={
              isEn
                ? 'Centrium acts as a processor for your organization’s business data, and as a controller for your account data.'
                : 'Centrium agit en sous-traitant pour les données métier de votre organisation, et en responsable de traitement pour vos données de compte.'
            }
            actions={<ShieldCheck className="h-4 w-4 text-primary" />}
          />
          <AppCard variant="default" tone="violet">
            <AppCardBody size="md" className="text-sm text-muted-foreground space-y-3">
              <p>
                {isEn
                  ? 'You have the right to access, rectify, erase, restrict, object to and port your data.'
                  : 'Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité.'}
              </p>
              <p>
                {isEn ? 'For any question:' : 'Pour toute question :'}{' '}
                <a
                  href="mailto:contact@centrium-platform.com"
                  className="text-primary hover:underline"
                >
                  contact@centrium-platform.com
                </a>
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link
                  href="/legal/privacy"
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-hairline hover:bg-muted transition"
                >
                  {isEn ? 'Privacy policy' : 'Politique de confidentialité'}
                </Link>
                <Link
                  href="/legal/dpa"
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-hairline hover:bg-muted transition"
                >
                  {isEn ? 'Data Processing Agreement (DPA)' : 'Accord de sous-traitance (DPA)'}
                </Link>
                <Link
                  href="/security"
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-hairline hover:bg-muted transition"
                >
                  {isEn ? 'Security & compliance' : 'Sécurité & conformité'}
                </Link>
              </div>
            </AppCardBody>
          </AppCard>
        </section>

        <section>
          <SectionHeader
            eyebrow="Export"
            title={
              <>
                {isEn ? 'Download' : 'Télécharger'}{' '}
                <span className="text-primary font-display ">
                  {isEn ? 'my data.' : 'mes données.'}
                </span>
              </>
            }
            description={
              isEn
                ? 'JSON file containing your identity, profile, personal todos and recent activity. Your organization’s business data is handled separately.'
                : 'Fichier JSON contenant identité, profil, todos personnelles, activité récente. Les données métier de votre organisation sont gérées séparément.'
            }
            actions={<Download className="h-4 w-4 text-primary" />}
          />
          <AppCard variant="default" tone="emerald">
            <AppCardBody size="md">
              <Button onClick={handleExport} disabled={exporting} variant="outline">
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isEn ? 'Download my data (JSON)' : 'Télécharger mes données (JSON)'}
              </Button>
            </AppCardBody>
          </AppCard>
        </section>

        {isAdmin && (
          <section>
            <SectionHeader
              eyebrow={isEn ? 'Portability' : 'Portabilité'}
              title={
                <>
                  {isEn ? 'Export' : 'Exporter'}{' '}
                  <span className="text-primary font-display ">
                    {isEn ? 'the organization.' : 'l’organisation.'}
                  </span>
                </>
              }
              description={
                isEn
                  ? 'Complete JSON archive of your organization’s business data: consultants, contacts, companies, job offers, opportunities, missions, contracts, CRA and invoices. Useful before leaving Centrium (art. 20 GDPR).'
                  : 'Archive JSON complète des données métier de votre organisation : consultants, contacts, sociétés, offres, opportunités, missions, contrats, CRA et factures. Utile avant de quitter Centrium (art. 20 RGPD).'
              }
              actions={<Building2 className="h-4 w-4 text-primary" />}
            />
            <AppCard variant="default" tone="violet">
              <AppCardBody size="md" className="space-y-3">
                <Button onClick={handleOrgExport} disabled={exportingOrg} variant="outline">
                  {exportingOrg ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  {isEn
                    ? 'Export all organization data (JSON)'
                    : 'Exporter toutes les données de l’organisation (JSON)'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? 'Stored files (CVs, contract/invoice PDFs) remain downloadable individually from their records.'
                    : 'Les fichiers stockés (CV, PDF de contrats/factures) restent téléchargeables individuellement depuis leurs fiches.'}
                </p>
              </AppCardBody>
            </AppCard>
          </section>
        )}

        <section>
          <SectionHeader
            eyebrow={isEn ? 'Consent' : 'Consentement'}
            title={
              <>
                {isEn ? 'Cookie' : 'Préférences'}{' '}
                <span className="text-primary font-display ">
                  {isEn ? 'preferences.' : 'cookies.'}
                </span>
              </>
            }
            description={
              isEn
                ? 'Change the cookie categories you accept on Centrium at any time. Essential cookies (session, security) always remain active.'
                : 'Modifiez à tout moment les catégories de cookies que vous acceptez sur Centrium. Les cookies essentiels (session, sécurité) restent toujours actifs.'
            }
            actions={<Cookie className="h-4 w-4 text-primary" />}
          />
          <AppCard variant="default" tone="cyan">
            <AppCardBody size="md">
              <Button onClick={openCookiePreferences} variant="outline">
                <Cookie className="h-4 w-4" />
                {isEn ? 'Open preferences' : 'Ouvrir les préférences'}
              </Button>
            </AppCardBody>
          </AppCard>
        </section>

        <section>
          <SectionHeader
            eyebrow={isEn ? 'Deletion' : 'Suppression'}
            title={
              <>
                {isEn ? 'Delete' : 'Supprimer'}{' '}
                <span className="text-primary font-display ">
                  {isEn ? 'my account.' : 'mon compte.'}
                </span>
              </>
            }
            description={
              isEn
                ? 'Request processed within 30 days in accordance with GDPR. Data subject to accounting obligations is retained for the legally required periods.'
                : 'Demande traitée sous 30 jours conformément au RGPD. Les données soumises à obligation comptable sont conservées dans les délais légaux.'
            }
            actions={<Trash2 className="h-4 w-4 text-destructive" />}
          />
          <AppCard variant="default" tone="rose">
            <AppCardBody size="md">
              {deleteReceipt ? (
                <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
                  <div className="font-semibold text-success mb-1">
                    {isEn ? 'Request recorded' : 'Demande enregistrée'}
                  </div>
                  <p className="text-muted-foreground">
                    {isEn ? 'Reference:' : 'Référence :'}{' '}
                    <span className="font-mono text-foreground">{deleteReceipt}</span>
                    {isEn
                      ? '. You will receive a confirmation email. To cancel the request, write to '
                      : '. Vous recevrez un email de confirmation. Pour annuler la demande, écrivez à '}
                    <a
                      href="mailto:contact@centrium-platform.com"
                      className="text-primary hover:underline"
                    >
                      contact@centrium-platform.com
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDelete} className="space-y-4">
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      {isEn ? (
                        <>
                          This request is <strong>irreversible</strong> once
                          processed. Your access, your personal profile and your
                          todos will be deleted. If you are the sole administrator
                          of your organization, contact us first to transfer
                          management.
                        </>
                      ) : (
                        <>
                          Cette demande est <strong>irréversible</strong> une fois
                          traitée. Vos accès, votre profil personnel et vos todos
                          seront supprimés. Si vous êtes le seul administrateur de
                          votre organisation, contactez-nous d’abord pour transférer
                          la gestion.
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm-email">
                      {isEn ? 'Confirm by entering your email' : 'Confirmez en saisissant votre email'}
                    </Label>
                    <Input
                      id="confirm-email"
                      type="email"
                      autoComplete="off"
                      placeholder={user?.email ?? (isEn ? 'your@email.com' : 'votre@email.com')}
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">{isEn ? 'Reason (optional)' : 'Motif (optionnel)'}</Label>
                    <Textarea
                      id="reason"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={isEn ? 'Help us understand — entirely optional.' : 'Aidez-nous à comprendre — entièrement facultatif.'}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={deleting || !confirmEmail.trim()}
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {isEn ? 'Send deletion request' : 'Envoyer la demande de suppression'}
                  </Button>
                </form>
              )}
            </AppCardBody>
          </AppCard>
        </section>
      </div>
    </AppShell>
  );
}
