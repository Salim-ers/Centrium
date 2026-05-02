'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  UserCircle,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Pencil,
  Save,
  X,
  Loader2,
  Briefcase,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CONSULTANT_STATUS_LABEL,
  CONSULTANT_STATUS_STYLE,
  SENIORITY_LABEL,
} from '@/constants';
import type { Consultant } from '@/types';
import { useOrganization } from '@/lib/auth/context';
import { KycDocuments } from '@/components/consultants/KycDocuments';
import { usePortalConsultant } from '../portal-context';

type EditableForm = {
  email: string;
  phone: string;
  linkedin_url: string;
  city: string;
  country: string;
  mobility: string;
  summary: string;
};

function emptyForm(): EditableForm {
  return { email: '', phone: '', linkedin_url: '', city: '', country: 'FR', mobility: '', summary: '' };
}

export default function PortalProfilePage() {
  const { consultantId } = usePortalConsultant();
  const { activeOrgId } = useOrganization();
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
      setForm({
        email: consultant.email ?? '',
        phone: consultant.phone ?? '',
        linkedin_url: consultant.linkedin_url ?? '',
        city: consultant.city ?? '',
        country: consultant.country ?? 'FR',
        mobility: consultant.mobility ?? '',
        summary: consultant.summary ?? '',
      });
    }
  }, [consultant, editing]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? 'Mise à jour impossible');
        return;
      }
      toast.success('Profil mis à jour');
      setConsultant(body.data as Consultant);
      setEditing(false);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (consultant) {
      setForm({
        email: consultant.email ?? '',
        phone: consultant.phone ?? '',
        linkedin_url: consultant.linkedin_url ?? '',
        city: consultant.city ?? '',
        country: consultant.country ?? 'FR',
        mobility: consultant.mobility ?? '',
        summary: consultant.summary ?? '',
      });
    }
    setEditing(false);
  }

  if (loading) return <div className="h-60 rounded-xl bg-white/[0.02] animate-pulse" />;
  if (!consultant) return <p className="text-muted-foreground">Profil introuvable.</p>;

  const c = consultant;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <UserCircle className="h-7 w-7 text-violet-glow" />
            Mon profil
          </h1>
          <p className="text-muted-foreground mt-1">
            Tu peux mettre à jour tes infos personnelles. Les champs business (TJM, séniorité,
            statut) restent gérés par QuadCore.
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        )}
      </div>

      {/* Carte identité — lecture seule (champs business) */}
      <Card className="mb-6">
        <div className="h-1 bg-qc-gradient" />
        <CardContent className="p-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="h-20 w-20 rounded-full bg-qc-gradient flex items-center justify-center text-white text-2xl font-bold shadow-glow">
              {c.first_name[0]}
              {c.last_name[0]}
            </div>

            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  {c.first_name} {c.last_name}
                </h2>
                <Badge variant="outline" className={CONSULTANT_STATUS_STYLE[c.status]}>
                  {CONSULTANT_STATUS_LABEL[c.status]}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mt-1 inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {c.job_title}
              </p>
              {c.sub_title && (
                <p className="text-sm text-muted-foreground/80">{c.sub_title}</p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm">
                <Info label="Séniorité" value={SENIORITY_LABEL[c.seniority]} />
                <Info label="Expérience" value={`${c.years_experience} ans`} />
                <Info label="TJM" value={formatCurrency(c.daily_rate_eur)} />
                {c.available_from && (
                  <Info label="Disponible dès" value={formatDate(c.available_from)} />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carte coordonnées — éditables */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Coordonnées</CardTitle>
          {editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                <X className="h-3.5 w-3.5" />
                Annuler
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Enregistrer
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
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
              <FormField label="Téléphone" icon={<Phone className="h-3.5 w-3.5" />}>
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
              <FormField label="Ville" icon={<MapPin className="h-3.5 w-3.5" />}>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Paris"
                />
              </FormField>
              <FormField label="Pays">
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="FR"
                />
              </FormField>
              <FormField label="Mobilité" className="md:col-span-2">
                <Input
                  value={form.mobility}
                  onChange={(e) => setForm({ ...form, mobility: e.target.value })}
                  placeholder="Île-de-France, Lyon, full-remote France…"
                />
              </FormField>
              <FormField label="Résumé" className="md:col-span-2">
                <Textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  rows={4}
                  placeholder="Quelques lignes pour te présenter…"
                />
              </FormField>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <ReadRow icon={<Mail className="h-4 w-4" />} label="Email" value={c.email} />
              <ReadRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={c.phone} />
              <ReadRow
                icon={<Linkedin className="h-4 w-4" />}
                label="LinkedIn"
                value={c.linkedin_url}
                href={c.linkedin_url ?? undefined}
              />
              <ReadRow
                icon={<MapPin className="h-4 w-4" />}
                label="Ville"
                value={c.city ? `${c.city}${c.country && c.country !== 'FR' ? `, ${c.country}` : ''}` : null}
              />
              {c.mobility && (
                <ReadRow icon={<MapPin className="h-4 w-4" />} label="Mobilité" value={c.mobility} />
              )}
              {c.summary && (
                <div className="md:col-span-2 mt-2 pt-2 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    Résumé
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                    {c.summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {c.languages.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Langues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.languages.map((l) => (
              <div key={l.code} className="flex items-center justify-between text-sm">
                <span className="uppercase text-xs font-semibold text-muted-foreground">
                  {l.code}
                </span>
                <span>{l.level}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeOrgId && (
        <div className="mb-6">
          <KycDocuments
            consultantId={consultantId}
            organizationId={activeOrgId}
            asConsultant
          />
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label} :</span>
      <span className="font-medium">{value}</span>
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
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) {
    return (
      <div className="text-muted-foreground/50 italic">
        <span className="text-[10px] uppercase tracking-wider">{label}</span> — non renseigné
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
    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-violet-glow">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}
