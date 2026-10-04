'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, KeyRound, Plug, RefreshCw, Send, ShieldCheck, Unplug, Webhook } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/label';
import { StatusPill } from '@/components/ui/status-pill';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { formatDate } from '@/lib/format';
import type { Integration, IntegrationProvider } from '@/types';

const CONNECTORS: Array<{ provider: Exclude<IntegrationProvider, 'webhook'>; name: string; fr: string; en: string }> = [
  { provider: 'pennylane', name: 'Pennylane', fr: 'Comptabilité et facturation', en: 'Accounting and invoicing' },
  { provider: 'sage', name: 'Sage', fr: 'Comptabilité', en: 'Accounting' },
  { provider: 'sellsy', name: 'Sellsy', fr: 'CRM et facturation', en: 'CRM and invoicing' },
  { provider: 'approved_platform', name: 'Plateforme agréée', fr: 'Facturation électronique réglementaire (PA)', en: 'Regulated e-invoicing platform' },
];

const EVENTS: Array<{ id: string; fr: string; en: string }> = [
  { id: 'prefacture.validated', fr: 'Préfacture validée', en: 'Pre-invoice approved' },
  { id: 'prefactures.exported', fr: 'Préfactures exportées', en: 'Pre-invoices exported' },
  { id: 'timesheet.validated', fr: 'CRA validé', en: 'Timesheet approved' },
  { id: 'client_request.created', fr: 'Demande client reçue', en: 'Client request received' },
];

const STATUS = {
  not_connected: { fr: 'Non connecté', en: 'Not connected', tone: 'neutral' as const },
  requested: { fr: 'Intérêt enregistré', en: 'Interest recorded', tone: 'info' as const },
  configured: { fr: 'Actif', en: 'Active', tone: 'success' as const },
  error: { fr: 'Erreur', en: 'Error', tone: 'danger' as const },
};

async function post(body: unknown) {
  const res = await fetch('/api/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export function IntegrationsPanel({ lang, canManage }: { lang: 'fr' | 'en'; canManage: boolean }) {
  const fr = lang === 'fr';
  const { activeOrgId } = useOrganization();
  const { data, setData, reload } = useCachedQuery<Integration[]>(
    `integrations:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await fetch('/api/integrations', { credentials: 'include' });
      if (!res.ok) return [];
      return ((await res.json()).data ?? []) as Integration[];
    },
    { enabled: !!activeOrgId },
  );
  const byProvider = new Map((data ?? []).map((i) => [i.provider, i]));
  const webhook = byProvider.get('webhook');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingHook, setEditingHook] = useState(false);

  function startEdit() {
    const cfg = (webhook?.config ?? {}) as { url?: string; events?: string[] };
    setUrl(cfg.url ?? '');
    setEvents(cfg.events ?? ['prefacture.validated', 'prefactures.exported']);
    setEditingHook(true);
  }

  async function run(key: string, body: unknown, success: string) {
    setBusy(key);
    const { ok, json } = await post(body);
    setBusy(null);
    if (!ok) {
      toast.error(json.message ?? json.error ?? (fr ? 'Action impossible' : 'Action failed'));
      return null;
    }
    if (success) toast.success(success);
    if (json.secret) setSecret(json.secret as string);
    void reload();
    return json;
  }

  async function testWebhook() {
    const json = await run('test', { action: 'test_webhook' }, '');
    const result = json?.data as { delivered?: boolean; status?: number; error?: string } | undefined;
    if (!result) return;
    if (result.delivered) toast.success(fr ? `Test reçu (HTTP ${result.status})` : `Test delivered (HTTP ${result.status})`);
    else toast.error(result.error ?? (fr ? 'Échec de l’envoi' : 'Delivery failed'));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-sand-surface/60 p-4 text-[13px] leading-relaxed text-foreground">
        <div className="mb-1 flex items-center gap-2 font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {fr ? 'Ce que fait Centrium, et ce qu’il ne fait pas' : 'What Centrium does, and does not do'}
        </div>
        {fr
          ? 'Centrium prépare les éléments facturables à partir des CRA validés, vous permet de les contrôler, puis de les exporter ou de les transmettre à votre outil comptable ou à votre plateforme agréée. Centrium n’est pas une plateforme agréée : il n’émet pas et ne transmet pas lui-même de facture électronique à l’administration ou à vos clients.'
          : 'Centrium prepares billable items from approved timesheets, lets you review them, then export or send them to your accounting tool or approved platform. Centrium is not an approved e-invoicing platform: it does not issue or transmit regulated e-invoices to the tax authority or your clients.'}
      </div>

      <section>
        <h2 className="mb-3 font-display text-[15px] font-semibold">{fr ? 'Connecteurs' : 'Connectors'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CONNECTORS.map((c) => {
            const row = byProvider.get(c.provider);
            const st = STATUS[row?.status ?? 'not_connected'];
            return (
              <Card key={c.provider} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{c.name}</CardTitle>
                    <StatusPill tone={st.tone}>{st[lang]}</StatusPill>
                  </div>
                  <CardDescription>{c[lang]}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {fr
                      ? 'Connecteur natif en préparation. En attendant : export CSV ou webhook.'
                      : 'Native connector in preparation. Meanwhile: CSV export or webhook.'}
                  </p>
                  {canManage && row?.status !== 'requested' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      loading={busy === c.provider}
                      onClick={() =>
                        void run(c.provider, { action: 'request', provider: c.provider }, fr ? 'Votre intérêt est enregistré' : 'Interest recorded')
                      }
                    >
                      <Plug />
                      {fr ? 'Être prévenu' : 'Notify me'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          {fr ? 'Webhook (API)' : 'Webhook (API)'}
        </h2>
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13.5px] font-medium">
                  {fr ? 'Envoi d’événements signés vers votre système' : 'Signed events sent to your system'}
                  <StatusPill tone={STATUS[webhook?.status ?? 'not_connected'].tone}>{STATUS[webhook?.status ?? 'not_connected'][lang]}</StatusPill>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fr
                    ? 'Chaque requête porte l’en-tête Centrium-Signature (HMAC-SHA256 de « horodatage.corps »). HTTPS uniquement.'
                    : 'Each request carries a Centrium-Signature header (HMAC-SHA256 of “timestamp.body”). HTTPS only.'}
                </p>
                {webhook?.status && webhook.status !== 'not_connected' && (
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {(webhook.config as { url?: string })?.url}
                    {webhook.last_event_at && ` · ${fr ? 'dernier envoi' : 'last delivery'} ${formatDate(webhook.last_event_at, lang)}`}
                    {webhook.last_error && <span className="text-destructive"> · {webhook.last_error}</span>}
                  </p>
                )}
              </div>
              {canManage && !editingHook && (
                <div className="flex flex-wrap gap-2">
                  {webhook && webhook.status !== 'not_connected' && (
                    <>
                      <Button variant="secondary" size="sm" loading={busy === 'test'} onClick={() => void testWebhook()}>
                        <Send />
                        {fr ? 'Tester' : 'Test'}
                      </Button>
                      <Button variant="secondary" size="sm" loading={busy === 'rotate'} onClick={() => void run('rotate', { action: 'rotate_secret' }, fr ? 'Nouveau secret généré' : 'New secret generated')}>
                        <RefreshCw />
                        {fr ? 'Nouveau secret' : 'Rotate secret'}
                      </Button>
                      <Button variant="ghost" size="sm" loading={busy === 'disconnect'} onClick={() => void run('disconnect', { action: 'disconnect', provider: 'webhook' }, fr ? 'Webhook désactivé' : 'Webhook disabled').then(() => setData((list) => (list ?? []).filter((i) => i.provider !== 'webhook')))}>
                        <Unplug />
                        {fr ? 'Désactiver' : 'Disable'}
                      </Button>
                    </>
                  )}
                  <Button size="sm" onClick={startEdit}>
                    <Webhook />
                    {webhook && webhook.status !== 'not_connected' ? (fr ? 'Modifier' : 'Edit') : fr ? 'Configurer' : 'Set up'}
                  </Button>
                </div>
              )}
            </div>

            {editingHook && (
              <form
                className="space-y-4 border-t border-border pt-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await run('save', { action: 'configure_webhook', url, events }, fr ? 'Webhook enregistré' : 'Webhook saved');
                  if (res) setEditingHook(false);
                }}
              >
                <Field label={fr ? 'URL de réception (HTTPS)' : 'Endpoint URL (HTTPS)'} htmlFor="hook-url" required>
                  <Input id="hook-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
                </Field>
                <fieldset>
                  <legend className="mb-2 text-[13px] font-medium">{fr ? 'Événements' : 'Events'}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {EVENTS.map((ev) => (
                      <label key={ev.id} className="flex items-center gap-2 text-[13px]">
                        <Checkbox
                          checked={events.includes(ev.id)}
                          onCheckedChange={(v) => setEvents((list) => (v ? [...list, ev.id] : list.filter((x) => x !== ev.id)))}
                        />
                        {ev[lang]} <code className="text-[11px] text-muted-foreground">{ev.id}</code>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditingHook(false)}>
                    {fr ? 'Annuler' : 'Cancel'}
                  </Button>
                  <Button type="submit" loading={busy === 'save'} disabled={!url || events.length === 0}>
                    {fr ? 'Enregistrer' : 'Save'}
                  </Button>
                </div>
              </form>
            )}

            {secret && (
              <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
                <div className="mb-1 flex items-center gap-2 text-[13px] font-medium text-warning">
                  <KeyRound className="h-4 w-4" />
                  {fr ? 'Secret de signature — copiez-le maintenant, il ne sera plus affiché' : 'Signing secret — copy it now, it will not be shown again'}
                </div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded bg-card px-2 py-1 text-xs">{secret}</code>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(secret);
                      toast.success(fr ? 'Copié' : 'Copied');
                    }}
                    aria-label={fr ? 'Copier le secret' : 'Copy secret'}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
