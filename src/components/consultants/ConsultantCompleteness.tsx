'use client';

import Link from 'next/link';
import { CheckCircle2, CircleAlert, FileWarning } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  computeCompleteness,
  resolveDocRequirements,
  type ConsultantForCompleteness,
} from '@/lib/alerts/completeness';
import type { ContractType } from '@/types';
import { cn } from '@/lib/utils';

// =========================================================================
// Jauge de complétude du profil consultant.
// -------------------------------------------------------------------------
// Réutilise la MÊME logique que le moteur d'alertes (lib/alerts/completeness)
// → ce que voit l'utilisateur ici est exactement ce qui déclenche les
// relances automatiques. Les exigences dépendent du statut contractuel
// (freelance / portage / CDI…) + overrides org (document_requirements).
// =========================================================================

type Props = {
  consultantId: string;
  organizationId: string;
  /**
   * true côté portail : seuls les éléments que le consultant peut fournir
   * comptent, avec un lien vers ses documents.
   */
  asConsultant?: boolean;
  /**
   * Fiche déjà chargée. Obligatoire côté portail : le consultant ne lit pas
   * la table consultants (RLS, migration 102), seulement portal_my_profile().
   */
  profile?: Omit<ConsultantForCompleteness, 'daily_rate_eur'> & { daily_rate_eur?: number | null };
  className?: string;
};

type Loaded = {
  consultant: ConsultantForCompleteness | null;
  docs: Array<{ kind: string; expires_at: string | null }>;
  reqs: Array<{
    contract_type: string | null;
    kind: string;
    label: string;
    required: boolean;
    active: boolean;
  }>;
};

export function ConsultantCompleteness({
  consultantId,
  organizationId,
  asConsultant = false,
  profile,
  className,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { data } = useCachedQuery<Loaded>(
    `completeness:${organizationId}:${consultantId}:${profile ? 'portal' : 'esn'}`,
    async () => {
      const supabase = createClient();
      const [c, d, r] = await Promise.all([
        profile
          ? Promise.resolve({ data: { ...profile, daily_rate_eur: profile.daily_rate_eur ?? null } })
          : supabase
              .from('consultants')
              .select(
                'first_name, last_name, email, phone, job_title, daily_rate_eur, contract_type, status, city, address, legal_status, company_name, siret, iban, bic',
              )
              .eq('id', consultantId)
              .maybeSingle(),
        supabase
          .from('consultant_documents')
          .select('kind, expires_at')
          .eq('consultant_id', consultantId),
        supabase
          .from('document_requirements')
          .select('contract_type, kind, label, required, active')
          .eq('organization_id', organizationId),
      ]);
      return {
        consultant: (c.data as ConsultantForCompleteness | null) ?? null,
        docs: (d.data ?? []) as Loaded['docs'],
        reqs: (r.data ?? []) as Loaded['reqs'],
      };
    },
    { enabled: !!consultantId && !!organizationId },
  );

  if (!data?.consultant) return null;

  const reqs = resolveDocRequirements(
    (data.consultant.contract_type as ContractType | null) ?? null,
    data.reqs,
  );
  // Fiche fournie (portail) : elle fait foi, y compris après une modification.
  const consultant = profile ? { ...profile, daily_rate_eur: profile.daily_rate_eur ?? null } : data.consultant;
  const res = computeCompleteness(consultant, data.docs, reqs, new Date(), { scope: asConsultant ? 'consultant' : 'esn' });

  const tone =
    res.percent >= 100 ? 'emerald' : res.percent >= 70 ? 'amber' : 'red';
  const barColor =
    tone === 'emerald' ? 'bg-success' : tone === 'amber' ? 'bg-warning' : 'bg-destructive';
  const textColor =
    tone === 'emerald'
      ? 'text-success '
      : tone === 'amber'
        ? 'text-warning '
        : 'text-destructive ';

  const missing = [
    ...res.missingFields.map((f) => f.label),
    ...res.missingDocuments.map((d) => d.label),
  ];

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        res.complete
          ? 'border-success/25 bg-success/[0.04]'
          : 'border-warning/25 bg-warning/[0.04]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {res.complete ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <CircleAlert className={cn('h-4 w-4', textColor)} />
          )}
          {asConsultant
            ? isEn ? 'Your file for missions and payments' : 'Votre dossier pour les missions et les paiements'
            : isEn ? 'Profile completeness' : 'Complétude du profil'}
        </div>
        <span className={cn('shrink-0 whitespace-nowrap font-display text-xl font-light', textColor)}>{res.percent} %</span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${res.percent}%` }}
        />
      </div>

      {!res.complete && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {isEn ? 'Missing' : 'Manquant'} ({missing.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, 8).map((m) => (
              <span
                key={m}
                className="rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[11px] text-warning "
              >
                {m}
              </span>
            ))}
            {missing.length > 8 && (
              <span className="text-[11px] text-muted-foreground">+{missing.length - 8}</span>
            )}
          </div>
        </div>
      )}

      {(res.expiredDocuments.length > 0 || res.expiringSoonDocuments.length > 0) && (
        <div className="mt-3 space-y-1">
          {res.expiredDocuments.map((d) => (
            <div key={d.kind} className="flex items-center gap-1.5 text-[11px] text-destructive ">
              <FileWarning className="h-3 w-3" />
              {isEn ? `${d.label} expired — renew immediately` : `${d.label} expiré — à renouveler immédiatement`}
            </div>
          ))}
          {res.expiringSoonDocuments.map((d) => (
            <div key={d.kind} className="flex items-center gap-1.5 text-[11px] text-warning ">
              <FileWarning className="h-3 w-3" />
              {isEn ? `${d.label} expires in ${d.days_left}d` : `${d.label} expire dans ${d.days_left} j`}
            </div>
          ))}
        </div>
      )}

      {!res.complete && asConsultant && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {isEn
            ? 'Complete these items (information and documents) so your missions and payments are never held up.'
            : 'Complétez ces éléments (informations et documents) pour que vos missions et vos paiements ne soient jamais bloqués.'}
          {res.missingDocuments.length > 0 && (
            <>
              {' '}
              <Link href="/portal/documents#pieces" className="font-medium text-primary-deep underline-offset-2 hover:underline">
                {isEn ? 'Upload documents' : 'Déposer les documents'}
              </Link>
            </>
          )}
        </p>
      )}
      {!res.complete && !asConsultant && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {isEn ? (
            <>
              The consultant receives automatic reminders (email{' + '}portal) every 7 days until
              completion —{' '}
              <Link href="/settings/notifications" className="underline hover:text-foreground">
                adjustable cadence
              </Link>
              .
            </>
          ) : (
            <>
              Le consultant reçoit des relances automatiques (email{' + '}portail) tous les 7 jours
              jusqu&apos;à complétion —{' '}
              <Link href="/settings/notifications" className="underline hover:text-foreground">
                cadence réglable
              </Link>
              .
            </>
          )}
        </p>
      )}
    </div>
  );
}
