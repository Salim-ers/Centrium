import { describe, expect, it } from 'vitest';
import {
  compareMatches,
  detectLanguages,
  leadSentence,
  parseMinYears,
  remoteModeOf,
  scoreMatch,
  seniorityFromTitle,
  titleSimilarity,
  verdictOf,
  type MatchNeed,
  type MatchProfile,
} from '@/lib/matching/engine';
import { needFromJobOffer } from '@/lib/matching/needs';
import { rankForNeed, type MatchingConsultant } from '@/lib/matching/rank';
import type { ConsultantSkill, JobOffer } from '@/types';

const TODAY = '2026-10-07';
const CLIENT = 'client-nordal';

const need = (extra: Partial<MatchNeed> = {}): MatchNeed => ({
  title: 'Data engineer senior',
  companyId: CLIENT,
  companyName: 'Nordal Assurances',
  mandatory: ['Python', 'Spark', 'AWS', 'Airflow'],
  optional: ['Terraform'],
  seniority: 'senior',
  minYears: null,
  startDate: '2026-11-02',
  location: 'Paris',
  remote: 'hybrid',
  rateMax: 650,
  rateMin: null,
  languages: [],
  ...extra,
});

const profile = (extra: Partial<MatchProfile> = {}): MatchProfile => ({
  id: 'p1',
  job_title: 'Data engineer',
  seniority: 'senior',
  years_experience: 8,
  status: 'available',
  available_from: null,
  current_mission_end: null,
  daily_rate_eur: 620,
  city: 'Paris',
  mobility: null,
  languages: [{ code: 'fr', level: 'Natif' }],
  skills: [
    { name: 'Python', level: 5, years: 7 },
    { name: 'Apache Spark', level: 4, years: 5 },
    { name: 'AWS', level: 4, years: 4 },
    { name: 'Airflow', level: 4, years: 4 },
    { name: 'Terraform', level: 3, years: 2 },
  ],
  certifications: [],
  experiences: [{ client_name: 'Nordal Assurances', role: 'Data engineer', start_date: '2023-01-01', end_date: '2025-06-30', environment: ['Python', 'Spark', 'AWS'] }],
  missions: [{ company_id: CLIENT, title: 'Plateforme data', start_date: '2023-01-01', end_date: '2025-06-30', status: 'completed' }],
  ...extra,
});

const points = (r: ReturnType<typeof scoreMatch>, id: string) => r.criteria.find((c) => c.id === id)!.points;

describe('Matching IA : score sur 100 en six critères', () => {
  it('le profil idéal, justifié critère par critère, atteint 100', () => {
    // Act
    const r = scoreMatch(need(), profile(), { today: TODAY });
    // Assert
    expect(r.criteria.map((c) => [c.id, c.max])).toEqual([
      ['skills', 40],
      ['experience', 20],
      ['availability', 15],
      ['location', 10],
      ['rate', 10],
      ['bonus', 5],
    ]);
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('excellent');
    expect(r.strengths.map((s) => s.fr)).toContain('Couvre les 4 exigences obligatoires');
    expect(r.gaps).toHaveLength(0);
  });

  it('un profil partiel obtient un score intermédiaire, avec ses écarts nommés', () => {
    const r = scoreMatch(
      need(),
      profile({
        seniority: 'confirmed',
        skills: [
          { name: 'Python', level: 3, years: 3 },
          { name: 'Spark', level: 2, years: 1 },
        ],
        available_from: '2026-11-20',
        status: 'soon_available',
        city: 'Lyon',
        daily_rate_eur: 700,
        experiences: [],
        missions: [],
      }),
      { today: TODAY },
    );
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.score).toBeLessThan(60);
    expect(r.gaps.map((g) => g.fr)).toEqual(
      expect.arrayContaining(['Absent du profil : AWS, Airflow', 'Confirmé pour un besoin Senior', 'Libre 18 j après le démarrage', 'Hybride : déplacements depuis Lyon']),
    );
    expect(r.missingSkills).toEqual(['AWS', 'Airflow']);
  });

  it('des profils différents donnent des scores différents (pas de score figé)', () => {
    const scores = [
      scoreMatch(need(), profile(), { today: TODAY }).score,
      scoreMatch(need(), profile({ missions: [], experiences: [], daily_rate_eur: 690 }), { today: TODAY }).score,
      scoreMatch(need(), profile({ skills: profile().skills.slice(0, 2), city: 'Lille' }), { today: TODAY }).score,
    ];
    expect(new Set(scores).size).toBe(3);
    expect(scores[0]).toBeGreaterThan(scores[1]!);
    expect(scores[1]).toBeGreaterThan(scores[2]!);
  });
});

describe('Matching IA : preuves des compétences', () => {
  it('le niveau et les années comptent dans la preuve', () => {
    const r = scoreMatch(need({ mandatory: ['Python'], optional: [] }), profile({ skills: [{ name: 'Python', level: 2, years: 1 }] }), { today: TODAY });
    const python = r.skills[0]!;
    expect(python).toMatchObject({ status: 'matched', source: 'skill', level: 2, years: 1 });
    expect(python.credit).toBeCloseTo(0.75);
    expect(python.evidence?.fr).toBe('niveau 2/5 · 1 an');
  });

  it('une équivalence technique forte couvre une compétence-parapluie', () => {
    const r = scoreMatch(need({ mandatory: ['Microsoft'], optional: [] }), profile({ skills: [{ name: 'Active Directory', level: 4, years: 5 }] }), { today: TODAY });
    expect(r.skills[0]).toMatchObject({ status: 'equivalent', source: 'equivalence', credit: 0.85 });
    expect(r.equivalentSkills).toEqual(['Microsoft']);
  });

  it('une certification prouve la compétence qu’elle nomme', () => {
    const r = scoreMatch(need({ mandatory: ['AWS'], optional: [] }), profile({ skills: [], certifications: [{ name: 'AWS Certified Solutions Architect', year: 2024 }] }), { today: TODAY });
    expect(r.skills[0]).toMatchObject({ status: 'matched', source: 'certification', credit: 0.9 });
    expect(r.skills[0]?.evidence?.fr).toBe('certification AWS Certified Solutions Architect (2024)');
  });

  it('une techno citée seulement dans une expérience est « à confirmer »', () => {
    const r = scoreMatch(
      need({ mandatory: ['Kafka'], optional: [] }),
      profile({ skills: [], experiences: [{ client_name: 'Helio Retail', role: 'Data engineer', start_date: '2021-02-01', end_date: '2022-12-31', environment: ['Kafka', 'Scala'] }] }),
      { today: TODAY },
    );
    expect(r.skills[0]).toMatchObject({ status: 'partial', source: 'experience', credit: 0.6 });
    expect(r.gaps.map((g) => g.fr)).toContain('À confirmer : Kafka');
  });

  it('une langue exigée est évaluée selon le niveau déclaré', () => {
    const fluent = scoreMatch(need({ languages: ['en'] }), profile({ languages: [{ code: 'en', level: 'Professionnel' }] }), { today: TODAY });
    const none = scoreMatch(need({ languages: ['en'] }), profile(), { today: TODAY });
    expect(fluent.skills.find((s) => s.kind === 'language')).toMatchObject({ code: 'en', status: 'matched' });
    expect(none.skills.find((s) => s.kind === 'language')).toMatchObject({ status: 'missing', credit: 0 });
    expect(points(fluent, 'skills')).toBeGreaterThan(points(none, 'skills'));
  });
});

describe('Matching IA : critères et plafonds', () => {
  it('indisponible : score plafonné à 30', () => {
    const r = scoreMatch(need(), profile({ status: 'unavailable' }), { today: TODAY });
    expect(r.score).toBe(30);
    expect(r.caps.map((c) => c.id)).toEqual(['unavailable']);
  });

  it('plafonne selon la couverture des exigences obligatoires', () => {
    const skill = (name: string) => ({ name, level: 5, years: 8 });
    // Sans expériences : une techno citée dans une expérience compterait pour moitié.
    const cap = (mandatory: string[], has: string[]) =>
      scoreMatch(need({ mandatory, optional: [] }), profile({ skills: has.map(skill), experiences: [] }), { today: TODAY }).caps.find((c) => c.id === 'skills')?.max ?? null;
    const four = ['Python', 'Kafka', 'Scala', 'Flink'];
    expect(cap(four, [])).toBe(20);
    expect(cap([...four, 'Go'], ['Python'])).toBe(30);
    expect(cap(four, ['Python'])).toBe(49);
    expect(cap(four, ['Python', 'Kafka'])).toBe(64);
    expect(cap(four, ['Python', 'Kafka', 'Scala'])).toBe(79);
    expect(cap(four, four)).toBeNull();
  });

  it('pas de « très bon match » avec une exigence obligatoire absente', () => {
    const r = scoreMatch(need(), profile({ skills: profile().skills.filter((s) => s.name !== 'Airflow') }), { today: TODAY });
    expect(r.score).toBe(79);
    expect(r.verdict).toBe('good');
    expect(r.caps[0]?.label.fr).toBe('Exigence obligatoire absente ou à confirmer');
  });

  it('séniorité en dessous : plafonnée à 69 (deux niveaux), 50 (trois ou plus)', () => {
    const twoBelow = scoreMatch(need(), profile({ seniority: 'junior' }), { today: TODAY });
    expect(twoBelow.score).toBe(69);
    expect(twoBelow.verdict).toBe('good');
    expect(twoBelow.gaps.map((g) => g.fr)).toContain('Junior pour un besoin Senior');
    const far = scoreMatch(need({ seniority: 'expert' }), profile({ seniority: 'junior' }), { today: TODAY });
    expect(far.score).toBeLessThanOrEqual(50);
    expect(far.caps.map((c) => c.id)).toContain('seniority');
  });

  it('sans donnée, le critère est noté au neutre et signalé', () => {
    const r = scoreMatch(need({ rateMax: null, location: null }), profile({ daily_rate_eur: null }), { today: TODAY });
    expect(r.criteria.find((c) => c.id === 'rate')).toMatchObject({ points: 6, evaluated: false });
    expect(r.criteria.find((c) => c.id === 'location')).toMatchObject({ points: 6, evaluated: false });
    expect(r.notEvaluated.map((n) => n.fr)).toEqual(expect.arrayContaining(['Lieu de mission non renseigné']));
  });

  it('disponibilité réelle : avant le démarrage, juste après, fin de mission inconnue', () => {
    expect(points(scoreMatch(need(), profile({ status: 'on_mission', current_mission_end: '2026-10-30' }), { today: TODAY }), 'availability')).toBe(15);
    expect(points(scoreMatch(need(), profile({ status: 'on_mission', current_mission_end: '2026-11-12' }), { today: TODAY }), 'availability')).toBe(12);
    expect(points(scoreMatch(need(), profile({ status: 'on_mission', current_mission_end: null }), { today: TODAY }), 'availability')).toBe(4);
  });

  it('localisation : télétravail, Île-de-France, mobilité, hybride, sur site', () => {
    expect(points(scoreMatch(need({ remote: 'remote' }), profile({ city: 'Marseille' }), { today: TODAY }), 'location')).toBe(10);
    expect(points(scoreMatch(need({ location: 'La Défense' }), profile({ city: 'Boulogne-Billancourt' }), { today: TODAY }), 'location')).toBe(9);
    expect(points(scoreMatch(need(), profile({ city: 'Nantes', mobility: 'France entière' }), { today: TODAY }), 'location')).toBe(8);
    expect(points(scoreMatch(need(), profile({ city: 'Nantes' }), { today: TODAY }), 'location')).toBe(4);
    expect(points(scoreMatch(need({ remote: 'onsite' }), profile({ city: 'Nantes' }), { today: TODAY }), 'location')).toBe(2);
  });

  it('TJM : dans le budget, puis décroissant au-delà ; texte masqué sans accès aux TJM', () => {
    const over = scoreMatch(need(), profile({ daily_rate_eur: 728 }), { today: TODAY });
    expect(points(over, 'rate')).toBe(3);
    const gap = over.gaps.find((g) => g.fr.startsWith('TJM'))!;
    expect(gap.fr).toBe('TJM 12 % au-dessus du budget (728 € pour 650 €)');
    expect(gap.redacted?.fr).toBe('TJM au-dessus du budget');
    expect(over.criteria.find((c) => c.id === 'rate')?.redacted?.fr).toBe('TJM au-dessus du budget');
  });

  it('bonus : client déjà servi et expérience proche ; non évalué sans les données', () => {
    const r = scoreMatch(need(), profile(), { today: TODAY });
    expect(r.criteria.find((c) => c.id === 'bonus')).toMatchObject({ points: 5, evaluated: true });
    expect(r.strengths.map((s) => s.fr)).toEqual(expect.arrayContaining(['A déjà travaillé pour ce client', 'Expérience proche (Nordal Assurances, 2023–2025)']));
    const unknown = scoreMatch(need(), profile({ experiences: null, missions: null }), { today: TODAY });
    expect(unknown.criteria.find((c) => c.id === 'bonus')).toMatchObject({ points: 0, evaluated: false });
  });
});

describe('Matching IA : pourquoi l’un devance l’autre', () => {
  it('nomme les critères et les compétences qui font la différence', () => {
    const a = scoreMatch(need(), profile(), { today: TODAY });
    const b = scoreMatch(need(), profile({ skills: profile().skills.filter((s) => s.name !== 'Airflow'), daily_rate_eur: 600 }), { today: TODAY });
    const cmp = compareMatches(a, b);
    expect(cmp.lead).toBeGreaterThan(0);
    expect(cmp.ahead[0]?.id).toBe('skills');
    expect(cmp.skillsOnlyA).toEqual(['Airflow']);
    expect(leadSentence(a, b, 'Yanis', 'fr')).toMatch(/^Devance Yanis de \d+ pts? : compétences clés \(\+[\d,]+ : Airflow\)/);
  });

  it('ne dit rien de faux quand les scores sont égaux', () => {
    const a = scoreMatch(need(), profile(), { today: TODAY });
    expect(leadSentence(a, a, 'Yanis', 'fr')).toBeNull();
    // Deux profils plafonnés au même score : seul l'avantage réel est cité.
    const none = { skills: [{ name: 'Excel', level: 3, years: 2 }], experiences: [] };
    const capA = scoreMatch(need(), profile(none), { today: TODAY }); // a déjà servi le client
    const capB = scoreMatch(need(), profile({ ...none, missions: [] }), { today: TODAY });
    expect(capA.score).toBe(20);
    expect(capB.score).toBe(20);
    expect(leadSentence(capA, capB, 'Yanis Benali', 'fr')).toBe('À égalité avec Yanis Benali ; devant sur bonus mission similaire (+3).');
  });
});

describe('Matching IA : lecture du besoin', () => {
  it('lit les années d’expérience d’un libellé', () => {
    expect(parseMinYears('5 ans')).toBe(5);
    expect(parseMinYears('3 à 5 ans')).toBe(3);
    expect(parseMinYears('6–9 ans')).toBe(6);
    expect(parseMinYears('+8 ans')).toBe(8);
    expect(parseMinYears('Senior')).toBeNull();
  });

  it('lit la séniorité écrite dans l’intitulé, sans interpréter les rôles', () => {
    expect(seniorityFromTitle('Data engineer senior')).toBe('senior');
    expect(seniorityFromTitle('Développeur Java confirmé')).toBe('confirmed');
    expect(seniorityFromTitle('Junior PMO')).toBe('junior');
    expect(seniorityFromTitle('Tech lead Java')).toBeNull();
    expect(seniorityFromTitle('Architecte cloud AWS')).toBeNull();
  });

  it('une fiche de poste sans séniorité reprend celle de son intitulé', () => {
    const offer = { title: 'Data engineer senior', company_id: null, required_skills: ['Python'], nice_to_have: [], seniority: null, experience_label: null, start_date: null, location: null, work_mode: null, remote_days: null, daily_rate_max: null, daily_rate_min: null, description: null, profile_requirements: [], working_conditions: [] } as unknown as JobOffer;
    expect(needFromJobOffer(offer).seniority).toBe('senior');
    expect(needFromJobOffer({ ...offer, seniority: 'expert' }).seniority).toBe('expert');
  });

  it('repère les langues exigées dans le texte', () => {
    expect(detectLanguages('Anglais courant indispensable, allemand apprécié')).toEqual(['en', 'de']);
    expect(detectLanguages('Équipe française')).toEqual([]);
  });

  it('déduit le mode de travail des champs disponibles', () => {
    expect(remoteModeOf('hybrid')).toBe('hybrid');
    expect(remoteModeOf('tbd', 'remote')).toBe('remote');
    expect(remoteModeOf(null, 'custom')).toBe('hybrid');
    expect(remoteModeOf(null, null, 5)).toBe('remote');
    expect(remoteModeOf(null, null, 0)).toBe('onsite');
    expect(remoteModeOf(null, null, null)).toBeNull();
  });

  it('compare les intitulés sans la séniorité ni les mots vides', () => {
    expect(titleSimilarity('Data engineer senior', 'Data engineer')).toBe(1);
    expect(titleSimilarity('Développeur Java', 'Java developer')).toBe(1);
    expect(titleSimilarity('Chef de projet SI', 'Data engineer')).toBe(0);
  });

  it('classe les verdicts', () => {
    expect([verdictOf(85), verdictOf(70), verdictOf(55), verdictOf(30)]).toEqual(['excellent', 'good', 'possible', 'weak']);
  });
});

describe('Matching IA : classement', () => {
  const consultant = (id: string, extra: Partial<MatchingConsultant> = {}): MatchingConsultant => ({
    id,
    first_name: id,
    last_name: 'Test',
    job_title: 'Data engineer',
    seniority: 'senior',
    years_experience: 8,
    status: 'available',
    available_from: null,
    current_mission_end: null,
    daily_rate_eur: 600,
    city: 'Paris',
    mobility: null,
    languages: [],
    is_prospect: false,
    contract_type: 'freelance',
    ...extra,
  });
  const skill = (consultant_id: string, name: string, level = 4): ConsultantSkill => ({ id: `${consultant_id}-${name}`, consultant_id, category: 'tech', name, level, years: 4, is_highlighted: false, created_at: '' });

  it('trie par score, écarte les exclus et les scores trop bas', () => {
    const skills = new Map([
      ['a', ['Python', 'Spark', 'AWS', 'Airflow'].map((n) => skill('a', n))],
      ['b', ['Python', 'Spark'].map((n) => skill('b', n))],
      ['c', [skill('c', 'Excel')]],
    ]);
    const ranked = rankForNeed(need(), [consultant('c'), consultant('b'), consultant('a'), consultant('x', { status: 'archived' })], skills, { minScore: 40, excludeIds: new Set(['zzz']), today: TODAY });
    expect(ranked.map((r) => r.consultant.id)).toEqual(['a', 'b']);
    expect(ranked[0]!.breakdown.score).toBeGreaterThan(ranked[1]!.breakdown.score);
  });
});
