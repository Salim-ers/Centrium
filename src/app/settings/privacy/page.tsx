'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Download,
  Cookie,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOrganization } from '@/lib/auth/context';
import { notifyError, notifyInfo } from '@/lib/notify';

export default function PrivacySettingsPage() {
  const { user } = useOrganization();
  const [exporting, setExporting] = useState(false);
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
        notifyError(body?.message ?? 'Export impossible pour le moment.');
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
      notifyInfo('Vos données ont été téléchargées.');
    } finally {
      setExporting(false);
    }
  }

  function openCookiePreferences() {
    window.dispatchEvent(new CustomEvent('centrium-open-cookie-preferences'));
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      notifyError('L’email saisi ne correspond pas à celui de votre compte.');
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
        notifyError(body?.message ?? 'Demande impossible pour le moment.');
        return;
      }
      setDeleteReceipt(body?.data?.reference ?? 'OK');
      setConfirmEmail('');
      setReason('');
      notifyInfo('Votre demande a été enregistrée.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Paramètres
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm">Mes données & confidentialité</span>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-violet-glow" />
          Mes données & confidentialité
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Exercez vos droits RGPD : accédez à vos données, gérez votre
          consentement, ou demandez la suppression de votre compte.
        </p>
      </div>

      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vos droits</CardTitle>
            <CardDescription>
              Centrium agit en sous-traitant pour les données métier de votre
              organisation, et en responsable de traitement pour vos données de
              compte. Vous disposez d’un droit d’accès, de rectification,
              d’effacement, de limitation, d’opposition et de portabilité.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Pour toute question :{' '}
              <a
                href="mailto:contact@centrium-platform.com"
                className="text-magenta hover:underline"
              >
                contact@centrium-platform.com
              </a>
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link
                href="/legal/privacy"
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-hairline hover:bg-white/5 transition"
              >
                Politique de confidentialité
              </Link>
              <Link
                href="/legal/dpa"
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-hairline hover:bg-white/5 transition"
              >
                Accord de sous-traitance (DPA)
              </Link>
              <Link
                href="/engagements"
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-hairline hover:bg-white/5 transition"
              >
                Sécurité & conformité
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-violet-glow" />
              Exporter mes données
            </CardTitle>
            <CardDescription>
              Téléchargez un fichier JSON contenant l’ensemble de vos données de
              compte (identité, profil, todos personnelles, activité récente).
              Les données métier de votre organisation (consultants, contacts,
              missions) sont gérées séparément par votre administrateur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting} variant="outline">
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger mes données (JSON)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cookie className="h-4 w-4 text-violet-glow" />
              Préférences cookies
            </CardTitle>
            <CardDescription>
              Modifiez à tout moment les catégories de cookies que vous acceptez
              sur Centrium. Les cookies essentiels (session, sécurité) restent
              toujours actifs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openCookiePreferences} variant="outline">
              <Cookie className="h-4 w-4" />
              Ouvrir les préférences
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-300">
              <Trash2 className="h-4 w-4" />
              Supprimer mon compte
            </CardTitle>
            <CardDescription>
              Cette action déclenche une demande de suppression. Notre équipe la
              traite sous 30 jours conformément au RGPD. Les données soumises à
              obligation comptable (factures notamment) sont conservées dans les
              délais légaux. Vous pouvez annuler votre demande à tout moment
              avant traitement en nous écrivant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deleteReceipt ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm">
                <div className="font-semibold text-emerald-300 mb-1">
                  Demande enregistrée
                </div>
                <p className="text-muted-foreground">
                  Référence :{' '}
                  <span className="font-mono text-foreground">{deleteReceipt}</span>
                  . Vous recevrez un email de confirmation. Pour annuler la
                  demande, écrivez à{' '}
                  <a
                    href="mailto:contact@centrium-platform.com"
                    className="text-magenta hover:underline"
                  >
                    contact@centrium-platform.com
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleDelete} className="space-y-4">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    Cette demande est <strong>irréversible</strong> une fois
                    traitée. Vos accès, votre profil personnel et vos todos
                    seront supprimés. Si vous êtes le seul administrateur de
                    votre organisation, contactez-nous d’abord pour transférer
                    la gestion.
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-email">
                    Confirmez en saisissant votre email
                  </Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    autoComplete="off"
                    placeholder={user?.email ?? 'votre@email.com'}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Motif (optionnel)</Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Aide-nous à comprendre — entièrement facultatif."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={deleting || !confirmEmail.trim()}
                  variant="outline"
                  className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Envoyer la demande de suppression
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
