'use client';

import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Check, FileDown, Home, MapPin, Sparkles } from 'lucide-react';

import { useTicker, useVisible } from '../Motion';
import { MockPill, ProductFrame } from '../ProductFrame';
import { cn } from '@/lib/utils';

type Lang = 'fr' | 'en';
const ease = [0.22, 1, 0.36, 1] as const;

// ── CRM : pipeline qui évolue ────────────────────────────────────────────
export function PipelineMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const { ref, visible } = useVisible<HTMLDivElement>();
  const step = useTicker(3, 1800, visible);
  const cols = fr ? ['Qualifié', 'Rendez-vous', 'Proposition', 'Négociation', 'Gagné'] : ['Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Won'];
  // La carte suivie avance d'une colonne à chaque étape.
  const moving = { id: 'm', title: fr ? 'Lead data — Énergie' : 'Data lead — Energy', amount: '96 k€', col: 2 + step };
  const fixed = [
    { id: 'a', title: fr ? 'Renfort Java' : 'Java support', amount: '64 k€', col: 0 },
    { id: 'b', title: fr ? 'Chef de projet SI' : 'IT project lead', amount: '120 k€', col: 1 },
    { id: 'c', title: fr ? 'Audit cloud' : 'Cloud audit', amount: '38 k€', col: 0 },
    { id: 'd', title: fr ? 'Squad mobile' : 'Mobile squad', amount: '210 k€', col: 3 },
  ];
  const cards = [...fixed, moving];
  return (
    <ProductFrame caption={fr ? 'Données d’exemple' : 'Sample data'}>
      <div ref={ref} className="overflow-hidden bg-background p-3">
        <LayoutGroup>
          <div className="grid grid-cols-5 gap-2">
            {cols.map((c, ci) => (
              <div key={c} className="min-w-0 rounded-lg bg-sand-100/70 p-1.5">
                <div className="mb-1.5 truncate px-1 text-[10px] font-medium text-muted-foreground">{c}</div>
                <div className="space-y-1.5">
                  {cards
                    .filter((k) => k.col === ci)
                    .map((k) => (
                      <motion.div
                        layout
                        layoutId={k.id}
                        key={k.id}
                        transition={{ duration: 0.6, ease }}
                        className={cn('rounded-md border bg-card p-1.5 text-[10px] shadow-xs', k.id === 'm' ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border')}
                      >
                        <div className="truncate font-medium">{k.title}</div>
                        <div className="mt-0.5 flex items-center justify-between text-muted-foreground">
                          <span className="num">{k.amount}</span>
                          {k.id === 'm' && ci === 4 && <Check className="h-3 w-3 text-success" />}
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </LayoutGroup>
      </div>
    </ProductFrame>
  );
}

// ── Staffing : consultants qui apparaissent dans le planning ─────────────
export function StaffingMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const { ref, visible } = useVisible<HTMLDivElement>();
  const weeks = fr ? ['S40', 'S41', 'S42', 'S43', 'S44', 'S45', 'S46', 'S47'] : ['W40', 'W41', 'W42', 'W43', 'W44', 'W45', 'W46', 'W47'];
  const rows = [
    { name: 'Camille M.', bars: [{ from: 0, to: 8, label: fr ? 'Banque — refonte SI' : 'Bank — IS overhaul', tone: 'bg-brand-200' }] },
    { name: 'Hugo L.', bars: [{ from: 0, to: 3, label: fr ? 'Énergie — data' : 'Energy — data', tone: 'bg-brand-200' }, { from: 3, to: 8, label: fr ? 'Intercontrat' : 'Bench', tone: 'bg-warning-soft border border-dashed border-warning/40' }] },
    { name: 'Inès D.', bars: [{ from: 0, to: 5, label: fr ? 'Assurance — QA' : 'Insurance — QA', tone: 'bg-brand-200' }, { from: 5, to: 6, label: fr ? 'Congés' : 'Leave', tone: 'bg-sand-200' }, { from: 6, to: 8, label: fr ? 'Positionnée' : 'Proposed', tone: 'bg-info-soft border border-dashed border-info/40' }] },
    { name: 'Yanis B.', bars: [{ from: 2, to: 8, label: fr ? 'Retail — mobile' : 'Retail — mobile', tone: 'bg-brand-200' }] },
  ];
  return (
    <ProductFrame caption={fr ? 'Données d’exemple' : 'Sample data'}>
      <div ref={ref} className="bg-background p-3 text-[10px]">
        <div className="grid grid-cols-[5.5rem_1fr] gap-y-1.5">
          <div />
          <div className="grid grid-cols-8 text-center text-muted-foreground">
            {weeks.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          {rows.map((r, ri) => (
            <motion.div
              key={r.name}
              className="contents"
              initial={reduce ? false : { opacity: 0 }}
              animate={visible || reduce ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: reduce ? 0 : ri * 0.18 }}
            >
              <div className="flex items-center truncate pr-2 font-medium">{r.name}</div>
              <div className="relative grid h-7 grid-cols-8 rounded-md bg-sand-100/60">
                {r.bars.map((b, bi) => (
                  <motion.div
                    key={bi}
                    className={cn('absolute inset-y-1 flex items-center truncate rounded px-1.5 text-[9.5px]', b.tone)}
                    style={{ left: `${(b.from / 8) * 100}%`, width: `${((b.to - b.from) / 8) * 100}%` }}
                    initial={reduce ? false : { scaleX: 0, originX: 0 }}
                    animate={visible || reduce ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.6, delay: reduce ? 0 : 0.2 + ri * 0.18 + bi * 0.1, ease }}
                  >
                    {b.label}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ProductFrame>
  );
}

// ── Consultant 360 ───────────────────────────────────────────────────────
export function ConsultantMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const skills = ['Python', 'Spark', 'dbt', 'Airflow', 'AWS', 'SQL'];
  return (
    <ProductFrame caption={fr ? 'Données d’exemple' : 'Sample data'}>
      <div className="space-y-3 bg-background p-4 text-[11px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-primary-deep">CM</div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">Camille Martin</div>
            <div className="text-muted-foreground">{fr ? 'Data engineer senior · 8 ans' : 'Senior data engineer · 8 yrs'}</div>
          </div>
          <MockPill tone="success">{fr ? 'En mission' : 'On assignment'}</MockPill>
        </div>
        <div className="flex flex-wrap gap-1">
          {skills.map((s) => (
            <span key={s} className="rounded-md border border-border bg-card px-1.5 py-0.5">
              {s}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            [fr ? 'TJM' : 'Day rate', '720 €'],
            [fr ? 'CJM' : 'Day cost', '495 €'],
            [fr ? 'Marge' : 'Margin', '31 %'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-card p-2">
              <div className="text-muted-foreground">{k}</div>
              <div className="num text-[13px] font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3 w-3" /> Lyon · {fr ? 'disponible le 2 février' : 'available 2 February'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white">
            <FileDown className="h-3 w-3" />
            {fr ? 'Dossier de compétences' : 'Skills dossier'}
          </span>
        </div>
      </div>
    </ProductFrame>
  );
}

// ── Mission ──────────────────────────────────────────────────────────────
export function MissionMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const { ref, visible } = useVisible<HTMLDivElement>();
  const marks = [90, 60, 30, 15];
  return (
    <ProductFrame caption={fr ? 'Données d’exemple' : 'Sample data'}>
      <div ref={ref} className="space-y-3 bg-background p-4 text-[11px]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold">{fr ? 'Refonte SI — Banque Lumen' : 'IS overhaul — Lumen Bank'}</div>
            <div className="text-muted-foreground">Camille Martin · {fr ? '5 janv. → 31 déc.' : '5 Jan → 31 Dec'}</div>
          </div>
          <MockPill tone="success">{fr ? 'En cours' : 'Active'}</MockPill>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-muted-foreground">
            <span>{fr ? 'Jours validés' : 'Approved days'}</span>
            <span className="num">168 / 218</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-2 rounded-full bg-primary" initial={reduce ? false : { width: 0 }} animate={{ width: visible || reduce ? '77%' : 0 }} transition={{ duration: 1, ease }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            [fr ? 'CA réalisé' : 'Realised', '121 k€'],
            [fr ? 'Marge' : 'Margin', '37 k€'],
            [fr ? 'Renouvellement' : 'Renewal', fr ? 'Probable' : 'Likely'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-card p-2">
              <div className="text-muted-foreground">{k}</div>
              <div className="num font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5">
          <div className="mb-2 text-muted-foreground">{fr ? 'Alertes de fin de mission' : 'Mission end alerts'}</div>
          <div className="relative flex justify-between">
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
            {marks.map((m, i) => (
              <motion.span
                key={m}
                className={cn('relative rounded-full border px-1.5 py-px text-[10px]', i < 2 ? 'border-primary/40 bg-brand-50 text-primary-deep' : 'border-border bg-card text-muted-foreground')}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={visible || reduce ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: reduce ? 0 : 0.3 + i * 0.15 }}
              >
                J-{m}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

// ── Portails (téléphone) ─────────────────────────────────────────────────
function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="mx-auto w-full max-w-[260px]">
      <div className="overflow-hidden rounded-[28px] border-[6px] border-sand-900 bg-background shadow-[0_24px_48px_-24px_rgba(25,24,23,0.25)]">
        <div className="mx-auto mt-1.5 h-1.5 w-16 rounded-full bg-sand-900/80" aria-hidden />
        <div className="min-h-[360px] p-3 text-[11px]">{children}</div>
      </div>
      <figcaption className="mt-2 text-center text-[12px] text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export function ClientPortalMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  return (
    <Phone label={fr ? 'Portail client' : 'Client portal'}>
      <div className="mb-3 text-[13px] font-semibold">{fr ? 'Bonjour, Banque Lumen' : 'Hello, Lumen Bank'}</div>
      <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{fr ? 'À traiter' : 'To do'}</div>
      <div className="space-y-1.5">
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="font-medium">{fr ? 'CRA de septembre à approuver' : 'September timesheet to approve'}</div>
          <div className="text-muted-foreground">Camille Martin · 21 j</div>
          <div className="mt-2 flex gap-1.5">
            <span className="flex-1 rounded-md bg-primary py-1 text-center text-[10px] font-medium text-white">{fr ? 'Approuver' : 'Approve'}</span>
            <span className="flex-1 rounded-md border border-border py-1 text-center text-[10px]">{fr ? 'Corriger' : 'Request fix'}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="font-medium">{fr ? 'Devis DEV-2026-0042' : 'Quote DEV-2026-0042'}</div>
          <div className="text-muted-foreground">{fr ? '18 400 € HT · valable 30 jours' : '€18,400 · valid 30 days'}</div>
        </div>
      </div>
      <div className="mb-2 mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{fr ? 'Missions en cours' : 'Ongoing missions'}</div>
      <div className="rounded-lg border border-border bg-card p-2">
        <div className="font-medium">{fr ? 'Refonte SI' : 'IS overhaul'}</div>
        <div className="text-muted-foreground">Camille Martin</div>
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-primary/40 bg-brand-50 p-2 text-center text-primary-deep">{fr ? 'Exprimer un besoin' : 'Submit a need'}</div>
    </Phone>
  );
}

export function ConsultantPortalMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const days = Array.from({ length: 20 }, (_, i) => i);
  const remote = new Set([1, 3, 6, 8, 11, 13, 16, 18]);
  const off = new Set([9]);
  return (
    <Phone label={fr ? 'Portail consultant' : 'Consultant portal'}>
      <div className="mb-1 text-[13px] font-semibold">{fr ? 'CRA de septembre' : 'September timesheet'}</div>
      <div className="mb-3 text-muted-foreground">{fr ? 'Refonte SI · Banque Lumen' : 'IS overhaul · Lumen Bank'}</div>
      <div className="grid grid-cols-5 gap-1">
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              'flex aspect-square items-center justify-center rounded-md border text-[10px]',
              off.has(d) ? 'border-sand-300 bg-sand-100 text-muted-foreground' : 'border-brand-200 bg-brand-50 text-primary-deep',
            )}
          >
            {remote.has(d) ? <Home className="h-3 w-3" /> : d + 1}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-muted-foreground">
        <span>{fr ? '19 j travaillés' : '19 days worked'}</span>
        <span>{fr ? 'dont 8 en télétravail' : '8 remote'}</span>
      </div>
      <div className="mt-3 rounded-md bg-primary py-1.5 text-center text-[11px] font-medium text-white">{fr ? 'Soumettre mon CRA' : 'Submit timesheet'}</div>
    </Phone>
  );
}

// ── Automatisations ──────────────────────────────────────────────────────
export function AutomationsMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const { ref, visible } = useVisible<HTMLDivElement>();
  const active = useTicker(4, 1600, visible);
  const rules = fr
    ? ['Fin de mission à J-90, 60, 30, 15', 'CRA du mois non transmis', 'Opportunité sans activité', 'Devis bientôt expiré']
    : ['Mission ends in 90, 60, 30, 15 days', 'Monthly timesheet missing', 'Stale opportunity', 'Quote expiring'];
  return (
    <ProductFrame caption={fr ? 'Données d’exemple' : 'Sample data'}>
      <div ref={ref} className="space-y-1.5 bg-background p-3 text-[11px]">
        {rules.map((r, i) => (
          <div key={r} className={cn('flex items-center gap-2 rounded-lg border bg-card p-2 transition-colors duration-500', active === i ? 'border-primary/40 bg-brand-50/60' : 'border-border')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', active === i ? 'bg-primary' : 'bg-sand-300')} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{r}</span>
            <span className="relative h-4 w-7 rounded-full bg-primary" aria-hidden>
              <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white" />
            </span>
          </div>
        ))}
      </div>
    </ProductFrame>
  );
}

// ── Analytics ────────────────────────────────────────────────────────────
export function AnalyticsMockup({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const { ref, visible } = useVisible<HTMLDivElement>();
  const path = 'M0 52 L20 46 L40 48 L60 38 L80 34 L100 30 L120 26 L140 28 L160 20 L180 16 L200 14';
  return (
    <ProductFrame caption={fr ? 'Données d’exemple' : 'Sample data'}>
      <div ref={ref} className="grid gap-2 bg-background p-3 text-[11px] sm:grid-cols-3">
        {[
          [fr ? 'Transformation' : 'Win rate', '38 %'],
          [fr ? 'Devis acceptés' : 'Quotes accepted', '62 %'],
          [fr ? 'CRA à l’heure' : 'On-time timesheets', '91 %'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-card p-2">
            <div className="text-muted-foreground">{k}</div>
            <div className="num text-[14px] font-semibold">{v}</div>
          </div>
        ))}
        <div className="rounded-lg border border-border bg-card p-2 sm:col-span-3">
          <div className="mb-1 flex items-center gap-1 text-muted-foreground">
            <Sparkles className="h-3 w-3" /> {fr ? 'Occupation sur 12 mois' : 'Utilisation, 12 months'}
          </div>
          <svg viewBox="0 0 200 60" className="h-20 w-full" aria-hidden>
            <motion.path
              d={path}
              fill="none"
              stroke="#C65F46"
              strokeWidth="2"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: visible || reduce ? 1 : 0 }}
              transition={{ duration: 1.4, ease }}
            />
          </svg>
        </div>
      </div>
    </ProductFrame>
  );
}
