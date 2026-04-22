import { describe, it, expect } from 'vitest';
import {
  computeMatching,
  buildExecutiveSummary,
  reformulateBullet,
  groupSkillsByCategory,
  generateCVContent,
} from '@/lib/ai/cv-generator';
import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
  JobOffer,
} from '@/types';

// ---------- Fixtures ----------

const consultant: Consultant = {
  id: 'c1',
  organization_id: 'o1',
  owner_id: null,
  first_name: 'Alex',
  last_name: 'S.',
  initials: 'A. S.',
  email: null,
  phone: null,
  linkedin_url: null,
  job_title: 'QA Automation',
  sub_title: 'Playwright / TS',
  seniority: 'confirmed',
  years_experience: 7,
  city: 'Paris',
  country: 'FR',
  mobility: 'IDF',
  languages: [],
  daily_rate_eur: 550,
  contract_type: 'freelance',
  status: 'on_mission',
  available_from: '2026-07-01',
  current_client: 'Dior',
  current_mission_end: null,
  summary: null,
  internal_notes: null,
  archived: false,
  is_prospect: false,
  created_at: '',
  updated_at: '',
};

const skills: ConsultantSkill[] = [
  { id: 's1', consultant_id: 'c1', category: 'automation', name: 'Playwright', level: 5, years: 3, is_highlighted: true, created_at: '' },
  { id: 's2', consultant_id: 'c1', category: 'languages', name: 'TypeScript', level: 5, years: 4, is_highlighted: true, created_at: '' },
  { id: 's3', consultant_id: 'c1', category: 'languages', name: 'SQL', level: 4, years: 5, is_highlighted: false, created_at: '' },
];

const experiences: ConsultantExperience[] = [
  {
    id: 'e1',
    consultant_id: 'c1',
    client_name: 'LVMH – Dior',
    role: 'QA',
    start_date: '2023-01-01',
    end_date: null,
    context: 'Projet e-commerce',
    tasks: ["j'ai fait des tests API", 'j\'ai participé à la release'],
    environment: ['Playwright', 'Postman'],
    order_index: 1,
    created_at: '',
  },
];

const educations: ConsultantEducation[] = [
  { id: 'ed1', consultant_id: 'c1', year: 2020, degree: 'Mastère', institution: null, created_at: '' },
];

// ---------- Tests ----------

describe('computeMatching', () => {
  it('returns 0 score when no offer is provided', () => {
    const result = computeMatching(skills, null);
    expect(result.score).toBe(0);
    expect(result.matchedSkills).toEqual([]);
  });

  it('returns full match when all required skills are present', () => {
    const offer: JobOffer = {
      id: 'o', organization_id: '', company_id: null, contact_id: null, owner_id: null,
      title: 'QA', description: null,
      required_skills: ['Playwright', 'TypeScript'],
      nice_to_have: [],
      seniority: null, daily_rate_min: null, daily_rate_max: null,
      location: null, remote_days: null, start_date: null, duration_months: null,
      deadline: null, status: 'open', source: null, created_at: '', updated_at: '',
    };
    const result = computeMatching(skills, offer);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.matchedSkills).toContain('Playwright');
    expect(result.matchedSkills).toContain('TypeScript');
    expect(result.missingSkills).toEqual([]);
  });

  it('identifies missing skills', () => {
    const offer: JobOffer = {
      id: 'o', organization_id: '', company_id: null, contact_id: null, owner_id: null,
      title: 'QA', description: null,
      required_skills: ['Playwright', 'Kubernetes'],
      nice_to_have: [],
      seniority: null, daily_rate_min: null, daily_rate_max: null,
      location: null, remote_days: null, start_date: null, duration_months: null,
      deadline: null, status: 'open', source: null, created_at: '', updated_at: '',
    };
    const result = computeMatching(skills, offer);
    expect(result.missingSkills).toContain('Kubernetes');
    expect(result.matchedSkills).toContain('Playwright');
    expect(result.score).toBeLessThan(90);
  });

  it('is case insensitive', () => {
    const offer: JobOffer = {
      id: 'o', organization_id: '', company_id: null, contact_id: null, owner_id: null,
      title: 'QA', description: null,
      required_skills: ['playwright', 'TYPESCRIPT'],
      nice_to_have: [],
      seniority: null, daily_rate_min: null, daily_rate_max: null,
      location: null, remote_days: null, start_date: null, duration_months: null,
      deadline: null, status: 'open', source: null, created_at: '', updated_at: '',
    };
    const result = computeMatching(skills, offer);
    expect(result.matchedSkills).toHaveLength(2);
    expect(result.missingSkills).toEqual([]);
  });
});

describe('buildExecutiveSummary', () => {
  it('includes years of experience', () => {
    const s = buildExecutiveSummary(consultant, skills, experiences);
    expect(s).toContain('7 ans');
  });

  it('mentions the job title', () => {
    const s = buildExecutiveSummary(consultant, skills, experiences);
    expect(s.toLowerCase()).toContain('qa automation');
  });

  it('does not hallucinate — it only uses provided data', () => {
    const s = buildExecutiveSummary(consultant, [], []);
    expect(s).toContain('QA Automation');
    expect(s).toContain('7 ans');
    // Ne devrait pas contenir de client non fourni
    expect(s).not.toContain('Google');
    expect(s).not.toContain('Microsoft');
  });
});

describe('reformulateBullet', () => {
  it('replaces "j\'ai fait" with "Réalisation de"', () => {
    const r = reformulateBullet("j'ai fait des tests API");
    expect(r).toMatch(/^Réalisation de/);
  });

  it('replaces "j\'ai participé à" with "Contribution à"', () => {
    const r = reformulateBullet("j'ai participé à la release");
    expect(r).toMatch(/^Contribution à/);
  });

  it('capitalizes first letter', () => {
    const r = reformulateBullet('mise en place du CI/CD');
    expect(r[0]).toBe('M');
  });

  it('does not modify already-clean bullets', () => {
    const r = reformulateBullet('Pilotage de la stratégie QA');
    expect(r).toBe('Pilotage de la stratégie QA');
  });
});

describe('groupSkillsByCategory', () => {
  it('groups skills correctly', () => {
    const groups = groupSkillsByCategory(skills);
    expect(groups).toHaveLength(2); // automation + languages
    const langs = groups.find((g) => g.name === 'Langages');
    expect(langs?.items).toContain('TypeScript');
    expect(langs?.items).toContain('SQL');
  });

  it('highlights required skills from offer', () => {
    const groups = groupSkillsByCategory(skills, ['SQL']);
    const langs = groups.find((g) => g.name === 'Langages');
    expect(langs?.highlighted).toContain('SQL');
  });

  it('sorts highlighted skills first', () => {
    const groups = groupSkillsByCategory(skills);
    const langs = groups.find((g) => g.name === 'Langages');
    // TypeScript (highlighted) avant SQL (non highlighted)
    expect(langs?.items[0]).toBe('TypeScript');
  });
});

describe('generateCVContent — integration', () => {
  it('generates a valid CV structure', async () => {
    const result = await generateCVContent({
      consultant,
      skills,
      experiences,
      educations,
      jobOffer: null,
      templateId: 'standard',
    });
    expect(result.content.header.yearsExperience).toBe(7);
    expect(result.content.experiences).toHaveLength(1);
    expect(result.content.educations).toHaveLength(1);
  });

  it('reformulates bullet points', async () => {
    const result = await generateCVContent({
      consultant,
      skills,
      experiences,
      educations,
      jobOffer: null,
      templateId: 'standard',
    });
    const tasks = result.content.experiences[0].tasks;
    expect(tasks[0]).toMatch(/^Réalisation de/);
    expect(tasks[1]).toMatch(/^Contribution à/);
  });

  it('guardrails.noInvention is true for clean generation', async () => {
    const result = await generateCVContent({
      consultant,
      skills,
      experiences,
      educations,
      jobOffer: null,
      templateId: 'standard',
    });
    expect(result.guardrails.noInvention).toBe(true);
    expect(result.guardrails.flaggedClaims).toEqual([]);
  });

  it('warns about missing skills from offer', async () => {
    const offer: JobOffer = {
      id: 'o', organization_id: '', company_id: null, contact_id: null, owner_id: null,
      title: 'QA', description: null,
      required_skills: ['Kubernetes', 'Playwright'],
      nice_to_have: [],
      seniority: null, daily_rate_min: null, daily_rate_max: null,
      location: null, remote_days: null, start_date: null, duration_months: null,
      deadline: null, status: 'open', source: null, created_at: '', updated_at: '',
    };
    const result = await generateCVContent({
      consultant, skills, experiences, educations,
      jobOffer: offer, templateId: 'standard',
    });
    expect(result.warnings.some((w) => w.includes('Kubernetes'))).toBe(true);
  });

  it('sorts experiences anti-chronologically', async () => {
    const multiExp: ConsultantExperience[] = [
      { ...experiences[0], id: 'e1', start_date: '2020-01-01', end_date: '2022-01-01', client_name: 'Old' },
      { ...experiences[0], id: 'e2', start_date: '2023-01-01', end_date: null, client_name: 'Recent' },
    ];
    const result = await generateCVContent({
      consultant, skills, experiences: multiExp, educations,
      jobOffer: null, templateId: 'standard',
    });
    expect(result.content.experiences[0].client_name).toBe('Recent');
  });
});
