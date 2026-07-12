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
  /** true côté portail : wording « ton profil », CTA locales. */
  asConsultant?: boolean;
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
  className,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { data } = useCachedQuery<Loaded>(
    `completeness:${organizationId}:${consultantId}`,
    async () => {
      const supabase = createClient();
      const [c, d, r] = await Promise.all([
        supabase
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
  const res = computeCompleteness(data.consultant, data.docs, reqs);

  const tone =
    res.percent >= 100 ? 'emerald' : res.percent >= 70 ? 'amber' : 'red';
  const barColor =
    tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-red-500';
  const textColor =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-300'
      : tone === 'amber'
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-red-600 dark:text-red-300';

  const missing = [
    ...res.missingFields.map((f) => f.label),
    ...res.missingDocuments.map((d) => d.label),
  ];

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        res.complete
          ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
          : 'border-amber-500/25 bg-amber-500/[0.04]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {res.complete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <CircleAlert className={cn('h-4 w-4', textColor)} />
          )}
          {asConsultant
            ? isEn ? 'Your profile completeness' : 'Complétude de ton profil'
            : isEn ? 'Profile completeness' : 'Complétude du profil'}
        </div>
        <span className={cn('font-display text-xl font-light', textColor)}>{res.percent} %</span>
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
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300"
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
            <div key={d.kind} className="flex items-center gap-1.5 text-[11px] text-red-500 dark:text-red-300">
              <FileWarning className="h-3 w-3" />
              {isEn ? `${d.label} expired — renew immediately` : `${d.label} expiré — à renouveler immédiatement`}
            </div>
          ))}
          {res.expiringSoonDocuments.map((d) => (
            <div key={d.kind} className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-300">
              <FileWarning className="h-3 w-3" />
              {isEn ? `${d.label} expires in ${d.days_left}d` : `${d.label} expire dans ${d.days_left} j`}
            </div>
          ))}
        </div>
      )}

      {!res.complete && asConsultant && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {isEn
            ? 'Complete the items above (information + documents) to enable your mission staffing and invoicing without blockers.'
            : 'Complète les éléments ci-dessus (informations + documents) pour permettre ton positionnement en mission et ta facturation sans blocage.'}
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
