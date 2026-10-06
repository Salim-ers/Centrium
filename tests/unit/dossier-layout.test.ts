import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT,
  applyLayout,
  certificationLine,
  formatDisplayName,
  moveInList,
  normalizeOrder,
  sectionOrder,
  sectionTitle,
  toggleInList,
  visibleCategories,
  type DossierLayout,
} from '@/lib/cv/layout';
import { analyzeDossierFit, dossierText, keywordCoverage, needKeywords, rankExperiences, techTerms } from '@/lib/cv/fit';
import type { MatchNeed } from '@/lib/matching/engine';
import type { ConsultantExperience, CVContent } from '@/types';

const exp = (id: string, extra: Partial<ConsultantExperience> = {}): ConsultantExperience => ({
  id,
  consultant_id: 'c1',
  client_name: `Client ${id}`,
  role: 'Data engineer',
  start_date: '2023-01-01',
  end_date: '2024-06-30',
  context: null,
  tasks: [],
  environment: [],
  order_index: 0,
  created_at: '',
  ...extra,
});

const content = (): CVContent => ({
  header: { displayName: 'Inès Morel', jobTitle: 'Data engineer', subTitle: null, yearsExperience: 8, location: 'Paris', mobility: null, availability: 'Immédiate' },
  summary: 'Huit ans de pipelines de données.',
  skillCategories: [
    { name: 'Data', items: ['Python', 'Spark', 'Airflow'], highlighted: ['Python'] },
    { name: 'Cloud', items: ['AWS'] },
  ],
  experiences: [exp('a', { environment: ['Python', 'Spark'] }), exp('b', { role: 'Développeur Java', environment: ['Java'] }), exp('c', { environment: ['AWS'], tasks: ['Migration des flux vers Airflow'] })],
  educations: [{ id: 'e1', consultant_id: 'c1', year: 2016, degree: 'Master informatique', institution: 'INSA', created_at: '' } as CVContent['educations'][number]],
  languages: [{ code: 'en', level: 'Professionnel' }],
});

const layout = (extra: Partial<DossierLayout> = {}): DossierLayout => ({ ...DEFAULT_LAYOUT, ...extra });

describe('Dossier : mise en page', () => {
  it('sans mise en page, tout est conservé dans l’ordre par défaut', () => {
    const c = applyLayout(content(), DEFAULT_LAYOUT);
    expect(sectionOrder(c)).toEqual(['summary', 'skills', 'experiences', 'educations', 'certifications', 'languages']);
    expect(c.experiences.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(c.skillCategories[0]?.highlighted).toEqual(['Python']);
  });

  it('masque une section : contenu vidé et retiré de l’ordre', () => {
    const c = applyLayout(content(), layout({ hidden: ['educations', 'summary'] }));
    expect(c.educations).toEqual([]);
    expect(c.summary).toBe('');
    expect(sectionOrder(c)).not.toContain('educations');
  });

  it('retient et ordonne les expériences choisies', () => {
    expect(applyLayout(content(), layout({ experienceIds: ['c', 'a'] })).experiences.map((e) => e.id)).toEqual(['c', 'a']);
  });

  it('masque des compétences sans décaler les indices d’édition', () => {
    const c = applyLayout(content(), layout({ hiddenSkills: ['spark'] }));
    const data = visibleCategories(c)[0]!;
    expect(data.items).toEqual([
      { item: 'Python', index: 0 },
      { item: 'Airflow', index: 2 },
    ]);
    // Toutes les compétences d'une catégorie masquées : la catégorie disparaît.
    expect(visibleCategories(applyLayout(content(), layout({ hiddenSkills: ['AWS'] }))).map((x) => x.cat.name)).toEqual(['Data']);
  });

  it('met en avant les compétences choisies', () => {
    const c = applyLayout(content(), layout({ highlightedSkills: ['Airflow', 'AWS'] }));
    expect(c.skillCategories.map((x) => x.highlighted)).toEqual([['Airflow'], ['AWS']]);
  });

  it('retient les certifications choisies, telles que saisies', () => {
    const certs = [
      { name: 'AWS Certified Data Engineer', issuer: 'Amazon', year: 2024 },
      { name: 'Scrum Master', issuer: null, year: null },
    ];
    expect(applyLayout(content(), layout(), { certifications: certs }).certifications).toHaveLength(2);
    expect(applyLayout(content(), layout({ certificationNames: ['Scrum Master'] }), { certifications: certs }).certifications?.map((x) => x.name)).toEqual(['Scrum Master']);
    expect(certificationLine(certs[0]!)).toBe('AWS Certified Data Engineer — Amazon (2024)');
  });

  it('garde par défaut le nom anonymisé du générateur ; prénom ou nom complet sur choix', () => {
    const anonymised = { ...content(), header: { ...content().header, displayName: 'I. M.' } };
    const names = { firstName: 'Inès', lastName: 'Morel' };
    expect(DEFAULT_LAYOUT.nameFormat).toBe('initials');
    expect(applyLayout(anonymised, DEFAULT_LAYOUT, names).header.displayName).toBe('I. M.');
    expect(applyLayout(anonymised, layout({ nameFormat: 'first_initial' }), names).header.displayName).toBe('Inès M.');
    expect(applyLayout(anonymised, layout({ nameFormat: 'full' }), names).header.displayName).toBe('Inès Morel');
    expect(formatDisplayName('Inès', 'Morel', 'initials')).toBe('I. M.');
  });

  it('titres personnalisés, sinon celui du modèle', () => {
    const c = applyLayout(content(), layout({ titles: { experiences: 'Missions clés' } }));
    expect(sectionTitle(c, 'experiences', 'Expériences')).toBe('Missions clés');
    expect(sectionTitle(c, 'skills', 'Compétences clés')).toBe('Compétences clés');
  });

  it('normalise l’ordre et déplace les éléments', () => {
    expect(normalizeOrder(['experiences', 'summary', 'experiences'])).toEqual(['experiences', 'summary', 'skills', 'educations', 'certifications', 'languages']);
    expect(moveInList(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveInList(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(toggleInList(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleInList(['a', 'b'], 'a')).toEqual(['b']);
  });
});

const need: MatchNeed = {
  title: 'Data engineer senior',
  companyId: null,
  mandatory: ['Python', 'Spark', 'Airflow'],
  optional: ['Kafka'],
  seniority: 'senior',
  minYears: null,
  startDate: null,
  location: 'Paris',
  remote: 'hybrid',
  rateMax: null,
  rateMin: null,
  languages: [],
};

describe('Dossier : pertinence pour un besoin', () => {
  it('repère les termes techniques connus d’un texte', () => {
    const terms = techTerms('Pipelines Spark et Airflow sur AWS, déploiement Kubernetes.');
    expect(terms).toEqual(expect.arrayContaining(['Spark', 'Airflow', 'AWS', 'Kubernetes']));
    expect(terms).not.toContain('Pipelines');
  });

  it('mots-clés : exigences listées puis termes de la description, sans doublon', () => {
    expect(needKeywords(need, 'Stack : Spark, Kafka, dbt et Snowflake.')).toEqual(expect.arrayContaining(['Python', 'Spark', 'Airflow', 'Kafka']));
    expect(new Set(needKeywords(need, 'Spark Spark').map((k) => k.toLowerCase())).size).toBe(needKeywords(need, 'Spark Spark').length);
  });

  it('classe les expériences par exigences partagées, intitulé et récence', () => {
    const ranked = rankExperiences(content().experiences, need, '2026-10-07');
    expect(ranked.map((r) => r.id)).toEqual(['a', 'c']);
    expect(ranked[0]).toMatchObject({ shared: ['Python', 'Spark'], similarRole: true });
    expect(ranked[1]?.shared).toEqual(['Airflow']);
  });

  it('les mots-clés suivent le dossier affiché (sections masquées exclues)', () => {
    const full = keywordCoverage(['Python', 'Kafka'], applyLayout(content(), DEFAULT_LAYOUT));
    expect(full).toEqual({ found: ['Python'], missing: ['Kafka'] });
    const hidden = keywordCoverage(['Airflow'], applyLayout(content(), layout({ hiddenSkills: ['Airflow'], experienceIds: ['a', 'b'] })));
    expect(hidden.missing).toEqual(['Airflow']);
    expect(dossierText(applyLayout(content(), layout({ hidden: ['summary'] })))).not.toContain('Huit ans');
  });

  it('assemble score du profil, expériences et mots-clés', () => {
    const fit = analyzeDossierFit({
      need,
      profile: {
        id: 'c1',
        job_title: 'Data engineer',
        seniority: 'senior',
        years_experience: 8,
        status: 'available',
        available_from: null,
        current_mission_end: null,
        daily_rate_eur: null,
        city: 'Paris',
        mobility: null,
        languages: [],
        skills: [
          { name: 'Python', level: 5, years: 6 },
          { name: 'Spark', level: 4, years: 4 },
          { name: 'Airflow', level: 4, years: 3 },
        ],
      },
      experiences: content().experiences,
      content: applyLayout(content(), DEFAULT_LAYOUT),
      today: '2026-10-07',
    });
    expect(fit.match.score).toBeGreaterThan(80);
    expect(fit.match.missingSkills).toEqual([]);
    expect(fit.relevant[0]?.id).toBe('a');
    expect(fit.keywords.missing).toContain('Kafka');
  });
});
