import { describe, it, expect } from 'vitest';

import type { JobOffer } from '@/types';
import {
  tidy,
  tidyInline,
  buildPosterModel,
  computeFitPlan,
  estimateLoad,
} from '@/lib/offers/poster-model';

// Factory : JobOffer complet avec défauts neutres, surchargeable.
function makeOffer(p: Partial<JobOffer> = {}): JobOffer {
  return {
    id: 'o1',
    organization_id: 'org1',
    company_id: null,
    contact_id: null,
    owner_id: null,
    title: 'Chargé(e) de Tests H/F',
    description: null,
    required_skills: ['JIRA', 'SQL'],
    nice_to_have: [],
    seniority: null,
    daily_rate_min: null,
    daily_rate_max: null,
    location: null,
    remote_days: null,
    start_date: null,
    duration_months: null,
    deadline: null,
    status: 'open',
    source_kind: null,
    source: null,
    context: null,
    mission_purpose: null,
    tasks: [],
    tech_stack: [],
    profile_requirements: [],
    working_conditions: [],
    contract_kind: null,
    show_rate: null,
    work_mode: null,
    work_mode_detail: null,
    start_type: null,
    start_label: null,
    experience_label: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...p,
  };
}

const capsOf = (o: JobOffer) => computeFitPlan(o).caps;

describe('tidy — normalisation typographique sûre', () => {
  it('effondre les espaces multiples et retire l’espace avant ponctuation', () => {
    expect(tidy('Paris   ,  Lyon  ;  Lille')).toBe('Paris, Lyon; Lille');
  });
  it('ne casse ni décimales, ni slashs, ni plages', () => {
    expect(tidy('1.5 j — JIRA/XRAY — 450-550 €')).toBe('1.5 j — JIRA/XRAY — 450-550 €');
  });
  it('tidyInline aplatit les retours à la ligne', () => {
    expect(tidyInline('Chargé de\nTests')).toBe('Chargé de Tests');
  });
  it('gère null/undefined', () => {
    expect(tidy(null)).toBe('');
    expect(tidy(undefined)).toBe('');
  });
});

describe('TJM — masqué par défaut, opt-in par fiche', () => {
  it('aucune mention du TJM quand show_rate est absent (défaut)', () => {
    const o = makeOffer({ daily_rate_min: 450, daily_rate_max: 550 });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.rateText).toBeNull();
    expect(m.conditions.join(' ')).not.toMatch(/TJM/);
  });
  it('aucune mention du TJM quand show_rate=false explicitement', () => {
    const o = makeOffer({ show_rate: false, daily_rate_min: 450, daily_rate_max: 550 });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.rateText).toBeNull();
  });
  it('affiche une fourchette quand show_rate=true', () => {
    const o = makeOffer({ show_rate: true, daily_rate_min: 450, daily_rate_max: 550 });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.rateText).toBe('TJM : 450 – 550 € HT / jour');
  });
  it('affiche une valeur unique quand min=max', () => {
    const o = makeOffer({ show_rate: true, daily_rate_min: 500, daily_rate_max: 500 });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.rateText).toBe('TJM : 500 € HT / jour');
  });
  it('pas de TJM si show_rate=true mais aucune valeur (jamais « non communiqué »)', () => {
    const o = makeOffer({ show_rate: true });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.rateText).toBeNull();
  });
});

describe('Mode de travail — sélectionnable sans nombre de jours', () => {
  it('work_mode=hybrid → « Hybride » sans jours inventés', () => {
    const o = makeOffer({ work_mode: 'hybrid' });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    const cell = m.banner.find((c) => c.label === 'MODE DE TRAVAIL');
    expect(cell?.value).toBe('Hybride');
  });
  it('custom → détail libre', () => {
    const o = makeOffer({ work_mode: 'custom', work_mode_detail: '2j télétravail / sem.' });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    const cell = m.banner.find((c) => c.label === 'MODE DE TRAVAIL');
    expect(cell?.value).toBe('2j télétravail / sem.');
  });
  it('legacy : dérive de remote_days quand work_mode absent', () => {
    const o = makeOffer({ remote_days: 2 });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner.find((c) => c.label === 'MODE DE TRAVAIL')?.value).toBe('Hybride');
  });
  it('aucune cellule mode si rien de renseigné', () => {
    const o = makeOffer();
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner.find((c) => c.label === 'MODE DE TRAVAIL')).toBeUndefined();
  });
});

describe('Démarrage — flexible, jamais inventé', () => {
  it('start_type=asap → « ASAP »', () => {
    const o = makeOffer({ start_type: 'asap' });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner.find((c) => c.label === 'DÉMARRAGE')?.value).toBe('ASAP');
  });
  it('aucune date inventée quand rien n’est renseigné (cellule masquée)', () => {
    const o = makeOffer();
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner.find((c) => c.label === 'DÉMARRAGE')).toBeUndefined();
  });
  it('legacy : date réelle affichée', () => {
    const o = makeOffer({ start_date: '2026-08-03' });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner.find((c) => c.label === 'DÉMARRAGE')?.value).toMatch(/2026/);
  });
});

describe('Expérience — libellé libre prioritaire, pas d’années inventées', () => {
  it('experience_label prioritaire', () => {
    const o = makeOffer({ experience_label: '6–9 ans', seniority: 'junior' });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner.find((c) => c.label === 'EXPÉRIENCE')?.value).toBe('6–9 ans');
  });
  it('fallback = mot de séniorité (pas de fourchette inventée)', () => {
    const o = makeOffer({ seniority: 'senior' });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner.find((c) => c.label === 'EXPÉRIENCE')?.value).toBe('Senior');
  });
});

describe('Bandeau dynamique — pas de bloc vide', () => {
  it('seules les infos présentes → aucune valeur « — »', () => {
    const o = makeOffer({ location: 'Paris', work_mode: 'hybrid' });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.banner).toHaveLength(2);
    expect(m.banner.every((c) => c.value && c.value !== '—')).toBe(true);
  });
});

describe('Meta hero — pas de F/H (évite collision) ni redondance', () => {
  it('type • lieu • mode • durée sans genre', () => {
    const o = makeOffer({
      contract_kind: 'Freelance',
      location: 'Paris',
      work_mode: 'hybrid',
      duration_months: 6,
    });
    const m = buildPosterModel(o, 'fr', capsOf(o));
    expect(m.metaLine).toBe('Freelance  •  Paris  •  Hybride  •  6 mois');
    expect(m.metaLine).not.toMatch(/F\/H/);
  });
});

describe('Plan de densité — garantie 1 page (pré-rendu)', () => {
  it('estimateLoad croît avec le contenu', () => {
    const light = makeOffer({ tasks: ['a'] });
    const heavy = makeOffer({
      context: 'x'.repeat(600),
      tasks: Array.from({ length: 8 }, (_, i) => `mission ${i}`),
      profile_requirements: Array.from({ length: 8 }, (_, i) => `crit ${i}`),
      working_conditions: ['a', 'b', 'c', 'd', 'e'],
      tech_stack: Array.from({ length: 10 }, (_, i) => `t${i}`),
    });
    expect(estimateLoad(heavy)).toBeGreaterThan(estimateLoad(light));
  });
  it('contenu très lourd → palier dense (3)', () => {
    const heavy = makeOffer({
      context: 'x'.repeat(900),
      mission_purpose: 'y'.repeat(400),
      tasks: Array.from({ length: 12 }, (_, i) => `mission longue numéro ${i}`),
      profile_requirements: Array.from({ length: 12 }, (_, i) => `critère ${i}`),
      working_conditions: ['a', 'b', 'c', 'd', 'e', 'f'],
      tech_stack: Array.from({ length: 14 }, (_, i) => `tech${i}`),
    });
    expect(computeFitPlan(heavy).tier).toBe(3);
  });
  it('les plafonds bornent réellement le nombre d’items', () => {
    const heavy = makeOffer({
      tasks: Array.from({ length: 20 }, (_, i) => `t${i}`),
      profile_requirements: Array.from({ length: 20 }, (_, i) => `p${i}`),
      tech_stack: Array.from({ length: 20 }, (_, i) => `x${i}`),
    });
    const plan = computeFitPlan(heavy);
    const m = buildPosterModel(heavy, 'fr', plan.caps);
    expect(m.missions.length).toBeLessThanOrEqual(plan.caps.maxMissions);
    expect(m.profile.length).toBeLessThanOrEqual(plan.caps.maxProfile);
    expect(m.tech.length).toBeLessThanOrEqual(plan.caps.maxTech);
  });
  it('titre long → police réduite, 2 lignes max côté rendu', () => {
    const short = computeFitPlan(makeOffer({ title: 'Dev' }));
    const long = computeFitPlan(
      makeOffer({ title: 'Chargé(e) de Tests Fonctionnels H/F – JIRA / XRAY / SOAPUI / POSTMAN / SQL' }),
    );
    expect(long.titleFont).toBeLessThan(short.titleFont);
  });
});
