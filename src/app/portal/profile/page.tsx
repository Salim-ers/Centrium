'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, ChevronRight, FileText, Languages, Linkedin, Loader2, Mail, MapPin, Pencil, Phone, Plus, Save, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { showBrandToast } from '@/components/ui/BrandToast';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { ConsultantCompleteness } from '@/components/consultants/ConsultantCompleteness';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useSeniorityLabels } from '@/lib/i18n/useBadges';
import { fetchMyMissions, fetchMyProfile, isIndependent, type PortalProfile } from '@/lib/portal/consultant-data';
import { availabilityOf } from '@/lib/portal/consultant-home';
import { availabilityDisplay } from '@/lib/portal/mission-phase-label';
import { CONTRACT_TYPE_LABEL } from '@/lib/status';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PortalMission } from '@/types';
import { usePortalConsultant } from '../portal-context';

type LangRow = { code: string; level: string };

const LANG_LEVELS = ['Natif', 'Bilingue', 'Courant', 'Professionnel', 'Intermédiaire', 'Notions'];
const LEVEL_EN: Record<string, string> = {
  Natif: 'Native',
  Bilingue: 'Bilingual',
  Courant: 'Fluent',
  Professionnel: 'Professional',
  Intermédiaire: 'Intermediate',
  Notions: 'Basics',
};

type EditableForm = {
  email: string;
  phone: string;
  linkedin_url: string;
  city: string;
  country: string;
  mobility: string;
  summary: string;
  // Société & facturation (migration 072)
  legal_status: string;
  company_name: string;
  siret: string;
  vat_number: string;
  address: string;
  postal_code: string;
  iban: string;
  bic: string;
  languages: LangRow[];
};

function emptyForm(): EditableForm {
  return {
    email: '', phone: '', linkedin_url: '', city: '', country: 'FR', mobility: '', summary: '',
    legal_status: '', company_name: '', siret: '', vat_number: '', address: '', postal_code: '', iban: '', bic: '',
    languages: [],
  };
}

/** Formulaire pré-rempli depuis la fiche (partagé chargement / annulation). */
function formFromConsultant(c: PortalProfile): EditableForm {
  return {
    email: c.email ?? '',
    phone: c.phone ?? '',
    linkedin_url: c.linkedin_url ?? '',
    city: c.city ?? '',
    country: c.country ?? 'FR',
    mobility: c.mobility ?? '',
    summary: c.summary ?? '',
    legal_status: c.legal_status ?? '',
    company_name: c.company_name ?? '',
    siret: c.siret ?? '',
    vat_number: c.vat_number ?? '',
    address: c.address ?? '',
    postal_code: c.postal_code ?? '',
    iban: c.iban ?? '',
    bic: c.bic ?? '',
    languages: (c.languages ?? []).map((l) => ({ code: l.code, level: l.level })),
  };
}

/**
 * Mon profil : identité et disponibilité (tenues par l'ESN), puis ce que le
 * consultant met à jour lui-même : coordonnées, société et facturation
 * (indépendants), langues. Les documents vivent dans « Mes documents ».
 */
export default function PortalProfilePage() {
  const { consultantId } = usePortalConsultant();
  const { activeOrgId } = useOrganization();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const seniorityLabels = useSeniorityLabels();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditableForm>(emptyForm());

  const { data: consultant, loading, setData: setConsultant } = useCachedQuery<PortalProfile | null>(`portal-profile:${consultantId}`, () => fetchMyProfile(createClient()));
  const { data: missions } = useCachedQuery<PortalMission[]>(`portal-missions:${consultantId}`, () => fetchMyMissions(createClient()));

  useEffect(() => {
    if (consultant && !editing) setForm(formFromConsultant(consultant));
  }, [consultant, editing]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Les lignes de langue incomplètes (code de moins de 2 caractères) sont ignorées.
        body: JSON.stringify({ ...form, languages: form.languages.filter((l) => l.code.trim().length >= 2) }),
      });
      const body = (await res.json().catch(() => ({}))) as { data?: PortalProfile; message?: string; details?: { fieldErrors?: Record<string, string[]> } };
      if (!res.ok) {
        const firstField = body.details?.fieldErrors ? Object.values(body.details.fieldErrors).flat()[0] : null;
        toast.error(firstField ?? body.message ?? (fr ? 'Mise à jour impossible' : 'Unable to update'));
        return;
      }
      setConsultant(body.data as PortalProfile);
      setEditing(false);
      showBrandToast('success', fr ? 'Profil enregistré' : 'Profile saved');
    } catch {
      toast.error(fr ? 'Erreur réseau. Réessayez.' : 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /** Ouvre l'édition et amène les champs à l'écran (sur mobile, ils sont sous l'identité). */
  function startEditing() {
    setEditing(true);
    requestAnimationFrame(() => document.getElementById('profile-contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function cancel() {
    if (consultant) setForm(formFromConsultant(consultant));
    setEditing(false);
  }

  if (loading && !consultant) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (!consultant) return <p className="text-muted-foreground">{fr ? 'Profil introuvable.' : 'Profile not found.'}</p>;

  const c = consultant;
  const independent = isIndependent(c.contract_type);
  const hasBilling = !!(c.legal_status || c.company_name || c.siret || c.vat_number || c.iban || c.bic);
  // Salarié : pas de société ni de RIB professionnel à déclarer ici.
  const showBilling = !c.contract_type || independent || hasBilling;
  const billingMissing = independent && !c.legal_status && !c.siret && !c.iban;
  const { availability, next } = availabilityOf(c, missions ?? [], new Date());
  const av = availabilityDisplay(availability, lang);
  const levelLabel = (lvl: string) => (fr ? lvl : (LEVEL_EN[lvl] ?? lvl));
  const set = <K extends keyof EditableForm>(key: K, value: EditableForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const editActions = (
    <>
      <Button variant="outline" onClick={cancel} disabled={saving}>
        <X className="h-4 w-4" />
        {fr ? 'Annuler' : 'Cancel'}
      </Button>
      <Button onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {fr ? 'Enregistrer' : 'Save'}
      </Button>
    </>
  );

  return (
    <div className={cn('mx-auto max-w-3xl space-y-5', editing && 'pb-20 md:pb-0')}>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Mon profil' : 'My profile'}</h1>
          <p className="text-[13.5px] text-muted-foreground">
            {fr ? `Vos coordonnées et votre disponibilité. TJM, séniorité et statut sont gérés par ${brandName}.` : `Your details and availability. Day rate, seniority and status are managed by ${brandName}.`}
          </p>
        </div>
        {editing ? (
          <div className="hidden shrink-0 gap-2 md:flex">{editActions}</div>
        ) : (
          <Button variant="outline" onClick={startEditing} className="shrink-0">
            <Pencil className="h-4 w-4" />
            {fr ? 'Modifier' : 'Edit'}
          </Button>
        )}
      </header>

      {/* Identité : tenue par l'ESN, en lecture seule. */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {(c.first_name?.[0] ?? '') + (c.last_name?.[0] ?? '')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold">
              {c.first_name} {c.last_name}
            </div>
            <div className="truncate text-[13.5px] text-muted-foreground">{[c.job_title, c.sub_title].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Fact label={fr ? 'Séniorité' : 'Seniority'} value={seniorityLabels[c.seniority] ?? '—'} />
          <Fact label={fr ? 'Expérience' : 'Experience'} value={c.years_experience != null ? (fr ? `${c.years_experience} ans` : `${c.years_experience} yrs`) : '—'} />
          <Fact label={fr ? 'Contrat' : 'Contract'} value={c.contract_type ? (CONTRACT_TYPE_LABEL[c.contract_type]?.[lang] ?? c.contract_type) : '—'} />
        </dl>
      </section>

      {/* Disponibilité : déduite des missions, sinon de la fiche. */}
      <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="profile-availability">
        <h2 id="profile-availability" className="flex items-center gap-2 text-[14px] font-semibold">
          <CalendarClock className="h-4 w-4 text-primary" />
          {fr ? 'Disponibilité' : 'Availability'}
        </h2>
        <div className="mt-2 text-[15px] font-semibold">{av.title}</div>
        {av.detail && <div className="text-[13px] text-muted-foreground">{av.detail}</div>}
        {next && availability.kind === 'on_mission' && (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {fr ? `Mission suivante : ${next.title}, à partir du ${formatDate(next.start_date, lang)}.` : `Next mission: ${next.title}, from ${formatDate(next.start_date, lang)}.`}
          </p>
        )}
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          {fr
            ? `Un changement (congés, fin de mission anticipée) ? Prévenez votre contact ${brandName} : votre disponibilité sert à vous proposer les bonnes missions.`
            : `Any change (leave, early end of mission)? Let your ${brandName} contact know: your availability is used to offer you the right missions.`}
        </p>
      </section>

      {activeOrgId && (
        <ConsultantCompleteness
          consultantId={consultantId}
          organizationId={activeOrgId}
          asConsultant
          profile={{
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone: c.phone,
            job_title: c.job_title,
            contract_type: c.contract_type,
            status: c.status,
            city: c.city,
            address: c.address,
            legal_status: c.legal_status,
            company_name: c.company_name,
            siret: c.siret,
            iban: c.iban,
            bic: c.bic,
          }}
        />
      )}

      {/* Coordonnées */}
      <Section id="profile-contact" title={fr ? 'Coordonnées' : 'Contact details'}>
        {editing ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="E-mail" icon={<Mail className="h-3.5 w-3.5" />}>
              <Input type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="prenom.nom@email.fr" />
            </FormField>
            <FormField label={fr ? 'Téléphone' : 'Phone'} icon={<Phone className="h-3.5 w-3.5" />}>
              <Input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+33 6 12 34 56 78" />
            </FormField>
            <FormField label="LinkedIn" icon={<Linkedin className="h-3.5 w-3.5" />}>
              <Input type="url" value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/…" />
            </FormField>
            <FormField label={fr ? 'Ville' : 'City'} icon={<MapPin className="h-3.5 w-3.5" />}>
              <Input autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Paris" />
            </FormField>
            <FormField label={fr ? 'Adresse' : 'Address'}>
              <Input autoComplete="street-address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder={fr ? '12 rue Exemple' : '12 Example Street'} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={fr ? 'Code postal' : 'Postal code'}>
                <Input autoComplete="postal-code" inputMode="numeric" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} placeholder="75011" />
              </FormField>
              <FormField label={fr ? 'Pays' : 'Country'}>
                <Input value={form.country} onChange={(e) => set('country', e.target.value.toUpperCase().slice(0, 3))} placeholder="FR" />
              </FormField>
            </div>
            <FormField label={fr ? 'Mobilité' : 'Mobility'} className="md:col-span-2">
              <Input value={form.mobility} onChange={(e) => set('mobility', e.target.value)} placeholder={fr ? 'Île-de-France, Lyon, télétravail complet…' : 'Paris area, Lyon, full remote…'} />
            </FormField>
            <FormField label={fr ? 'Présentation' : 'Summary'} className="md:col-span-2">
              <Textarea rows={4} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder={fr ? 'Quelques lignes pour vous présenter…' : 'A few lines to introduce yourself…'} />
            </FormField>
          </div>
        ) : (
          <div className="space-y-2.5">
            <ReadRow icon={Mail} label="E-mail" value={c.email} />
            <ReadRow icon={Phone} label={fr ? 'Téléphone' : 'Phone'} value={c.phone} />
            <ReadRow icon={Linkedin} label="LinkedIn" value={c.linkedin_url} href={c.linkedin_url ?? undefined} />
            <ReadRow
              icon={MapPin}
              label={fr ? 'Adresse' : 'Address'}
              value={[c.address, [c.postal_code, c.city].filter(Boolean).join(' '), c.country && c.country !== 'FR' ? c.country : null].filter(Boolean).join(', ') || null}
            />
            {c.mobility && <ReadRow icon={MapPin} label={fr ? 'Mobilité' : 'Mobility'} value={c.mobility} />}
            {c.summary && <p className="whitespace-pre-line border-t border-border pt-3 text-[13.5px] leading-relaxed text-foreground/85">{c.summary}</p>}
          </div>
        )}
      </Section>

      {/* Société & facturation : indépendants (et fiche déjà renseignée). */}
      {showBilling && (
        <Section
          title={fr ? 'Société et facturation' : 'Company and billing'}
          description={fr ? 'Pour vos contrats et le paiement de vos factures.' : 'For your contracts and the payment of your invoices.'}
        >
          {editing ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label={fr ? 'Statut juridique' : 'Legal status'}>
                <Input value={form.legal_status} onChange={(e) => set('legal_status', e.target.value)} placeholder={fr ? 'EI, EURL, SASU, portage salarial…' : 'Sole trader, Ltd, umbrella…'} />
              </FormField>
              <FormField label={fr ? 'Raison sociale' : 'Company name'}>
                <Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder={fr ? 'Ma Société SASU' : 'My Company Ltd'} />
              </FormField>
              <FormField label="SIRET">
                <Input inputMode="numeric" value={form.siret} onChange={(e) => set('siret', e.target.value.replace(/\s/g, ''))} placeholder={fr ? '14 chiffres' : '14 digits'} />
              </FormField>
              <FormField label={fr ? 'N° TVA intracommunautaire' : 'Intra-EU VAT number'}>
                <Input value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} placeholder="FRXX999999999" />
              </FormField>
              <FormField label="IBAN">
                <Input value={form.iban} onChange={(e) => set('iban', e.target.value.toUpperCase())} placeholder="FR76 …" />
              </FormField>
              <FormField label="BIC">
                <Input value={form.bic} onChange={(e) => set('bic', e.target.value.toUpperCase())} placeholder="AGRIFRPPXXX" />
              </FormField>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                <ReadRow label={fr ? 'Statut juridique' : 'Legal status'} value={c.legal_status} />
                <ReadRow label={fr ? 'Raison sociale' : 'Company name'} value={c.company_name} />
                <ReadRow label="SIRET" value={c.siret} />
                <ReadRow label={fr ? 'N° TVA' : 'VAT number'} value={c.vat_number} />
                <ReadRow label="IBAN" value={c.iban} />
                <ReadRow label="BIC" value={c.bic} />
              </div>
              {billingMissing && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-[12.5px]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  {fr
                    ? 'Renseignez votre société et votre IBAN : ils sont nécessaires pour vos contrats et le paiement de vos factures.'
                    : 'Add your company and IBAN: they are required for your contracts and the payment of your invoices.'}
                </p>
              )}
            </>
          )}
        </Section>
      )}

      {/* Langues */}
      <Section title={fr ? 'Langues' : 'Languages'} description={editing ? (fr ? 'Ajoutez, modifiez ou retirez vos langues, puis enregistrez.' : 'Add, edit or remove your languages, then save.') : undefined}>
        {editing ? (
          <div className="space-y-2">
            {form.languages.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={l.code}
                  onChange={(e) => set('languages', form.languages.map((row, j) => (j === i ? { ...row, code: e.target.value.toUpperCase().slice(0, 5) } : row)))}
                  placeholder="FR"
                  className="w-20 uppercase"
                  aria-label={fr ? 'Code langue' : 'Language code'}
                />
                <select
                  value={l.level}
                  onChange={(e) => set('languages', form.languages.map((row, j) => (j === i ? { ...row, level: e.target.value } : row)))}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                  aria-label={fr ? 'Niveau' : 'Level'}
                >
                  {!LANG_LEVELS.includes(l.level) && l.level && <option value={l.level}>{levelLabel(l.level)}</option>}
                  {LANG_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {levelLabel(lvl)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => set('languages', form.languages.filter((_, j) => j !== i))}
                  aria-label={fr ? 'Retirer cette langue' : 'Remove this language'}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => set('languages', [...form.languages, { code: '', level: 'Professionnel' }])}>
              <Plus className="h-4 w-4" />
              {fr ? 'Ajouter une langue' : 'Add a language'}
            </Button>
          </div>
        ) : c.languages.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune langue renseignée. « Modifier » pour en ajouter.' : 'No language yet. Use “Edit” to add one.'}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {c.languages.map((l) => (
              <li key={l.code} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[13px]">
                <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold uppercase tracking-wide">{l.code}</span>
                <span className="text-muted-foreground">{levelLabel(l.level)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Link href="/portal/documents" className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-muted/40">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{fr ? 'CV, certifications et pièces' : 'CV, certifications and documents'}</span>
          <span className="block truncate text-[12.5px] text-muted-foreground">{fr ? 'Dans « Mes documents »' : 'In “My documents”'}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      {/* Enregistrement : barre fixe au-dessus des onglets sur mobile. */}
      {editing && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] z-20 grid grid-cols-2 gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          {editActions}
        </div>
      )}
    </div>
  );
}

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {description && <p className="text-[12.5px] text-muted-foreground">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/50 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-[13.5px] font-medium">{value}</dd>
    </div>
  );
}

/** Le libellé enveloppe le champ : association implicite, lisible par les lecteurs d'écran. */
function FormField({ label, icon, children, className }: { label: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function ReadRow({ icon: Icon, label, value, href }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string | null; href?: string }) {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  return (
    <div className="flex items-start gap-3 text-[13.5px]">
      <span className="flex w-28 shrink-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      {value ? (
        href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 break-words text-primary-deep hover:underline">
            {value}
          </a>
        ) : (
          <span className="min-w-0 break-words">{value}</span>
        )
      ) : (
        <span className="text-muted-foreground/70">{fr ? 'Non renseigné' : 'Not provided'}</span>
      )}
    </div>
  );
}
