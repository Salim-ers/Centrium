'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Loader2,
  Briefcase,
  AlertTriangle,
  Languages,
  Building2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PageHeader,
  SectionHeader,
  AppCard,
  AppCardBody,
  Reveal,
} from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CONSULTANT_STATUS_STYLE,
} from '@/constants';
import type { Consultant } from '@/types';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useConsultantStatusLabels, useSeniorityLabels } from '@/lib/i18n/useBadges';
import { KycDocuments } from '@/components/consultants/KycDocuments';
import { ConsultantCompleteness } from '@/components/consultants/ConsultantCompleteness';
import { ConsultantSelfDocuments } from '@/components/portal/ConsultantSelfDocuments';
import { usePortalConsultant } from '../portal-context';

type LangRow = { code: string; level: string };

const LANG_LEVELS = ['Natif', 'Bilingue', 'Courant', 'Professionnel', 'Intermédiaire', 'Notions'];

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

/** Form pré-rempli depuis la fiche consultant (partagé load/cancel). */
function formFromConsultant(c: Consultant): EditableForm {
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

export default function PortalProfilePage() {
  const { consultantId, userId } = usePortalConsultant();
  const { activeOrgId } = useOrganization();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const statusLabels = useConsultantStatusLabels();
  const seniorityLabels = useSeniorityLabels();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditableForm>(emptyForm());

  const {
    data: consultant,
    loading,
    setData: setConsultant,
  } = useCachedQuery<Consultant | null>(
    `portal-profile:${consultantId}`,
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('consultants')
        .select('*')
        .eq('id', consultantId)
        .maybeSingle();
      return (data as Consultant | null) ?? null;
    },
  );

  useEffect(() => {
    if (consultant && !editing) {
      setForm(formFromConsultant(consultant));
    }
  }, [consultant, editing]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Ignore les lignes langue incomplètes (code < 2 caractères)
          languages: form.languages.filter((l) => l.code.trim().length >= 2),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Unable to update' : 'Mise à jour impossible'));
        return;
      }
      toast.success(isEn ? 'Profile updated' : 'Profil mis à jour');
      setConsultant(body.data as Consultant);
      setEditing(false);
    } catch {
      toast.error(isEn ? 'Network error' : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (consultant) setForm(formFromConsultant(consultant));
    setEditing(false);
  }

  if (loading) return <div className="h-60 rounded-2xl bg-foreground/[0.03] animate-pulse" />;
  if (!consultant) return <p className="text-muted-foreground">{isEn ? 'Profile not found.' : 'Profil introuvable.'}</p>;

  const c = consultant;
  const billingMissing = !c.legal_status && !c.siret && !c.iban;
  const langLevelLabel = (lvl: string) =>
    isEn
      ? ({
          Natif: 'Native',
          Bilingue: 'Bilingual',
          Courant: 'Fluent',
          Professionnel: 'Professional',
          Intermédiaire: 'Intermediate',
          Notions: 'Basics',
        }[lvl] ?? lvl)
      : lvl;

  return (
    <div>
      <PageHeader
        eyebrow={isEn ? 'My space' : 'Mon espace'}
        title={<>{isEn ? 'My ' : 'Mon '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'profile.' : 'profil.'}</span></>}
        description={
          isEn
            ? `Update your personal information — the business fields (day rate, seniority, status) remain managed by ${brandName}.`
            : `Mets à jour tes infos personnelles — les champs business (TJM, séniorité, statut) restent gérés par ${brandName}.`
        }
        actions={
          editing ? (
            <>
              <Button variant="outline" onClick={cancel} disabled={saving}>
                <X className="h-4 w-4" />
                {isEn ? 'Cancel' : 'Annuler'}
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEn ? 'Save' : 'Enregistrer'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              {isEn ? 'Edit' : 'Modifier'}
            </Button>
          )
        }
      />

      {/* ---- Héro identité (champs business, lecture seule) ---- */}
      <Reveal>
        <AppCard variant="luminous" tone="magenta" className="mb-8">
          <div className="h-1 bg-qc-gradient" />
          <AppCardBody size="lg">
            <div className="flex items-start gap-6 flex-wrap">
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-full bg-qc-gradient flex items-center justify-center text-white text-2xl font-bold shadow-glow ring-4 ring-magenta/10">
                  {c.first_name[0]}
                  {c.last_name[0]}
                </div>
              </div>

              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-display font-light tracking-[-0.02em] text-2xl sm:text-3xl">
                    {c.first_name}{' '}
                    <span className="qc-italic-accent font-editorial italic">{c.last_name}</span>
                  </h2>
                  <Badge variant="outline" className={CONSULTANT_STATUS_STYLE[c.status]}>
                    {statusLabels[c.status]}
                  </Badge>
                </div>
                <p className="text-lg text-muted-foreground mt-1 inline-flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {c.job_title}
                </p>
                {c.sub_title && (
                  <p className="text-sm text-muted-foreground/80">{c.sub_title}</p>
                )}

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden border border-hairline bg-hairline/40">
                  <HeroStat label={isEn ? 'Seniority' : 'Séniorité'} value={seniorityLabels[c.seniority]} />
                  <HeroStat label={isEn ? 'Experience' : 'Expérience'} value={isEn ? `${c.years_experience} yrs` : `${c.years_experience} ans`} />
                  <HeroStat label={isEn ? 'Day rate' : 'TJM'} value={formatCurrency(c.daily_rate_eur)} />
                  <HeroStat
                    label={isEn ? 'Available' : 'Disponible'}
                    value={c.available_from ? formatDate(c.available_from) : (isEn ? 'Now' : 'Maintenant')}
                  />
                </div>
              </div>
            </div>
          </AppCardBody>
        </AppCard>
      </Reveal>

      {/* ---- Coordonnées (éditables) ---- */}
      <Reveal delay={0.06}>
        <SectionHeader
          eyebrow={isEn ? 'Contact' : 'Contact'}
          title={<>{isEn ? 'My ' : 'Mes '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'contact details.' : 'coordonnées.'}</span></>}
        />
        <AppCard className="mb-8">
          <AppCardBody>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="prenom.nom@email.fr"
                  />
                </FormField>
                <FormField label={isEn ? 'Phone' : 'Téléphone'} icon={<Phone className="h-3.5 w-3.5" />}>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+33 6 XX XX XX XX"
                  />
                </FormField>
                <FormField label="LinkedIn" icon={<Linkedin className="h-3.5 w-3.5" />}>
                  <Input
                    value={form.linkedin_url}
                    onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/…"
                  />
                </FormField>
                <FormField label={isEn ? 'City' : 'Ville'} icon={<MapPin className="h-3.5 w-3.5" />}>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Paris"
                  />
                </FormField>
                <FormField label={isEn ? 'Country' : 'Pays'}>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="FR"
                  />
                </FormField>
                <FormField label={isEn ? 'Mobility' : 'Mobilité'} className="md:col-span-2">
                  <Input
                    value={form.mobility}
                    onChange={(e) => setForm({ ...form, mobility: e.target.value })}
                    placeholder={isEn ? 'Île-de-France, Lyon, full-remote France…' : 'Île-de-France, Lyon, full-remote France…'}
                  />
                </FormField>
                <FormField label={isEn ? 'Summary' : 'Résumé'} className="md:col-span-2">
                  <Textarea
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    rows={4}
                    placeholder={isEn ? 'A few lines to introduce yourself…' : 'Quelques lignes pour te présenter…'}
                  />
                </FormField>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <ReadRow icon={<Mail className="h-4 w-4" />} label="Email" value={c.email} />
                <ReadRow icon={<Phone className="h-4 w-4" />} label={isEn ? 'Phone' : 'Téléphone'} value={c.phone} />
                <ReadRow
                  icon={<Linkedin className="h-4 w-4" />}
                  label="LinkedIn"
                  value={c.linkedin_url}
                  href={c.linkedin_url ?? undefined}
                />
                <ReadRow
                  icon={<MapPin className="h-4 w-4" />}
                  label={isEn ? 'City' : 'Ville'}
                  value={c.city ? `${c.city}${c.country && c.country !== 'FR' ? `, ${c.country}` : ''}` : null}
                />
                {c.mobility && (
                  <ReadRow icon={<MapPin className="h-4 w-4" />} label={isEn ? 'Mobility' : 'Mobilité'} value={c.mobility} />
                )}
                {c.summary && (
                  <div className="md:col-span-2 mt-2 pt-3 border-t border-hairline">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-magenta mb-2">
                      {isEn ? 'Summary' : 'Résumé'}
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                      {c.summary}
                    </p>
                  </div>
                )}
              </div>
            )}
          </AppCardBody>
        </AppCard>
      </Reveal>

      {/* ---- Société & facturation ---- */}
      <Reveal delay={0.12}>
        <SectionHeader
          eyebrow={isEn ? 'Billing' : 'Facturation'}
          title={<>{isEn ? 'Company & ' : 'Société & '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'billing.' : 'facturation.'}</span></>}
          description={isEn ? 'This information feeds your contracts and the payment of your timesheets.' : 'Ces informations alimentent tes contrats et le règlement de tes CRA.'}
        />
        <AppCard tone={billingMissing && !editing ? 'amber' : 'none'} className="mb-8">
          <AppCardBody>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={isEn ? 'Legal status' : 'Statut juridique'}>
                  <Input
                    value={form.legal_status}
                    onChange={(e) => setForm({ ...form, legal_status: e.target.value })}
                    placeholder="EI, EURL, SASU, portage salarial…"
                  />
                </FormField>
                <FormField label={isEn ? 'Company name' : 'Raison sociale'}>
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Ma Société SASU"
                  />
                </FormField>
                <FormField label="SIRET">
                  <Input
                    value={form.siret}
                    onChange={(e) => setForm({ ...form, siret: e.target.value.replace(/\s/g, '') })}
                    placeholder={isEn ? '14 digits' : '14 chiffres'}
                    inputMode="numeric"
                  />
                </FormField>
                <FormField label={isEn ? 'Intra-EU VAT number' : 'N° TVA intracommunautaire'}>
                  <Input
                    value={form.vat_number}
                    onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
                    placeholder="FRXX999999999"
                  />
                </FormField>
                <FormField label={isEn ? 'Address' : 'Adresse'}>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder={isEn ? '12 Example Street' : '12 rue Exemple'}
                  />
                </FormField>
                <FormField label={isEn ? 'Postal code' : 'Code postal'}>
                  <Input
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    placeholder="75011"
                  />
                </FormField>
                <FormField label="IBAN">
                  <Input
                    value={form.iban}
                    onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
                    placeholder="FR76 …"
                  />
                </FormField>
                <FormField label="BIC">
                  <Input
                    value={form.bic}
                    onChange={(e) => setForm({ ...form, bic: e.target.value.toUpperCase() })}
                    placeholder="AGRIFRPPXXX"
                  />
                </FormField>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <ReadRow icon={<Building2 className="h-4 w-4" />} label={isEn ? 'Legal status' : 'Statut juridique'} value={c.legal_status} />
                  <ReadRow label={isEn ? 'Company name' : 'Raison sociale'} value={c.company_name} />
                  <ReadRow label="SIRET" value={c.siret} />
                  <ReadRow label={isEn ? 'VAT number' : 'N° TVA'} value={c.vat_number} />
                  <ReadRow
                    label={isEn ? 'Address' : 'Adresse'}
                    value={c.address ? `${c.address}${c.postal_code ? `, ${c.postal_code}` : ''}` : null}
                  />
                  <ReadRow label="IBAN" value={c.iban} />
                  <ReadRow label="BIC" value={c.bic} />
                </div>
                {billingMissing && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-300/90">
                      {isEn
                        ? 'Complete your company and billing information — it is required for your contracts and the payment of your timesheets.'
                        : 'Complète tes informations de société et de facturation — elles sont nécessaires pour tes contrats et le règlement de tes CRA.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </AppCardBody>
        </AppCard>
      </Reveal>

      {/* ---- Langues (ajout / suppression par le consultant) ---- */}
      <Reveal delay={0.18}>
        <SectionHeader
          eyebrow={isEn ? 'Profile' : 'Profil'}
          title={<>{isEn ? 'My ' : 'Mes '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'languages.' : 'langues.'}</span></>}
          description={editing ? (isEn ? 'Add, edit or remove your languages — remember to save.' : 'Ajoute, modifie ou retire tes langues — pense à enregistrer.') : undefined}
        />
        <AppCard className="mb-8">
          <AppCardBody className="space-y-1">
            {editing ? (
              <div className="space-y-2">
                {form.languages.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={l.code}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          languages: form.languages.map((row, j) =>
                            j === i ? { ...row, code: e.target.value.toUpperCase().slice(0, 5) } : row,
                          ),
                        })
                      }
                      placeholder="FR"
                      className="w-24 uppercase"
                      aria-label={isEn ? 'Language code' : 'Code langue'}
                    />
                    <select
                      value={l.level}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          languages: form.languages.map((row, j) =>
                            j === i ? { ...row, level: e.target.value } : row,
                          ),
                        })
                      }
                      className="flex-1 h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                      aria-label={isEn ? 'Level' : 'Niveau'}
                    >
                      {!LANG_LEVELS.includes(l.level) && l.level && (
                        <option value={l.level}>{langLevelLabel(l.level)}</option>
                      )}
                      {LANG_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {langLevelLabel(lvl)}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          ...form,
                          languages: form.languages.filter((_, j) => j !== i),
                        })
                      }
                      aria-label={isEn ? 'Remove this language' : 'Retirer cette langue'}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      languages: [...form.languages, { code: '', level: 'Professionnel' }],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isEn ? 'Add a language' : 'Ajouter une langue'}
                </Button>
              </div>
            ) : c.languages.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic px-1 py-2">
                {isEn ? 'No language set — click “Edit” to add one.' : 'Aucune langue renseignée — clique sur « Modifier » pour en ajouter.'}
              </p>
            ) : (
              c.languages.map((l) => (
                <div
                  key={l.code}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover-surface transition-colors"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="uppercase text-xs font-bold tracking-[0.14em] text-foreground/80">
                      {l.code}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">{langLevelLabel(l.level)}</span>
                </div>
              ))
            )}
          </AppCardBody>
        </AppCard>
      </Reveal>

      {/* ---- Mes documents (CV, certifications…) ---- */}
      <Reveal delay={0.22}>
        <SectionHeader
          eyebrow="Documents"
          title={<>{isEn ? 'CV & ' : 'CV & '}<span className="qc-italic-accent font-editorial italic">certifications.</span></>}
          description={isEn ? 'Your CV and supporting documents, shared with the team that positions you.' : 'Ton CV et tes justificatifs, partagés avec l\'équipe qui te positionne.'}
        />
        <div className="mb-8">
          <ConsultantSelfDocuments
            consultantId={consultantId}
            userId={userId}
            orgId={activeOrgId}
            compact
          />
        </div>
      </Reveal>

      {/* ---- Documents légaux & administratifs ---- */}
      {activeOrgId && (
        <Reveal delay={0.28}>
          <div className="mb-8 space-y-4">
            <ConsultantCompleteness
              consultantId={consultantId}
              organizationId={activeOrgId}
              asConsultant
            />
            <KycDocuments
              consultantId={consultantId}
              organizationId={activeOrgId}
              asConsultant
            />
          </div>
        </Reveal>
      )}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card/70 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground truncate">{value}</div>
    </div>
  );
}

function FormField({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ReadRow({
  icon,
  label,
  value,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
}) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  if (!value) {
    return (
      <div className="text-muted-foreground/50 italic">
        <span className="text-[10px] uppercase tracking-wider">{label}</span> {isEn ? '— not provided' : '— non renseigné'}
      </div>
    );
  }
  const content = (
    <span className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-24 shrink-0">
        {label}
      </span>
      <span className="truncate">{value}</span>
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-magenta transition-colors">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}
