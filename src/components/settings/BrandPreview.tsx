'use client';

import { cn } from '@/lib/utils';

export type BrandPreviewProps = {
  logoUrl: string | null;
  primary: string;
  accent: string;
  brandName: string;
  tagline: string;
  identity: { address?: string | null; postal_code?: string | null; city?: string | null; siren?: string | null } | null;
  lang: 'fr' | 'en';
};

/** Barre de texte neutre : l'aperçu montre la mise en forme, pas un contenu inventé. */
function Bar({ w, className }: { w: string; className?: string }) {
  return <span className={cn('block h-[5px] rounded-full bg-black/10', className)} style={{ width: w }} />;
}

/** Logo de l'organisation ; sans logo, son nom (comme sur les vrais documents). */
function Logo({ logoUrl, name, color, className }: { logoUrl: string | null; name: string; color: string; className?: string }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className={cn('w-auto object-contain', className)} />
  ) : (
    <span className="text-[11px] font-bold" style={{ color }}>
      {name}
    </span>
  );
}

function footerLine(p: BrandPreviewProps) {
  return [p.brandName, p.tagline].filter(Boolean).join(' — ');
}

/** Dossier de compétences : même structure pour toutes les ESN, identité variable. */
export function DossierPreview(p: BrandPreviewProps) {
  const fr = p.lang === 'fr';
  return (
    <div className="mx-auto flex aspect-[210/297] w-full max-w-[440px] flex-col bg-white p-[7%] text-[#1f1b18] shadow-[0_18px_40px_-24px_rgba(25,22,20,.45)]">
      <div className="flex items-center justify-between">
        <Logo logoUrl={p.logoUrl} name={p.brandName} color={p.primary} className="h-7" />
        <span className="text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: p.accent }}>
          {fr ? 'Dossier de compétences' : 'Skills dossier'}
        </span>
      </div>
      <div className="mt-[6%] h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${p.primary} 0%, ${p.accent} 55%, transparent 100%)` }} />
      <div className="mt-[5%]">
        <p className="text-[15px] font-bold leading-tight">{fr ? 'Prénom Nom' : 'First Last'}</p>
        <p className="mt-0.5 text-[10px] font-semibold" style={{ color: p.primary }}>
          {fr ? 'Intitulé du poste' : 'Job title'}
        </p>
      </div>
      <div className="mt-[5%] grid grid-cols-[1fr_2fr] gap-[5%]">
        <div className="space-y-2">
          <p className="text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: p.primary }}>
            {fr ? 'Compétences' : 'Skills'}
          </p>
          <div className="flex flex-wrap gap-1">
            {[42, 30, 36, 26, 34].map((w, i) => (
              <span key={i} className="h-[11px] rounded-full" style={{ width: w, background: `${p.accent}22`, boxShadow: `inset 0 0 0 1px ${p.accent}55` }} />
            ))}
          </div>
          <p className="pt-1 text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: p.primary }}>
            {fr ? 'Langues' : 'Languages'}
          </p>
          <Bar w="70%" />
          <Bar w="55%" />
        </div>
        <div className="space-y-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: p.primary }}>
            {fr ? 'Expériences' : 'Experience'}
          </p>
          {[0, 1].map((i) => (
            <div key={i} className="space-y-1.5 border-l-2 pl-2" style={{ borderColor: p.accent }}>
              <Bar w="60%" className="bg-black/20" />
              <Bar w="38%" />
              <Bar w="92%" />
              <Bar w="84%" />
              <Bar w="70%" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto flex justify-between border-t border-black/10 pt-1.5 text-[7.5px] text-black/50">
        <span className="truncate">{footerLine(p)}</span>
        <span className="shrink-0 uppercase tracking-wider">{fr ? 'Confidentiel' : 'Confidential'}</span>
      </div>
    </div>
  );
}

/** Devis : en-tête, émetteur, tableau, total, mentions. */
export function QuotePreview(p: BrandPreviewProps) {
  const fr = p.lang === 'fr';
  const id = p.identity;
  const address = [id?.address, [id?.postal_code, id?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return (
    <div className="mx-auto flex aspect-[210/297] w-full max-w-[440px] flex-col bg-white p-[7%] text-[#1f1b18] shadow-[0_18px_40px_-24px_rgba(25,22,20,.45)]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Logo logoUrl={p.logoUrl} name={p.brandName} color={p.primary} className="h-7" />
          <p className="pt-1 text-[8px] font-semibold">{p.brandName}</p>
          <p className="max-w-[160px] text-[7.5px] leading-snug text-black/55">{address || (fr ? 'Adresse de l’organisation' : 'Organization address')}</p>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-bold tracking-[-0.02em]" style={{ color: p.primary }}>
            {fr ? 'DEVIS' : 'QUOTE'}
          </p>
          <div className="mt-1 space-y-1">
            <Bar w="64px" className="ml-auto" />
            <Bar w="48px" className="ml-auto" />
          </div>
        </div>
      </div>
      <div className="mt-[7%] ml-auto w-[45%] space-y-1 rounded-md p-2" style={{ background: `${p.accent}14` }}>
        <p className="text-[7.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: p.accent }}>
          Client
        </p>
        <Bar w="80%" className="bg-black/20" />
        <Bar w="65%" />
      </div>
      <div className="mt-[7%] overflow-hidden rounded-md border border-black/10">
        <div className="grid grid-cols-[3fr_1fr_1fr] gap-2 px-2 py-1.5 text-[7.5px] font-semibold text-white" style={{ background: p.primary }}>
          <span>{fr ? 'Prestation' : 'Service'}</span>
          <span className="text-right">{fr ? 'Jours' : 'Days'}</span>
          <span className="text-right">{fr ? 'Montant' : 'Amount'}</span>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[3fr_1fr_1fr] items-center gap-2 border-t border-black/5 px-2 py-2">
            <Bar w={`${80 - i * 14}%`} />
            <Bar w="40%" className="ml-auto" />
            <Bar w="60%" className="ml-auto" />
          </div>
        ))}
      </div>
      <div className="mt-3 ml-auto w-[42%] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[7.5px] text-black/55">{fr ? 'Total HT' : 'Total excl. VAT'}</span>
          <Bar w="40%" />
        </div>
        <div className="flex items-center justify-between rounded px-1.5 py-1" style={{ background: p.accent }}>
          <span className="text-[7.5px] font-semibold text-white">{fr ? 'Total TTC' : 'Total incl. VAT'}</span>
          <span className="block h-[5px] w-[38%] rounded-full bg-white/70" />
        </div>
      </div>
      <div className="mt-auto border-t border-black/10 pt-1.5 text-[7px] leading-snug text-black/50">
        <span className="block truncate">
          {footerLine(p)}
          {id?.siren ? ` · SIREN ${id.siren}` : ''}
        </span>
      </div>
    </div>
  );
}

/** Portail client : la marque de l'ESN sur l'espace de ses clients. */
export function PortalPreview(p: BrandPreviewProps & { dark: boolean }) {
  const fr = p.lang === 'fr';
  return (
    <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[14px] border border-black/10 bg-[#f7f4f1] shadow-[0_18px_40px_-24px_rgba(25,22,20,.45)]">
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-white px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-black/15" />
        <span className="h-2 w-2 rounded-full bg-black/15" />
        <span className="h-2 w-2 rounded-full bg-black/15" />
      </div>
      <div className="grid grid-cols-[34%_1fr]">
        <div className={cn('space-y-1.5 p-3', p.dark ? 'bg-[#1b1817]' : 'bg-white')}>
          <div className="mb-3 flex h-8 items-center">
            {p.logoUrl ? (
              <Logo logoUrl={p.logoUrl} name={p.brandName} color={p.primary} className="h-6" />
            ) : (
              // Sans logo, le portail affiche le nom de l'organisation.
              <span className={cn('truncate text-[11px] font-bold', p.dark ? 'text-white' : 'text-[#1f1b18]')}>{p.brandName}</span>
            )}
          </div>
          {[fr ? 'Accueil' : 'Home', fr ? 'Missions' : 'Missions', 'CRA', 'Documents'].map((label, i) => (
            <span
              key={label}
              className={cn('block rounded-lg px-2 py-1.5 text-[10px] font-medium', i === 0 ? 'text-white' : p.dark ? 'text-white/70' : 'text-black/60')}
              style={i === 0 ? { background: p.primary } : undefined}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="space-y-2.5 p-3.5">
          <p className="text-[12px] font-semibold text-[#1f1b18]">{fr ? 'Bonjour' : 'Hello'}</p>
          <div className="space-y-2 rounded-xl bg-white p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: p.accent }}>
              {fr ? 'CRA à valider' : 'Timesheet to approve'}
            </p>
            <Bar w="70%" className="bg-black/20" />
            <Bar w="45%" />
            <span className="mt-1 inline-block rounded-lg px-2.5 py-1 text-[9px] font-semibold text-white" style={{ background: p.primary }}>
              {fr ? 'Valider' : 'Approve'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5 rounded-xl bg-white p-2.5">
                <Bar w="50%" />
                <span className="block h-[9px] w-[40%] rounded-full" style={{ background: i ? `${p.accent}55` : `${p.primary}55` }} />
              </div>
            ))}
          </div>
          <p className="truncate text-[8px] text-black/45">{footerLine(p)}</p>
        </div>
      </div>
    </div>
  );
}
