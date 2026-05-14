'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Send,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  Phone,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';

/**
 * Page publique "Demande de devis" — remplace l'ancien signup self-service.
 *
 * Un prospect (ESN) remplit ses infos, on les insère dans quote_requests
 * via POST /api/quote-requests. Pas de création de compte ici : c'est
 * Salim (super_admin) qui crée ensuite l'organisation client avec son
 * branding via /admin/clients.
 */
type FormState = {
  company_name: string;
  industry: string;
  team_size: string;
  consultants_count: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_role: string;
  message: string;
};

const INITIAL_FORM: FormState = {
  company_name: '',
  industry: '',
  team_size: '',
  consultants_count: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_role: '',
  message: '',
};

export default function DevisPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      setError('Le nom de la société, ton nom et ton email sont requis.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'landing' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message ?? "Envoi impossible — réessaie dans un instant.");
        return;
      }
      setDone(true);
    } catch (e) {
      setError('Erreur réseau : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center px-6 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(236,72,153,0.14), transparent 70%)',
          }}
        />
        <div className="relative max-w-lg w-full text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Demande envoyée ✓
            </h1>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              On a bien reçu ta demande pour <strong>{form.company_name}</strong>.
              Tu vas recevoir une réponse de notre équipe à
              <strong className="text-violet-200"> {form.contact_email}</strong> sous
              24 à 48h ouvrées avec un devis personnalisé et la prochaine étape pour
              activer ton espace.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Retour à l&apos;accueil
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(236,72,153,0.12), transparent 70%)',
        }}
      />

      <header className="relative border-b border-hairline">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <CentriumWordmark size="md" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Déjà client ? Se connecter</Link>
          </Button>
        </div>
      </header>

      <main className="relative max-w-3xl mx-auto px-6 py-10 md:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-glow/40 bg-violet-glow/10 px-3 py-1 text-xs text-violet-200 mb-4">
            <Sparkles className="h-3 w-3" />
            Onboarding accompagné — pas de self-service
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Demande de <span className="qc-gradient-text">devis</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
            Décris-nous ton ESN en quelques minutes. On revient vers toi sous 24-48h
            avec un devis personnalisé et on configure ensemble ton espace à ton image
            (logo, couleurs, mentions légales, signature) avant l&apos;activation.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-hairline bg-card/50 backdrop-blur-xl p-6 md:p-8 space-y-6"
        >
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Bloc société */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-300">
              <Building2 className="h-3.5 w-3.5" />
              Ton entreprise
            </div>

            <div>
              <Label>Nom de la société *</Label>
              <Input
                value={form.company_name}
                onChange={(e) => update('company_name', e.target.value)}
                placeholder="Futurmaster, Hays France, …"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Secteur</Label>
                <Input
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  placeholder="ESN, conseil IT, recrutement…"
                />
              </div>
              <div>
                <Label>Taille équipe</Label>
                <Select
                  value={form.team_size}
                  onChange={(e) => update('team_size', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="1-5">1 à 5 personnes</option>
                  <option value="6-15">6 à 15</option>
                  <option value="16-50">16 à 50</option>
                  <option value="51-200">51 à 200</option>
                  <option value="200+">200+</option>
                </Select>
              </div>
              <div>
                <Label>Nb consultants gérés</Label>
                <Select
                  value={form.consultants_count}
                  onChange={(e) => update('consultants_count', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="0-10">Moins de 10</option>
                  <option value="10-30">10 à 30</option>
                  <option value="30-100">30 à 100</option>
                  <option value="100-500">100 à 500</option>
                  <option value="500+">500+</option>
                </Select>
              </div>
            </div>
          </section>

          {/* Bloc contact */}
          <section className="space-y-4 pt-2 border-t border-hairline">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-300 pt-4">
              <UserIcon className="h-3.5 w-3.5" />
              Ton contact
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => update('contact_name', e.target.value)}
                  placeholder="Salim El Réssalitate"
                  required
                />
              </div>
              <div>
                <Label>Fonction</Label>
                <Input
                  value={form.contact_role}
                  onChange={(e) => update('contact_role', e.target.value)}
                  placeholder="Dirigeant, BM, RH…"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>
                  <Mail className="h-3 w-3 inline mr-1" />
                  Email pro *
                </Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => update('contact_email', e.target.value)}
                  placeholder="salim@futurmaster.com"
                  required
                />
              </div>
              <div>
                <Label>
                  <Phone className="h-3 w-3 inline mr-1" />
                  Téléphone
                </Label>
                <Input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => update('contact_phone', e.target.value)}
                  placeholder="+33 …"
                />
              </div>
            </div>
          </section>

          {/* Message libre */}
          <section className="pt-2 border-t border-hairline">
            <div className="pt-4 space-y-2">
              <Label>Quel est ton besoin ?</Label>
              <Textarea
                rows={5}
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder={
                  'Ex: On gère 25 consultants en freelance + portage, on cherche une solution pour le matching, la facturation et la génération de CV personnalisés à notre charte.'
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Plus tu donnes de contexte, plus on peut ajuster le devis et la
                configuration de ton espace à ton image.
              </p>
            </div>
          </section>

          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-muted-foreground max-w-md">
              En soumettant ce formulaire, tu acceptes qu&apos;on te recontacte par
              email à l&apos;adresse fournie. Aucune création de compte ni
              prélèvement à ce stade.
            </p>
            <Button
              type="submit"
              disabled={busy}
              className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95 shadow-[0_0_30px_-8px_rgba(236,72,153,0.5)]"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer la demande
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
