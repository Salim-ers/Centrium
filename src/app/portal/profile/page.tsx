'use client';

import { useEffect, useState } from 'react';
import { UserCircle, Mail, Phone, Linkedin, MapPin, Lock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CONSULTANT_STATUS_LABEL,
  CONSULTANT_STATUS_STYLE,
  SENIORITY_LABEL,
} from '@/constants';
import type { Consultant } from '@/types';

export default function PortalProfilePage() {
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('consultant_id')
        .eq('id', uid)
        .maybeSingle();

      if (!profile?.consultant_id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('consultants')
        .select('*')
        .eq('id', profile.consultant_id)
        .maybeSingle();
      setConsultant(data as Consultant | null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="h-60 rounded-xl bg-white/[0.02] animate-pulse" />;
  }
  if (!consultant) {
    return <p className="text-muted-foreground">Profil introuvable.</p>;
  }

  const c = consultant;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <UserCircle className="h-7 w-7 text-violet-glow" />
          Mon profil
        </h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <Lock className="h-3 w-3" />
          Lecture seule — contacte QuadCore pour toute modification.
        </p>
      </div>

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
              <p className="text-lg text-muted-foreground mt-1">{c.job_title}</p>
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

          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {c.email && (
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={c.email} />
            )}
            {c.phone && (
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={c.phone} />
            )}
            {c.linkedin_url && (
              <InfoRow
                icon={<Linkedin className="h-4 w-4" />}
                label="LinkedIn"
                value={c.linkedin_url}
                href={c.linkedin_url}
              />
            )}
            {c.city && (
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Localisation"
                value={`${c.city}${c.country && c.country !== 'FR' ? `, ${c.country}` : ''}`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {c.mobility && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Mobilité</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{c.mobility}</p>
          </CardContent>
        </Card>
      )}

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

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
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
