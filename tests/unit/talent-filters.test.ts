import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TALENT_FILTERS,
  advancedFilterCount,
  availabilityOf,
  availabilitySortKey,
  filterOptions,
  fromViewFilters,
  hasActiveFilters,
  languageName,
  matchesTalent,
  rankSkills,
  skillMatches,
  toViewFilters,
  type SkillLite,
  type TalentFilters,
  type TalentLite,
} from '@/lib/talents/filters';

const TODAY = '2026-10-07';

const talent = (extra: Partial<TalentLite> = {}): TalentLite => ({
  id: 'c1',
  first_name: 'Inès',
  last_name: 'Morel',
  job_title: 'Data engineer',
  status: 'on_mission',
  available_from: null,
  current_mission_end: '2026-12-31',
  seniority: 'senior',
  years_experience: 8,
  city: 'Lyon',
  mobility: null,
  languages: [{ code: 'en', level: 'Professionnel' }],
  daily_rate_eur: 620,
  contract_type: 'freelance',
  owner_id: 'u1',
  has_portal: true,
  ...extra,
});

const skill = (name: string, extra: Partial<SkillLite> = {}): SkillLite => ({ id: name, name, level: 3, years: 2, is_highlighted: false, ...extra });
const SKILLS = [skill('Python', { level: 5, years: 6 }), skill('Apache Spark', { level: 4 }), skill('AWS'), skill('Docker', { is_highlighted: true })];
const f = (extra: Partial<TalentFilters>): TalentFilters => ({ ...DEFAULT_TALENT_FILTERS, ...extra });

describe('Talents : disponibilité réelle', () => {
  it('disponible maintenant, ou à partir d’une date déclarée', () => {
    expect(availabilityOf({ status: 'available', available_from: null, current_mission_end: null }, TODAY)).toEqual({ kind: 'now', date: null, days: 0 });
    expect(availabilityOf({ status: 'available', available_from: '2026-10-20', current_mission_end: null }, TODAY)).toEqual({ kind: 'soon', date: '2026-10-20', days: 13 });
  });

  it('en mission : libre à la fin de la mission, bientôt sous 30 jours', () => {
    expect(availabilityOf(talent({ current_mission_end: '2026-10-30' }), TODAY)).toMatchObject({ kind: 'soon', days: 23 });
    expect(availabilityOf(talent(), TODAY)).toMatchObject({ kind: 'later', date: '2026-12-31' });
    expect(availabilityOf(talent({ current_mission_end: null }), TODAY)).toEqual({ kind: 'unknown', date: null, days: null });
  });

  it('une date de fin passée vaut disponible ; indisponible reste indisponible', () => {
    expect(availabilityOf(talent({ current_mission_end: '2026-09-30' }), TODAY).kind).toBe('now');
    expect(availabilityOf(talent({ status: 'unavailable' }), TODAY).kind).toBe('unavailable');
  });

  it('trie les disponibles d’abord, puis par date de libération', () => {
    const keys = [
      availabilitySortKey(availabilityOf(talent(), TODAY)),
      availabilitySortKey(availabilityOf(talent({ status: 'available', current_mission_end: null }), TODAY)),
      availabilitySortKey(availabilityOf(talent({ current_mission_end: '2026-10-30' }), TODAY)),
    ].sort();
    expect(keys).toEqual(['0', '12026-10-30', '12026-12-31']);
  });
});

describe('Talents : compétences', () => {
  it('reconnaît une compétence sans tenir compte de la casse ni des accents', () => {
    expect(skillMatches('Apache Spark', 'spark')).toBe(true);
    expect(skillMatches('Sécurité réseau', 'securite')).toBe(true);
    expect(skillMatches('Java', '')).toBe(false);
  });

  it('montre d’abord les compétences recherchées, puis les mises en avant, puis le niveau', () => {
    const ranked = rankSkills(SKILLS, ['aws']);
    expect(ranked.map((s) => s.name)).toEqual(['AWS', 'Docker', 'Python', 'Apache Spark']);
    expect(ranked[0]?.matched).toBe(true);
    expect(ranked[1]?.matched).toBe(false);
  });
});

describe('Talents : filtres', () => {
  it('exige toutes les compétences saisies', () => {
    expect(matchesTalent(talent(), SKILLS, f({ skills: ['python', 'spark'] }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ skills: ['python', 'kafka'] }), TODAY)).toBe(false);
  });

  it('filtre par disponibilité : maintenant, sous 30 ou 60 jours', () => {
    const soon = talent({ current_mission_end: '2026-10-30' });
    expect(matchesTalent(soon, SKILLS, f({ availability: 'now' }), TODAY)).toBe(false);
    expect(matchesTalent(soon, SKILLS, f({ availability: '30' }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ availability: '60' }), TODAY)).toBe(false);
    expect(matchesTalent(talent({ status: 'available', current_mission_end: null }), SKILLS, f({ availability: '30' }), TODAY)).toBe(true);
  });

  it('filtre par séniorité, expérience, contrat et TJM', () => {
    expect(matchesTalent(talent(), SKILLS, f({ seniority: ['senior', 'expert'] }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ seniority: ['junior'] }), TODAY)).toBe(false);
    expect(matchesTalent(talent(), SKILLS, f({ minYears: 8 }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ minYears: 12 }), TODAY)).toBe(false);
    expect(matchesTalent(talent(), SKILLS, f({ contract: 'cdi' }), TODAY)).toBe(false);
    expect(matchesTalent(talent(), SKILLS, f({ rateMax: 650 }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ rateMax: 600 }), TODAY)).toBe(false);
    // TJM inconnu : exclu d'un filtre de TJM maximum (on ne suppose rien).
    expect(matchesTalent(talent({ daily_rate_eur: null }), SKILLS, f({ rateMax: 900 }), TODAY)).toBe(false);
  });

  it('ville : la ville du profil, ou une mobilité qui la couvre', () => {
    expect(matchesTalent(talent(), SKILLS, f({ city: 'lyon' }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ city: 'Nantes' }), TODAY)).toBe(false);
    expect(matchesTalent(talent({ mobility: 'France entière' }), SKILLS, f({ city: 'Nantes' }), TODAY)).toBe(true);
    expect(matchesTalent(talent({ mobility: 'Nantes, Rennes' }), SKILLS, f({ city: 'Rennes' }), TODAY)).toBe(true);
  });

  it('langue, portail et recherche libre', () => {
    expect(matchesTalent(talent(), SKILLS, f({ language: 'EN' }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ language: 'de' }), TODAY)).toBe(false);
    expect(matchesTalent(talent(), SKILLS, f({ portal: 'no' }), TODAY)).toBe(false);
    expect(matchesTalent(talent(), SKILLS, f({ query: 'ines data' }), TODAY)).toBe(false);
    expect(matchesTalent(talent(), SKILLS, f({ query: 'inès morel' }), TODAY)).toBe(true);
    expect(matchesTalent(talent(), SKILLS, f({ query: 'INES' }), TODAY)).toBe(true);
  });

  it('compte les filtres avancés actifs', () => {
    expect(advancedFilterCount(DEFAULT_TALENT_FILTERS)).toBe(0);
    expect(advancedFilterCount(f({ seniority: ['senior', 'lead'], city: 'Lyon', rateMax: 700 }))).toBe(3);
    expect(hasActiveFilters(DEFAULT_TALENT_FILTERS)).toBe(false);
    expect(hasActiveFilters(f({ skills: ['Go'] }))).toBe(true);
  });
});

describe('Talents : vues enregistrées', () => {
  it('conserve tous les filtres à l’aller-retour', () => {
    const filters = f({ skills: ['Java', 'Spring'], seniority: ['senior'], minYears: 5, city: 'Lyon', language: 'en', rateMax: 650, portal: 'yes', availability: '30' });
    expect(fromViewFilters(toViewFilters('pool', filters))).toEqual({ scope: 'pool', filters });
  });

  it('relit les anciennes vues à une seule compétence', () => {
    const old = { ...toViewFilters('staff', DEFAULT_TALENT_FILTERS), skill: 'AWS' };
    expect(fromViewFilters(old).filters.skills).toEqual(['AWS']);
  });

  it('ignore les valeurs inconnues', () => {
    const { scope, filters } = fromViewFilters({ scope: 'nope', availability: '90', seniority: 'senior,wizard', minYears: 'abc' });
    expect(scope).toBe('staff');
    expect(filters.availability).toBe('any');
    expect(filters.seniority).toEqual(['senior']);
    expect(filters.minYears).toBeNull();
  });
});

describe('Talents : options des listes', () => {
  it('liste les langues et les villes présentes, sans doublon', () => {
    const list = [talent(), talent({ id: 'c2', city: 'lyon', languages: [{ code: 'DE', level: 'Notions' }] }), talent({ id: 'c3', city: 'Nantes', languages: null })];
    expect(filterOptions(list)).toEqual({ languages: ['de', 'en'], cities: ['lyon', 'Nantes'] });
  });

  it('nomme une langue à partir de son code', () => {
    expect(languageName('en', 'fr')).toBe('Anglais');
    expect(languageName('de', 'en')).toBe('German');
    expect(languageName('zz', 'fr')).toBe('ZZ');
  });
});
