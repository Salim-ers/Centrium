'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Loader2, MessageSquareText, Save } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/lib/auth/context';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { PageHeader, SectionHeader, AppCard, AppCardBody } from '@/components/app';
import {
  notificationPreferencesService,
  orgNotificationSettingsService,
  type NotificationPreferencesRow,
} from '@/lib/services';
import {
  DEFAULT_ORG_NOTIFICATION_SETTINGS,
  resolveOrgSettings,
  type OrgNotificationSettings,
} from '@/lib/alerts/config';
import { cn } from '@/lib/utils';

// =========================================================================
// /settings/notifications — préférences de notifications.
// -------------------------------------------------------------------------
// Deux niveaux :
//   1. « Mes notifications » (chaque utilisateur) : canaux (email/SMS),
//      catégories reçues par email, récapitulatifs quotidien/hebdo, numéro
//      de téléphone. Stocké dans notification_preferences (RLS user_id).
//   2. « Réglages de l'organisation » (admin) : canaux actifs, cadences de
//      relance, seuils de détection, digests, relance client automatique.
//      Stocké dans org_notification_settings.settings (RLS admin).
// Les alertes critiques imposées par l'org restent toujours visibles in-app.
// =========================================================================

const CATEGORIES: Array<{ key: string; fr: string; en: string }> = [
  { key: 'consultants', fr: 'Consultants (profils, documents)', en: 'Consultants (profiles, documents)' },
  { key: 'cra', fr: 'CRA (saisie, validation, retards)', en: 'Timesheets (entry, validation, delays)' },
  { key: 'invoices', fr: 'Facturation (échéances, impayés)', en: 'Invoicing (due dates, overdue)' },
  { key: 'contracts', fr: 'Contrats (signatures, expirations)', en: 'Contracts (signatures, expiry)' },
  { key: 'missions', fr: 'Missions (débuts, fins)', en: 'Missions (starts, endings)' },
  { key: 'crm', fr: 'CRM (opportunités, relances)', en: 'CRM (opportunities, follow-ups)' },
  { key: 'system', fr: 'Système (quotas, sécurité)', en: 'System (quotas, security)' },
];

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'bg-violet-glow/80 border-violet-glow' : 'bg-foreground/10 border-hairline',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-hairline last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight">{title}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export default function NotificationSettingsPage() {
  const { activeOrgId, role, user } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);

  // — Préférences personnelles —
  const [prefs, setPrefs] = useState<Omit<NotificationPreferencesRow, 'user_id' | 'organization_id'>>({
    email_enabled: true,
    sms_enabled: false,
    categories: {},
    digest_daily: false,
    digest_weekly: true,
    phone: null,
  });

  // — Réglages org (admin) —
  const [orgSettings, setOrgSettings] = useState<OrgNotificationSettings>(
    DEFAULT_ORG_NOTIFICATION_SETTINGS,
  );

  useEffect(() => {
    if (!activeOrgId) return;
    let alive = true;
    (async () => {
      try {
        const [p, o] = await Promise.all([
          notificationPreferencesService.get(activeOrgId),
          orgNotificationSettingsService.get(activeOrgId),
        ]);
        if (!alive) return;
        if (p.data) {
          setPrefs({
            email_enabled: p.data.email_enabled,
            sms_enabled: p.data.sms_enabled,
            categories: p.data.categories ?? {},
            digest_daily: p.data.digest_daily,
            digest_weekly: p.data.digest_weekly,
            phone: p.data.phone,
          });
        }
        if (o.data) setOrgSettings(resolveOrgSettings(o.data));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeOrgId]);

  async function savePrefs() {
    if (!activeOrgId || !user?.id) return;
    setSavingPrefs(true);
    try {
      const res = await notificationPreferencesService.upsert({
        user_id: user.id,
        organization_id: activeOrgId,
        ...prefs,
      });
      if (res.error) {
        toast.error((isEn ? 'Save failed: ' : 'Échec de l’enregistrement : ') + res.error.message);
        return;
      }
      toast.info(isEn ? 'Preferences saved.' : 'Préférences enregistrées.');
    } finally {
      setSavingPrefs(false);
    }
  }

  async function saveOrgSettings() {
    if (!activeOrgId || !user?.id) return;
    setSavingOrg(true);
    try {
      const res = await orgNotificationSettingsService.update(
        activeOrgId,
        orgSettings as unknown as Record<string, unknown>,
        user.id,
      );
      if (res.error) {
        toast.error((isEn ? 'Save failed: ' : 'Échec de l’enregistrement : ') + res.error.message);
        return;
      }
      toast.info(isEn ? 'Organization settings saved.' : 'Réglages de l’organisation enregistrés.');
    } finally {
      setSavingOrg(false);
    }
  }

  const catEmailEnabled = (key: string) => prefs.categories?.[key]?.email !== false;
  const setCatEmail = (key: string, v: boolean) =>
    setPrefs((p) => ({
      ...p,
      categories: { ...p.categories, [key]: { ...(p.categories?.[key] ?? {}), email: v } },
    }));

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.alerts.eyebrow}
        title={
          <>
            {isEn ? 'Notification' : 'Préférences de'}{' '}
            <span className="qc-italic-accent font-editorial italic">
              {isEn ? 'preferences.' : 'notifications.'}
            </span>
          </>
        }
        description={
          isEn
            ? 'Choose what you receive, on which channel, and at what pace.'
            : 'Choisis ce que tu reçois, sur quel canal, et à quel rythme.'
        }
      />

      {loading ? (
        <div className="h-64 rounded-xl surface-1 animate-pulse" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* ── Mes notifications ─────────────────────────────────────── */}
          <AppCard variant="luminous" tone="violet">
            <AppCardBody size="md">
              <SectionHeader
                eyebrow={isEn ? 'Personal' : 'Personnel'}
                title={isEn ? 'My notifications' : 'Mes notifications'}
                description={
                  isEn
                    ? 'Applies to your account only. Critical alerts required by your organization always stay visible in-app.'
                    : 'S’applique à ton compte uniquement. Les alertes critiques imposées par l’organisation restent toujours visibles dans l’application.'
                }
              />

              <Row
                title="Email"
                hint={isEn ? 'Alerts and reminders by email' : 'Alertes et relances par email'}
              >
                <Toggle
                  checked={prefs.email_enabled}
                  onChange={(v) => setPrefs((p) => ({ ...p, email_enabled: v }))}
                  label="Email"
                />
              </Row>
              <Row
                title="SMS"
                hint={
                  isEn
                    ? 'Critical alerts only — requires phone number'
                    : 'Alertes critiques uniquement — numéro requis'
                }
              >
                <Toggle
                  checked={prefs.sms_enabled}
                  onChange={(v) => setPrefs((p) => ({ ...p, sms_enabled: v }))}
                  label="SMS"
                />
              </Row>
              {prefs.sms_enabled && (
                <div className="py-3 border-b border-hairline">
                  <Label>{isEn ? 'Mobile number' : 'Numéro de mobile'}</Label>
                  <Input
                    value={prefs.phone ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, phone: e.target.value || null }))}
                    placeholder="+33 6 12 34 56 78"
                    className="mt-1 max-w-56"
                  />
                </div>
              )}
              <Row
                title={isEn ? 'Daily recap' : 'Récapitulatif quotidien'}
                hint={isEn ? 'One email per day with pending actions' : 'Un email par jour avec les actions en attente'}
              >
                <Toggle
                  checked={prefs.digest_daily}
                  onChange={(v) => setPrefs((p) => ({ ...p, digest_daily: v }))}
                  label={isEn ? 'Daily recap' : 'Récap quotidien'}
                />
              </Row>
              <Row
                title={isEn ? 'Weekly recap' : 'Récapitulatif hebdomadaire'}
                hint={isEn ? 'Monday morning summary' : 'Synthèse le lundi matin'}
              >
                <Toggle
                  checked={prefs.digest_weekly}
                  onChange={(v) => setPrefs((p) => ({ ...p, digest_weekly: v }))}
                  label={isEn ? 'Weekly recap' : 'Récap hebdo'}
                />
              </Row>

              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {isEn ? 'Email categories' : 'Catégories reçues par email'}
                </div>
                {CATEGORIES.map((c) => (
                  <Row key={c.key} title={isEn ? c.en : c.fr}>
                    <Toggle
                      checked={catEmailEnabled(c.key)}
                      onChange={(v) => setCatEmail(c.key, v)}
                      label={isEn ? c.en : c.fr}
                      disabled={!prefs.email_enabled}
                    />
                  </Row>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <Button onClick={savePrefs} disabled={savingPrefs}>
                  {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEn ? 'Save my preferences' : 'Enregistrer mes préférences'}
                </Button>
              </div>
            </AppCardBody>
          </AppCard>

          {/* ── Réglages de l'organisation (admin) ────────────────────── */}
          {isAdmin && (
            <AppCard variant="luminous" tone="magenta">
              <AppCardBody size="md">
                <SectionHeader
                  eyebrow={isEn ? 'Organization' : 'Organisation'}
                  title={isEn ? 'Organization rules' : 'Règles de l’organisation'}
                  description={
                    isEn
                      ? 'Reminder cadence, detection thresholds and channels — applies to everyone.'
                      : 'Cadences de relance, seuils de détection et canaux — s’applique à toute l’équipe.'
                  }
                />

                <Row
                  title={isEn ? 'Email channel' : 'Canal email'}
                  hint={isEn ? 'Alerts + automatic reminders' : 'Alertes + relances automatiques'}
                >
                  <Toggle
                    checked={orgSettings.channels.email}
                    onChange={(v) =>
                      setOrgSettings((s) => ({ ...s, channels: { ...s.channels, email: v } }))
                    }
                    label="Email org"
                  />
                </Row>
                <Row
                  title={isEn ? 'SMS channel' : 'Canal SMS'}
                  hint={
                    isEn
                      ? 'Requires an SMS provider (Twilio/Brevo) configured'
                      : 'Nécessite un prestataire SMS configuré (Twilio/Brevo)'
                  }
                >
                  <Toggle
                    checked={orgSettings.channels.sms}
                    onChange={(v) =>
                      setOrgSettings((s) => ({ ...s, channels: { ...s.channels, sms: v } }))
                    }
                    label="SMS org"
                  />
                </Row>

                <div className="grid grid-cols-2 gap-3 py-3 border-b border-hairline">
                  <div>
                    <Label>
                      {isEn ? 'Profile reminder (days)' : 'Relance profil incomplet (jours)'}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={orgSettings.cadences.profile_incomplete.repeat_days}
                      onChange={(e) =>
                        setOrgSettings((s) => ({
                          ...s,
                          cadences: {
                            ...s.cadences,
                            profile_incomplete: {
                              ...s.cadences.profile_incomplete,
                              repeat_days: Math.max(1, Number(e.target.value) || 7),
                            },
                          },
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{isEn ? 'Timesheet reminder (days)' : 'Relance CRA (jours)'}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={orgSettings.cadences.cra.repeat_days}
                      onChange={(e) =>
                        setOrgSettings((s) => ({
                          ...s,
                          cadences: {
                            ...s.cadences,
                            cra: {
                              ...s.cadences.cra,
                              repeat_days: Math.max(1, Number(e.target.value) || 7),
                            },
                          },
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>
                      {isEn ? 'Forgotten invoice after (days)' : 'Facture oubliée après (jours)'}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={orgSettings.thresholds.invoice_forgotten_days}
                      onChange={(e) =>
                        setOrgSettings((s) => ({
                          ...s,
                          thresholds: {
                            ...s.thresholds,
                            invoice_forgotten_days: Math.max(1, Number(e.target.value) || 7),
                          },
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>
                      {isEn ? 'Stale opportunity after (days)' : 'Opportunité sans suivi après (jours)'}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={orgSettings.thresholds.opportunity_stale_days}
                      onChange={(e) =>
                        setOrgSettings((s) => ({
                          ...s,
                          thresholds: {
                            ...s.thresholds,
                            opportunity_stale_days: Math.max(1, Number(e.target.value) || 14),
                          },
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <Row
                  title={isEn ? 'Daily digest (admins)' : 'Récap quotidien (admins)'}
                  hint={isEn ? 'Only sent when something needs action' : 'Envoyé seulement s’il y a des actions à traiter'}
                >
                  <Toggle
                    checked={orgSettings.digest.daily}
                    onChange={(v) =>
                      setOrgSettings((s) => ({ ...s, digest: { ...s.digest, daily: v } }))
                    }
                    label="Digest daily org"
                  />
                </Row>
                <Row
                  title={isEn ? 'Weekly digest (admins)' : 'Récap hebdomadaire (admins)'}
                  hint={isEn ? 'Monday morning' : 'Le lundi matin'}
                >
                  <Toggle
                    checked={orgSettings.digest.weekly}
                    onChange={(v) =>
                      setOrgSettings((s) => ({ ...s, digest: { ...s.digest, weekly: v } }))
                    }
                    label="Digest weekly org"
                  />
                </Row>
                <Row
                  title={isEn ? 'Automatic consultant reminders' : 'Relances automatiques aux consultants'}
                  hint={
                    isEn
                      ? 'OFF: no outbound email/SMS to consultants — internal alerts and portal bell stay active. Turn on to send profile/timesheet reminders.'
                      : 'Désactivé : aucun email/SMS sortant vers les consultants — alertes internes et cloche portail restent actives. Active pour envoyer les relances profil/CRA.'
                  }
                >
                  <Toggle
                    checked={orgSettings.consultant_outreach_auto}
                    onChange={(v) =>
                      setOrgSettings((s) => ({ ...s, consultant_outreach_auto: v }))
                    }
                    label="Consultant outreach"
                  />
                </Row>
                <Row
                  title={isEn ? 'Automatic client dunning' : 'Relance client automatique (impayés)'}
                  hint={
                    isEn
                      ? 'OFF: internal alert only — no email is ever sent to your clients without you.'
                      : 'Désactivé : alerte interne uniquement — aucun email n’est envoyé à tes clients sans toi.'
                  }
                >
                  <Toggle
                    checked={orgSettings.client_dunning_auto}
                    onChange={(v) => setOrgSettings((s) => ({ ...s, client_dunning_auto: v }))}
                    label="Client dunning"
                  />
                </Row>

                <div className="mt-5 flex justify-end">
                  <Button onClick={saveOrgSettings} disabled={savingOrg}>
                    {savingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                    {isEn ? 'Save organization rules' : 'Enregistrer les règles'}
                  </Button>
                </div>
              </AppCardBody>
            </AppCard>
          )}
        </div>
      )}

      {/* Note transparence canaux */}
      <p className="mt-6 flex items-start gap-2 text-[11px] text-muted-foreground max-w-2xl">
        <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        {isEn
          ? 'In-app alerts are always available in the Alert center. Emails are sent via Resend. SMS requires a provider (Twilio or Brevo) — without one, Centrium automatically falls back to email.'
          : 'Les alertes in-app restent toujours disponibles dans le Centre d’alertes. Les emails partent via Resend. Les SMS nécessitent un prestataire (Twilio ou Brevo) — sans prestataire, Centrium bascule automatiquement sur l’email.'}
      </p>
    </AppShell>
  );
}
