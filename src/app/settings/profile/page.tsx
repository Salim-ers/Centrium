'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User,
  Briefcase,
  Phone,
  MapPin,
  Calendar,
  Linkedin,
  ShieldAlert,
  Languages,
  Loader2,
  Lock,
  Save,
  Check,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { notifyError } from '@/lib/notify';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  PageHeader,
  AppCard,
  AppCardBody,
  SectionHeader,
} from '@/components/app';

/**
 * Page "Mon profil" — édite mes infos personnelles, visibles uniquement
 * par moi (table user_profile_personal, RLS strict user_id=auth.uid()).
 *
 * On garde l'identité de base (first_name, last_name) sur la table
 * `profiles` historique. Les infos plus personnelles ou pro internes
 * (poste, bio, téléphone perso, adresse, contact d'urgence…) vivent
 * dans `user_profile_personal` pour ne pas leaker à toute l'org via
 * profiles_select_same_org.
 */

type IdentityRow = {
  first_name: string | null;
  last_name: string | null;
};

type PersonalRow = {
  job_title: string | null;
  bio: string | null;
  hire_date: string | null;
  mobile_phone: string | null;
  linkedin_url: string | null;
  birth_date: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  languages: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_rel: string | null;
};

const EMPTY_PERSONAL: PersonalRow = {
  job_title: '',
  bio: '',
  hire_date: '',
  mobile_phone: '',
  linkedin_url: '',
  birth_date: '',
  nationality: '',
  address: '',
  city: '',
  postal_code: '',
  country: 'France',
  languages: [],
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_rel: '',
};

export default function MyProfilePage() {
  const { user, reload } = useOrganization();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Affiche un badge "Enregistré ✓" inline 2 s à côté du bouton Enregistrer
  // (remplace l'ancien toast notifyUpdated, jugé bruyant).
  const [justSaved, setJustSaved] = useState(false);
  const [identity, setIdentity] = useState<IdentityRow>({ first_name: '', last_name: '' });
  const [personal, setPersonal] = useState<PersonalRow>(EMPTY_PERSONAL);
  // Saisie séparée pour le champ "langues" (CSV → tableau).
  const [languagesInput, setLanguagesInput] = useState('');

  useEffect(() => {
    if (!justSaved) return;
    const id = window.setTimeout(() => setJustSaved(false), 2000);
    return () => window.clearTimeout(id);
  }, [justSaved]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [profRes, persRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('user_profile_personal')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (profRes.data) {
        setIdentity({
          first_name: profRes.data.first_name ?? '',
          last_name: profRes.data.last_name ?? '',
        });
      }
      if (persRes.data) {
        const p = persRes.data as PersonalRow;
        // Normalise les null → '' pour les inputs contrôlés.
        const normalized: PersonalRow = {
          job_title: p.job_title ?? '',
          bio: p.bio ?? '',
          hire_date: p.hire_date ?? '',
          mobile_phone: p.mobile_phone ?? '',
          linkedin_url: p.linkedin_url ?? '',
          birth_date: p.birth_date ?? '',
          nationality: p.nationality ?? '',
          address: p.address ?? '',
          city: p.city ?? '',
          postal_code: p.postal_code ?? '',
          country: p.country ?? 'France',
          languages: p.languages ?? [],
          emergency_contact_name: p.emergency_contact_name ?? '',
          emergency_contact_phone: p.emergency_contact_phone ?? '',
          emergency_contact_rel: p.emergency_contact_rel ?? '',
        };
        setPersonal(normalized);
        setLanguagesInput((normalized.languages ?? []).join(', '));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function setField<K extends keyof PersonalRow>(key: K, value: PersonalRow[K]) {
    setPersonal((p) => ({ ...p, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const supabase = createClient();

      // 1) Met à jour first_name / last_name sur profiles (visible org)
      const trimmedFirst = (identity.first_name ?? '').trim();
      const trimmedLast = (identity.last_name ?? '').trim();
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          first_name: trimmedFirst || null,
          last_name: trimmedLast || null,
        })
        .eq('id', user.id);
      if (profErr) {
        notifyError('Identité : ' + profErr.message);
        return;
      }

      // 2) Upsert sur user_profile_personal (visible moi uniquement)
      // Normalise les chaînes vides en null pour rester propre côté DB.
      const blank = (v: string | null) => (v && v.trim() ? v.trim() : null);
      const langs = languagesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        user_id: user.id,
        job_title: blank(personal.job_title),
        bio: blank(personal.bio),
        hire_date: blank(personal.hire_date),
        mobile_phone: blank(personal.mobile_phone),
        linkedin_url: blank(personal.linkedin_url),
        birth_date: blank(personal.birth_date),
        nationality: blank(personal.nationality),
        address: blank(personal.address),
        city: blank(personal.city),
        postal_code: blank(personal.postal_code),
        country: blank(personal.country),
        languages: langs.length > 0 ? langs : null,
        emergency_contact_name: blank(personal.emergency_contact_name),
        emergency_contact_phone: blank(personal.emergency_contact_phone),
        emergency_contact_rel: blank(personal.emergency_contact_rel),
      };
      const { error: persErr } = await supabase
        .from('user_profile_personal')
        .upsert(payload, { onConflict: 'user_id' });
      if (persErr) {
        notifyError('Infos perso : ' + persErr.message);
        return;
      }

      // Plus de toast : on déclenche le badge inline "Enregistré ✓".
      setJustSaved(true);
      // reload() rafraîchit le contexte d'auth pour propager le first_name
      // dans le header / présence.
      void reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Organisation"
        title={
          <>
            Mon{' '}
            <span className="qc-italic-accent font-editorial italic">profil.</span>
          </>
        }
        description={
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-magenta" />
            Sauf <strong className="text-foreground/80 mx-1">prénom / nom</strong>,
            ces infos sont strictement privées — invisible des autres membres, même
            des admins.
          </span>
        }
      />

      {loading ? (
        <AppCard variant="default">
          <AppCardBody size="md">
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          </AppCardBody>
        </AppCard>
      ) : (
        <form onSubmit={onSubmit} className="space-y-8">
          {/* Identité publique */}
          <section>
            <SectionHeader
              eyebrow="Identité"
              title={
                <>
                  Visible{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    de l&apos;équipe.
                  </span>
                </>
              }
              description="Présence, partages d'activité, todos partagées."
            />
            <AppCard variant="default" tone="magenta">
              <AppCardBody size="md" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={identity.first_name ?? ''}
                    onChange={(e) =>
                      setIdentity((s) => ({ ...s, first_name: e.target.value }))
                    }
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={identity.last_name ?? ''}
                    onChange={(e) =>
                      setIdentity((s) => ({ ...s, last_name: e.target.value }))
                    }
                    placeholder="Dupont"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ''} disabled className="opacity-60" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    L&apos;email se modifie côté Supabase Auth (contactez un admin).
                  </p>
                </div>
              </AppCardBody>
            </AppCard>
          </section>

          {/* Rôle dans l'entreprise */}
          <section>
            <SectionHeader
              eyebrow="Rôle"
              title={
                <>
                  Dans{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    l&apos;entreprise.
                  </span>
                </>
              }
              description="Privé — utile pour votre CV interne, signature email, onboarding RH."
              actions={<Briefcase className="h-4 w-4 text-magenta" />}
            />
            <AppCard variant="default" tone="violet">
              <AppCardBody size="md" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Poste</Label>
                  <Input
                    value={personal.job_title ?? ''}
                    onChange={(e) => setField('job_title', e.target.value)}
                    placeholder="Co-fondateur, Business Manager, Recruteur…"
                  />
                </div>
                <div>
                  <Label>Date d&apos;entrée dans l&apos;entreprise</Label>
                  <Input
                    type="date"
                    value={personal.hire_date ?? ''}
                    onChange={(e) => setField('hire_date', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Bio courte</Label>
                  <Textarea
                    rows={3}
                    value={personal.bio ?? ''}
                    onChange={(e) => setField('bio', e.target.value)}
                    placeholder="Quelques mots sur votre parcours, vos spécialités…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="inline-flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5" />
                    Langues (séparées par des virgules)
                  </Label>
                  <Input
                    value={languagesInput}
                    onChange={(e) => setLanguagesInput(e.target.value)}
                    placeholder="Français, Anglais, Espagnol"
                  />
                </div>
              </AppCardBody>
            </AppCard>
          </section>

          {/* Contact perso */}
          <section>
            <SectionHeader
              eyebrow="Contact"
              title={
                <>
                  Coordonnées{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    personnelles.
                  </span>
                </>
              }
              description="Privé — pour vous uniquement."
              actions={<Phone className="h-4 w-4 text-magenta" />}
            />
            <AppCard variant="default" tone="cyan">
              <AppCardBody size="md" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Mobile</Label>
                  <Input
                    type="tel"
                    value={personal.mobile_phone ?? ''}
                    onChange={(e) => setField('mobile_phone', e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <Label className="inline-flex items-center gap-1.5">
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </Label>
                  <Input
                    type="url"
                    value={personal.linkedin_url ?? ''}
                    onChange={(e) => setField('linkedin_url', e.target.value)}
                    placeholder="https://www.linkedin.com/in/…"
                  />
                </div>
                <div>
                  <Label className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Date de naissance
                  </Label>
                  <Input
                    type="date"
                    value={personal.birth_date ?? ''}
                    onChange={(e) => setField('birth_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nationalité</Label>
                  <Input
                    value={personal.nationality ?? ''}
                    onChange={(e) => setField('nationality', e.target.value)}
                    placeholder="Française"
                  />
                </div>
              </AppCardBody>
            </AppCard>
          </section>

          {/* Adresse */}
          <section>
            <SectionHeader
              eyebrow="Adresse"
              title={
                <>
                  Domicile{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    personnel.
                  </span>
                </>
              }
              description="Privé — utile si l'entreprise vous envoie un document, du matériel, etc."
              actions={<MapPin className="h-4 w-4 text-magenta" />}
            />
            <AppCard variant="default" tone="emerald">
              <AppCardBody size="md" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Rue</Label>
                  <Input
                    value={personal.address ?? ''}
                    onChange={(e) => setField('address', e.target.value)}
                    placeholder="12 rue de la République"
                  />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input
                    value={personal.postal_code ?? ''}
                    onChange={(e) => setField('postal_code', e.target.value)}
                    placeholder="75011"
                  />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input
                    value={personal.city ?? ''}
                    onChange={(e) => setField('city', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Pays</Label>
                  <Input
                    value={personal.country ?? ''}
                    onChange={(e) => setField('country', e.target.value)}
                  />
                </div>
              </AppCardBody>
            </AppCard>
          </section>

          {/* Contact d'urgence */}
          <section>
            <SectionHeader
              eyebrow="Sécurité"
              title={
                <>
                  Contact{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    d&apos;urgence.
                  </span>
                </>
              }
              description="Privé — utile pour les RH en cas de pépin."
              actions={<ShieldAlert className="h-4 w-4 text-amber-300" />}
            />
            <AppCard variant="default" tone="amber">
              <AppCardBody size="md" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={personal.emergency_contact_name ?? ''}
                    onChange={(e) => setField('emergency_contact_name', e.target.value)}
                    placeholder="Marie Dupont"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    value={personal.emergency_contact_phone ?? ''}
                    onChange={(e) => setField('emergency_contact_phone', e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <Label>Lien</Label>
                  <Input
                    value={personal.emergency_contact_rel ?? ''}
                    onChange={(e) => setField('emergency_contact_rel', e.target.value)}
                    placeholder="Conjoint, parent…"
                  />
                </div>
              </AppCardBody>
            </AppCard>
          </section>

          <div className="sticky bottom-0 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/80 backdrop-blur-xl border-t border-hairline flex items-center justify-end gap-3">
            {justSaved && (
              <span
                className="inline-flex items-center gap-1 text-xs text-emerald-400 transition-opacity duration-300"
                role="status"
                aria-live="polite"
              >
                <Check className="h-3.5 w-3.5" />
                {locale === 'en' ? 'Saved' : 'Enregistré'}
              </span>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href="/settings">Annuler</Link>
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
