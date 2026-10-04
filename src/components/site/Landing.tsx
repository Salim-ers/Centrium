'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Globe2,
  KeyRound,
  Lock,
  Mail,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { FadeIn } from './Motion';
import { DashboardMockup } from './mockups/DashboardMockup';
import {
  AnalyticsMockup,
  AutomationsMockup,
  ClientPortalMockup,
  ConsultantMockup,
  ConsultantPortalMockup,
  MissionMockup,
  PipelineMockup,
  StaffingMockup,
} from './mockups/ModuleMockups';
import { JourneyScroll } from './JourneyScroll';
import { PricingCards } from './PricingCards';
import { Faq } from './Faq';
import { cn } from '@/lib/utils';

type Lang = 'fr' | 'en';
type L = { fr: string; en: string };

function SectionTitle({ kicker, title, sub, lang, center = false }: { kicker: L; title: L; sub?: L; lang: Lang; center?: boolean }) {
  return (
    <FadeIn className={cn('mb-10 max-w-2xl', center && 'mx-auto text-center')}>
      <div className="text-[13px] font-medium text-primary-deep">{kicker[lang]}</div>
      <h2 className="mt-2 font-display text-[clamp(1.75rem,3.4vw,2.6rem)] font-semibold leading-[1.1] tracking-tight">{title[lang]}</h2>
      {sub && <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{sub[lang]}</p>}
    </FadeIn>
  );
}

function PrimaryCta({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <Link href="/essai" className={cn('inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-white transition-colors hover:bg-primary-deep focus-visible:outline-none focus-visible:shadow-focus', className)}>
      {lang === 'fr' ? 'Essayer Centrium' : 'Try Centrium'}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
function SecondaryCta({ lang }: { lang: Lang }) {
  return (
    <Link href="/demo" className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-[15px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:shadow-focus">
      {lang === 'fr' ? 'Voir la démo' : 'See the demo'}
    </Link>
  );
}

// ── Hero + preuve produit ────────────────────────────────────────────────
function Hero({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : -24]);
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-sand-100 to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 md:pt-20">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[13px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {fr ? 'Le cockpit de gestion des ESN et cabinets de conseil' : 'The operating cockpit for IT services and consulting firms'}
          </div>
          <h1 className="mt-6 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1.02] tracking-tight">
            {fr ? 'Pilotez votre ESN.' : 'Run your firm.'}
            <span className="block text-primary">{fr ? 'Pas vos tableurs.' : 'Not your spreadsheets.'}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            {fr
              ? 'CRM, staffing, consultants, missions, CRA et rentabilité réunis dans un seul espace.'
              : 'CRM, staffing, consultants, missions, timesheets and profitability in one place.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta lang={lang} />
            <SecondaryCta lang={lang} />
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">
            {fr ? 'Essai de 7 jours · Données hébergées dans l’Union européenne · Résiliable en ligne' : '7-day trial · Data hosted in the European Union · Cancel online'}
          </p>
        </FadeIn>
        <motion.div style={{ y }} className="mx-auto mt-12 max-w-5xl">
          <FadeIn delay={0.15} y={24}>
            <DashboardMockup lang={lang} />
          </FadeIn>
        </motion.div>
      </div>
    </section>
  );
}

// ── Problème : multiplication des outils ─────────────────────────────────
function Problem({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const tools = [
    { icon: FileSpreadsheet, label: fr ? 'Le staffing dans un tableur' : 'Staffing in a spreadsheet' },
    { icon: Target, label: fr ? 'Un CRM qui ne connaît pas vos consultants' : 'A CRM that doesn’t know your consultants' },
    { icon: Mail, label: fr ? 'Des CRA qui arrivent par email' : 'Timesheets arriving by email' },
    { icon: FileText, label: fr ? 'Des devis et contrats dans des dossiers partagés' : 'Quotes and contracts in shared folders' },
    { icon: BarChart3, label: fr ? 'Une marge calculée en fin de trimestre' : 'Margin computed at quarter end' },
  ];
  return (
    <section className="border-y border-border bg-sand-100/50 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionTitle
            lang={lang}
            kicker={{ fr: 'Le problème', en: 'The problem' }}
            title={{ fr: 'Cinq outils pour suivre une seule mission.', en: 'Five tools to follow a single mission.' }}
            sub={{
              fr: 'Chaque information est saisie deux fois, la disponibilité des consultants vit dans la tête des commerciaux, et la rentabilité arrive trop tard pour décider.',
              en: 'Every piece of information is typed twice, availability lives in salespeople’s heads, and profitability arrives too late to act on.',
            }}
          />
        </div>
        <ul className="space-y-2.5">
          {tools.map((t, i) => (
            <FadeIn key={t.label} as="li" delay={i * 0.07} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-[15px]">
              <t.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">{t.label}</span>
              <span className="text-[12px] text-muted-foreground line-through decoration-primary/60">{fr ? 'avant' : 'before'}</span>
            </FadeIn>
          ))}
          <FadeIn as="li" delay={0.4} className="flex items-center gap-3 rounded-xl border border-primary/40 bg-brand-50 px-4 py-3 text-[15px] font-medium text-primary-deep">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {fr ? 'Un seul espace, une seule source de vérité : Centrium' : 'One space, one source of truth: Centrium'}
          </FadeIn>
        </ul>
      </div>
    </section>
  );
}

// ── Présentation ─────────────────────────────────────────────────────────
function Overview({ lang }: { lang: Lang }) {
  const pillars = [
    { icon: Target, title: { fr: 'Commercial', en: 'Sales' }, items: { fr: 'CRM, clients, opportunités, devis', en: 'CRM, clients, opportunities, quotes' } },
    { icon: Users, title: { fr: 'Ressources', en: 'Resources' }, items: { fr: 'Consultants, staffing, missions', en: 'Consultants, staffing, missions' } },
    { icon: ClipboardCheck, title: { fr: 'Opérations', en: 'Operations' }, items: { fr: 'CRA, documents, préfacturation', en: 'Timesheets, documents, pre-invoicing' } },
    { icon: BarChart3, title: { fr: 'Pilotage', en: 'Steering' }, items: { fr: 'Dashboard, analytics, rentabilité', en: 'Dashboard, analytics, profitability' } },
  ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          lang={lang}
          center
          kicker={{ fr: 'Centrium', en: 'Centrium' }}
          title={{ fr: 'De l’opportunité à la marge, au même endroit.', en: 'From opportunity to margin, in one place.' }}
          sub={{
            fr: 'Une seule base pour vos clients, vos consultants et vos missions. Chaque équipe travaille sur les mêmes données, avec les droits qui correspondent à son rôle.',
            en: 'One base for clients, consultants and missions. Every team works on the same data, with permissions matching their role.',
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <FadeIn key={p.title.fr} delay={i * 0.08} className="group rounded-2xl border border-border bg-card p-5 transition-shadow duration-300 hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-primary-deep transition-transform duration-300 group-hover:-translate-y-0.5">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold">{p.title[lang]}</h3>
              <p className="mt-1 text-[14px] text-muted-foreground">{p.items[lang]}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Modules ──────────────────────────────────────────────────────────────
type Feature = { id: string; kicker: L; title: L; text: L; bullets: { fr: string[]; en: string[] }; visual: (lang: Lang) => React.ReactNode };

function TodayVisual({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const items = [
    { icon: ClipboardCheck, t: fr ? '3 CRA attendent votre validation' : '3 timesheets awaiting approval', a: fr ? 'Valider' : 'Approve' },
    { icon: CalendarClock, t: fr ? '2 missions se terminent dans moins de 30 jours' : '2 missions end within 30 days', a: fr ? 'Ouvrir' : 'Open' },
    { icon: UserCheck, t: fr ? '4 consultants seront bientôt disponibles' : '4 consultants available soon', a: fr ? 'Positionner' : 'Staff' },
    { icon: Briefcase, t: fr ? 'Une opportunité sans activité depuis 15 jours' : 'An opportunity idle for 15 days', a: fr ? 'Relancer' : 'Follow up' },
    { icon: FileText, t: fr ? 'Un devis expire dans 3 jours' : 'A quote expires in 3 days', a: fr ? 'Voir' : 'View' },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 text-[14px] font-semibold">{fr ? 'À traiter aujourd’hui' : 'To do today'}</div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <FadeIn key={it.t} as="li" delay={i * 0.08} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-[13.5px]">
            <it.icon className="h-4 w-4 shrink-0 text-primary-deep" />
            <span className="flex-1">{it.t}</span>
            <span className="text-[12.5px] font-medium text-primary-deep">{it.a} →</span>
          </FadeIn>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">{fr ? 'Données d’exemple' : 'Sample data'}</p>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    id: 'dashboard',
    kicker: { fr: 'Dashboard', en: 'Dashboard' },
    title: { fr: 'Comprendre la situation en cinq secondes.', en: 'Understand where you stand in five seconds.' },
    text: { fr: 'CA signé et prévisionnel, marge, occupation, intercontrats, pipeline pondéré, CRA en attente. Et surtout : ce qui demande votre attention aujourd’hui, en un clic de l’action.', en: 'Signed and forecast revenue, margin, utilisation, bench, weighted pipeline, pending timesheets. Above all: what needs you today, one click from the action.' },
    bullets: { fr: ['Indicateurs calculés depuis vos missions et CRA', 'Alertes cliquables vers l’action', 'Graphiques CA, marge, pipeline, occupation'], en: ['Metrics computed from missions and timesheets', 'Clickable alerts that lead to the action', 'Revenue, margin, pipeline and utilisation charts'] },
    visual: (lang) => <TodayVisual lang={lang} />,
  },
  {
    id: 'crm',
    kicker: { fr: 'CRM', en: 'CRM' },
    title: { fr: 'Un pipeline pensé pour les ESN.', en: 'A pipeline built for consulting firms.' },
    text: { fr: 'De Prospect à Gagné en glisser-déposer. Chaque opportunité porte le TJM cible, les compétences, la date de début, les consultants proposés et la prochaine action.', en: 'From Prospect to Won by drag and drop. Each opportunity carries the target rate, skills, start date, proposed consultants and next action.' },
    bullets: { fr: ['Sept étapes, probabilité et montant pondéré', 'Tâches de relance créées automatiquement', 'Fiche client 360 : contacts, missions, CA, devis'], en: ['Seven stages, probability and weighted amount', 'Follow-up tasks created automatically', 'Client 360: contacts, missions, revenue, quotes'] },
    visual: (lang) => <PipelineMockup lang={lang} />,
  },
  {
    id: 'staffing',
    kicker: { fr: 'Staffing', en: 'Staffing' },
    title: { fr: 'Qui est en mission, qui se libère, qui proposer.', en: 'Who is staffed, who frees up, who to propose.' },
    text: { fr: 'Le planning montre missions, congés, intercontrats et positionnements. Le matching classe les consultants pour chaque opportunité et explique chaque score.', en: 'The planner shows missions, leave, bench and proposals. Matching ranks consultants for each opportunity and explains every score.' },
    bullets: { fr: ['Filtres par manager, compétence, client, disponibilité', 'Score détaillé : compétences, disponibilité, TJM, lieu', 'Aucune compétence inventée : seules celles de la fiche comptent'], en: ['Filters by manager, skill, client, availability', 'Detailed score: skills, availability, rate, location', 'No invented skill: only those on the profile count'] },
    visual: (lang) => <StaffingMockup lang={lang} />,
  },
  {
    id: 'consultants',
    kicker: { fr: 'Consultants', en: 'Consultants' },
    title: { fr: 'Une fiche 360 par consultant.', en: 'A 360° profile for every consultant.' },
    text: { fr: 'Compétences, certifications, disponibilité, TJM, CJM et marge cible, missions, CRA et documents. Le dossier de compétences se génère depuis la fiche, en PDF ou DOCX.', en: 'Skills, certifications, availability, rate, cost and target margin, missions, timesheets and documents. The skills dossier is generated from the profile, as PDF or DOCX.' },
    bullets: { fr: ['Données financières visibles selon les droits', 'Dossier standard, dense, executive ou adapté à une opportunité', 'Import des consultants par fichier CSV'], en: ['Financial data visible according to permissions', 'Standard, dense, executive or opportunity-specific dossier', 'Consultant import from CSV'] },
    visual: (lang) => <ConsultantMockup lang={lang} />,
  },
  {
    id: 'missions',
    kicker: { fr: 'Missions', en: 'Missions' },
    title: { fr: 'Chaque mission, de la signature au renouvellement.', en: 'Every mission, from signature to renewal.' },
    text: { fr: 'Jours prévus et validés, CA réalisé, marge, contrats et documents. Alertes à 90, 60, 30 et 15 jours de la fin pour préparer le renouvellement ou le prochain staffing.', en: 'Planned and approved days, realised revenue, margin, contracts and documents. Alerts 90, 60, 30 and 15 days before the end to prepare renewal or next staffing.' },
    bullets: { fr: ['Statut de renouvellement suivi', 'CRA et préfactures rattachés', 'Responsable de mission alerté'], en: ['Renewal status tracked', 'Timesheets and pre-invoices attached', 'Mission owner alerted'] },
    visual: (lang) => <MissionMockup lang={lang} />,
  },
];

function FeatureRow({ f, i, lang }: { f: Feature; i: number; lang: Lang }) {
  const reverse = i % 2 === 1;
  return (
    <div className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-16">
      <FadeIn className={cn(reverse && 'lg:order-2')}>
        <div className="text-[13px] font-medium text-primary-deep">{f.kicker[lang]}</div>
        <h3 className="mt-2 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-tight">{f.title[lang]}</h3>
        <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{f.text[lang]}</p>
        <ul className="mt-5 space-y-2 text-[15px]">
          {f.bullets[lang].map((b) => (
            <li key={b} className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      </FadeIn>
      <FadeIn delay={0.1} className={cn(reverse && 'lg:order-1')}>
        {f.visual(lang)}
      </FadeIn>
    </div>
  );
}

function Portals({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  return (
    <section className="border-y border-border bg-sand-100/50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          lang={lang}
          center
          kicker={{ fr: 'Portails client et consultant', en: 'Client and consultant portals' }}
          title={{ fr: 'Vos clients et vos consultants, enfin dans la boucle.', en: 'Your clients and consultants, finally in the loop.' }}
          sub={{
            fr: 'Deux espaces sécurisés, pensés pour le téléphone, sans licence supplémentaire. Chacun ne voit que ce qui le concerne.',
            en: 'Two secure spaces, designed for phones, at no extra licence. Everyone sees only what concerns them.',
          }}
        />
        <div className="grid gap-10 md:grid-cols-2">
          <FadeIn className="space-y-5">
            <ClientPortalMockup lang={lang} />
            <ul className="mx-auto max-w-sm space-y-1.5 text-[14.5px] text-muted-foreground">
              <li>{fr ? '· Missions et consultants affectés' : '· Missions and assigned consultants'}</li>
              <li>{fr ? '· CRA à approuver, devis à accepter' : '· Timesheets to approve, quotes to accept'}</li>
              <li>{fr ? '· Un besoin exprimé devient une opportunité dans votre CRM' : '· A submitted need becomes an opportunity in your CRM'}</li>
              <li>{fr ? '· Uniquement les données de sa société' : '· Only their company’s data'}</li>
            </ul>
          </FadeIn>
          <FadeIn delay={0.1} className="space-y-5">
            <ConsultantPortalMockup lang={lang} />
            <ul className="mx-auto max-w-sm space-y-1.5 text-[14.5px] text-muted-foreground">
              <li>{fr ? '· CRA mensuel : jours, télétravail, absences' : '· Monthly timesheet: days, remote work, absences'}</li>
              <li>{fr ? '· Missions, contrats et documents partagés' : '· Missions, contracts and shared documents'}</li>
              <li>{fr ? '· Aucune donnée de marge ni TJM de vente' : '· No margin or sale rate visible'}</li>
            </ul>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function AutomationAnalytics({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  return (
    <div className="grid gap-12 py-14 lg:grid-cols-2">
      <FadeIn>
        <div className="text-[13px] font-medium text-primary-deep">{fr ? 'Automatisations' : 'Automations'}</div>
        <h3 className="mt-2 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-tight">{fr ? 'Les relances partent toutes seules.' : 'Follow-ups go out on their own.'}</h3>
        <p className="mb-6 mt-3 text-[16px] leading-relaxed text-muted-foreground">
          {fr ? 'Fins de mission, CRA manquants, opportunités sans activité, devis qui expirent : chaque règle s’active ou se coupe en un clic.' : 'Mission endings, missing timesheets, idle opportunities, expiring quotes: each rule switches on or off in one click.'}
        </p>
        <AutomationsMockup lang={lang} />
      </FadeIn>
      <FadeIn delay={0.1}>
        <div className="text-[13px] font-medium text-primary-deep">Analytics</div>
        <h3 className="mt-2 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-tight">{fr ? 'Des chiffres que vous n’avez pas à recompter.' : 'Numbers you don’t have to recount.'}</h3>
        <p className="mb-6 mt-3 text-[16px] leading-relaxed text-muted-foreground">
          {fr ? 'Transformation commerciale, acceptation des devis, ponctualité des CRA, occupation et CA par consultant, sur douze mois glissants.' : 'Win rate, quote acceptance, timesheet punctuality, utilisation and revenue per consultant, over a rolling twelve months.'}
        </p>
        <AnalyticsMockup lang={lang} />
      </FadeIn>
    </div>
  );
}

function Assistant({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  return (
    <FadeIn className="mx-auto my-6 flex max-w-4xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary-deep">
        <Sparkles className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-[17px] font-semibold">{fr ? 'Une assistance discrète, jamais d’invention.' : 'Discreet assistance, never invention.'}</h3>
        <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">
          {fr
            ? 'L’assistant répond à partir des seules données auxquelles vous avez accès (« qui est disponible en Java ? »). Les dossiers de compétences reformulent sans ajouter d’expérience, de compétence ni de certification.'
            : 'The assistant answers only from data you can access (“who is available in Java?”). Skills dossiers rephrase without adding experience, skills or certifications.'}
        </p>
      </div>
    </FadeIn>
  );
}

// ── Sécurité ─────────────────────────────────────────────────────────────
function Security({ lang }: { lang: Lang }) {
  const fr = lang === 'fr';
  const items = [
    { icon: Lock, t: fr ? 'Organisations isolées' : 'Isolated organisations', d: fr ? 'Cloisonnement par la base de données (RLS) sur les tables métier, vérifié par des tests automatisés.' : 'Database-level isolation (RLS) on business tables, checked by automated tests.' },
    { icon: KeyRound, t: fr ? 'Droits vérifiés côté serveur' : 'Server-side permissions', d: fr ? 'Chaque rôle est contrôlé par l’API et la base, pas seulement masqué à l’écran.' : 'Every role is enforced by the API and the database, not just hidden on screen.' },
    { icon: Globe2, t: fr ? 'Hébergé dans l’UE' : 'Hosted in the EU', d: fr ? 'Base de données, fichiers et serveurs applicatifs en Suède.' : 'Database, files and application servers in Sweden.' },
    { icon: ScrollText, t: fr ? 'Documents privés' : 'Private documents', d: fr ? 'Stockage privé, liens de téléchargement valables 60 secondes, type et taille des fichiers contrôlés.' : 'Private storage, download links valid for 60 seconds, file type and size checked.' },
  ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          lang={lang}
          kicker={{ fr: 'Sécurité', en: 'Security' }}
          title={{ fr: 'Les protections réellement en place.', en: 'The protections actually in place.' }}
          sub={{ fr: 'Nous ne listons que ce qui est déployé et vérifiable.', en: 'We only list what is deployed and verifiable.' }}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <FadeIn key={it.t} delay={i * 0.06} className="rounded-2xl border border-border bg-card p-5">
              <it.icon className="h-5 w-5 text-primary-deep" />
              <h3 className="mt-3 text-[15.5px] font-semibold">{it.t}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{it.d}</p>
            </FadeIn>
          ))}
        </div>
        <Link href="/security" className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-deep hover:underline">
          {fr ? 'Tout le détail sécurité' : 'Full security details'} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

const FAQ: { fr: Array<{ q: string; a: string }>; en: Array<{ q: string; a: string }> } = {
  fr: [
    { q: 'Les utilisateurs des portails sont-ils facturés ?', a: 'Non. Les comptes client et consultant ne comptent pas comme licences : seuls les membres internes (dirigeants, commerciaux, recruteurs, finance) sont décomptés.' },
    { q: 'Centrium émet-il les factures électroniques réglementaires ?', a: 'Non. Centrium prépare la préfacturation à partir des CRA validés et l’exporte vers votre outil comptable ou une plateforme agréée. Il ne transmet pas de facture à l’administration.' },
    { q: 'Où sont hébergées nos données ?', a: 'Dans l’Union européenne : la base de données, les fichiers et les serveurs applicatifs sont situés en Suède.' },
    { q: 'Comment démarrer ?', a: 'Créez votre espace, importez vos consultants par fichier CSV et invitez votre équipe. L’essai dure 7 jours ; vous pouvez aussi demander une démo.' },
    { q: 'L’IA peut-elle inventer des compétences ?', a: 'Non. Le matching et les dossiers de compétences s’appuient uniquement sur les informations de la fiche consultant : aucune expérience, compétence ou certification n’est ajoutée.' },
    { q: 'Puis-je résilier à tout moment ?', a: 'Oui, depuis la page Abonnement. L’accès reste ouvert jusqu’à la fin de la période payée.' },
  ],
  en: [
    { q: 'Are portal users billed?', a: 'No. Client and consultant accounts are not licences: only internal members (leadership, sales, recruiters, finance) count.' },
    { q: 'Does Centrium issue regulatory e-invoices?', a: 'No. Centrium prepares pre-invoicing from approved timesheets and exports it to your accounting tool or an approved platform. It does not transmit invoices to the tax authorities.' },
    { q: 'Where is our data hosted?', a: 'In the European Union: database, files and application servers are located in Sweden.' },
    { q: 'How do we get started?', a: 'Create your space, import consultants from a CSV file and invite your team. The trial lasts 7 days; you can also book a demo.' },
    { q: 'Can the AI invent skills?', a: 'No. Matching and skills dossiers rely only on the consultant profile: no experience, skill or certification is added.' },
    { q: 'Can we cancel anytime?', a: 'Yes, from the Subscription page. Access stays open until the end of the paid period.' },
  ],
};

export function Landing() {
  const { locale } = useLocale();
  const lang: Lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  return (
    <main>
      <Hero lang={lang} />
      <Problem lang={lang} />
      <Overview lang={lang} />

      <section id="parcours" className="scroll-mt-20 border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle
            lang={lang}
            kicker={{ fr: 'Le parcours', en: 'The journey' }}
            title={{ fr: 'Du besoin client à la rentabilité, sans ressaisie.', en: 'From client need to profitability, without re-keying.' }}
          />
          <JourneyScroll lang={lang} />
        </div>
      </section>

      <section id="produit" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-6xl divide-y divide-border px-4 sm:px-6">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.id} f={f} i={i} lang={lang} />
          ))}
        </div>
      </section>

      <Portals lang={lang} />

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <AutomationAnalytics lang={lang} />
        <Assistant lang={lang} />
      </section>

      <Security lang={lang} />

      <section className="border-t border-border bg-sand-100/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle
            lang={lang}
            center
            kicker={{ fr: 'Tarifs', en: 'Pricing' }}
            title={{ fr: 'Des prix affichés, des offres simples.', en: 'Published prices, simple plans.' }}
            sub={{ fr: 'Tous les modules dans chaque offre. Seul le nombre de managers et de consultants change.', en: 'Every module in every plan. Only the number of managers and consultants changes.' }}
          />
          <PricingCards lang={lang} />
          <div className="mt-6 text-center">
            <Link href="/tarifs" className="text-[15px] font-medium text-primary-deep hover:underline">
              {fr ? 'Comparer les offres en détail' : 'Compare plans in detail'}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionTitle lang={lang} center kicker={{ fr: 'Questions fréquentes', en: 'FAQ' }} title={{ fr: 'Ce que l’on nous demande souvent.', en: 'What people often ask.' }} />
          <Faq items={FAQ[lang]} />
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <FadeIn className="mx-auto max-w-5xl rounded-3xl bg-sand-900 px-6 py-14 text-center text-white sm:px-12">
          <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.8rem)] font-semibold leading-tight tracking-tight">{fr ? 'Votre ESN mérite mieux qu’un tableur.' : 'Your firm deserves better than a spreadsheet.'}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[16px] text-white/75">{fr ? 'Essayez Centrium 7 jours, ou voyons ensemble comment il s’adapte à votre organisation.' : 'Try Centrium for 7 days, or let’s see together how it fits your organisation.'}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta lang={lang} />
            <Link href="/demo" className="inline-flex h-11 items-center rounded-lg border border-white/25 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/10">
              {fr ? 'Voir la démo' : 'See the demo'}
            </Link>
          </div>
        </FadeIn>
      </section>
    </main>
  );
}
