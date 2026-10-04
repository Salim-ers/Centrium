'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { TagInput } from '@/components/ui/tag-input';
import { REMOTE_POLICIES, REMOTE_POLICY_LABEL, clientRequestSchema } from '@/lib/validators/v2';

type Form = {
  title: string;
  description: string;
  skills: string[];
  seniority: string;
  location: string;
  remote_policy: string;
  start_date: string;
  duration_months: string;
  daily_rate_eur: string;
};

const EMPTY: Form = { title: '', description: '', skills: [], seniority: '', location: '', remote_policy: '', start_date: '', duration_months: '', daily_rate_eur: '' };

/** Expression d'un besoin par le client ; validation zod ici puis côté serveur. */
export function ClientRequestForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: f.title,
      description: f.description || null,
      skills: f.skills,
      seniority: f.seniority || null,
      location: f.location || null,
      remote_policy: f.remote_policy || null,
      start_date: f.start_date || null,
      duration_months: f.duration_months ? Number(f.duration_months) : null,
      daily_rate_eur: f.daily_rate_eur ? Number(f.daily_rate_eur) : null,
    };
    const parsed = clientRequestSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Demande incomplète');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/client/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? 'Envoi impossible. Réessayez.');
      return;
    }
    toast.success('Demande envoyée : votre interlocuteur revient vers vous.');
    setF(EMPTY);
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Intitulé du besoin" htmlFor="rq-title" required>
        <Input id="rq-title" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={200} placeholder="ex. Développeur Java senior pour notre équipe paiement" />
      </Field>
      <Field label="Contexte et attentes" htmlFor="rq-desc">
        <Textarea id="rq-desc" rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={8000} showCounter={false} />
      </Field>
      <Field label="Compétences recherchées" htmlFor="rq-skills" hint="Entrée pour valider chaque compétence.">
        <TagInput id="rq-skills" value={f.skills} onChange={(v) => set('skills', v)} max={40} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Séniorité" htmlFor="rq-seniority">
          <Select id="rq-seniority" value={f.seniority} onChange={(e) => set('seniority', e.target.value)}>
            <option value="">Indifférent</option>
            <option value="junior">Junior</option>
            <option value="confirmed">Confirmé</option>
            <option value="senior">Senior</option>
            <option value="expert">Expert</option>
          </Select>
        </Field>
        <Field label="Télétravail" htmlFor="rq-remote">
          <Select id="rq-remote" value={f.remote_policy} onChange={(e) => set('remote_policy', e.target.value)}>
            <option value="">Non précisé</option>
            {REMOTE_POLICIES.map((p) => (
              <option key={p} value={p}>
                {REMOTE_POLICY_LABEL[p].fr}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lieu" htmlFor="rq-location">
          <Input id="rq-location" value={f.location} onChange={(e) => set('location', e.target.value)} maxLength={200} />
        </Field>
        <Field label="Démarrage souhaité" htmlFor="rq-start">
          <Input id="rq-start" type="date" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </Field>
        <Field label="Durée (mois)" htmlFor="rq-duration">
          <Input id="rq-duration" type="number" min={1} max={120} inputMode="numeric" value={f.duration_months} onChange={(e) => set('duration_months', e.target.value)} />
        </Field>
        <Field label="Budget journalier HT (facultatif)" htmlFor="rq-rate">
          <Input id="rq-rate" type="number" min={0} inputMode="decimal" value={f.daily_rate_eur} onChange={(e) => set('daily_rate_eur', e.target.value)} />
        </Field>
      </div>
      <Button type="submit" className="w-full sm:w-auto" loading={busy}>
        Envoyer la demande
      </Button>
    </form>
  );
}
