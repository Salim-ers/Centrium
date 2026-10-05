import { describe, expect, it } from 'vitest';

import { applyMapping, csvRowsToConsultants, detectMapping, parseCsv, parseSkillList } from '@/lib/consultants/csv-import';

const CSV = ['Prénom;Nom;Courriel;Poste;Séniorité;Compétences;TJM;Disponibilité', 'Alex;Martin;alex@exemple.fr;DevOps;Senior;"Kubernetes, Terraform ; AWS | kubernetes";650;Disponible'].join('\n');

describe('detectMapping', () => {
  it('should propose a column for each known header', () => {
    // Arrange
    const { headers, labels } = parseCsv(CSV);

    // Act
    const mapping = detectMapping(headers);

    // Assert
    expect(labels[0]).toBe('Prénom');
    expect(mapping).toMatchObject({ first_name: 'prenom', last_name: 'nom', job_title: 'poste', seniority: 'seniorite', skills: 'competences', daily_rate_eur: 'tjm', status: 'disponibilite', email: null });
  });
});

describe('applyMapping', () => {
  it('should let the user map an unknown column and ignore another', () => {
    // Arrange
    const { headers, rows } = parseCsv(CSV);
    const mapping = { ...detectMapping(headers), email: 'courriel', daily_rate_eur: null };

    // Act
    const [draft] = csvRowsToConsultants(applyMapping(rows, mapping));

    // Assert
    expect(draft!.parsed).toMatchObject({ first_name: 'Alex', email: 'alex@exemple.fr', job_title: 'DevOps', seniority: 'senior', daily_rate_eur: null, status: 'available' });
    expect(draft!.skills.map((s) => s.name)).toEqual(['Kubernetes', 'Terraform', 'AWS']);
  });

  it('should report a required field left unmapped', () => {
    const { headers, rows } = parseCsv(CSV);
    const [draft] = csvRowsToConsultants(applyMapping(rows, { ...detectMapping(headers), job_title: null }));
    expect(draft!.parsed).toBeNull();
    expect(draft!.errors).toContain('job_title manquant');
  });
});

describe('parseSkillList', () => {
  it('should split, deduplicate and classify skills', () => {
    expect(parseSkillList('React; TypeScript, react | Agile Scrum')).toEqual([
      { category: 'frameworks', name: 'React' },
      { category: 'languages', name: 'TypeScript' },
      { category: 'tools', name: 'Agile Scrum' },
    ]);
  });

  it('should keep slashes inside a skill name and drop too short entries', () => {
    expect(parseSkillList('CI/CD, C, , Go').map((s) => s.name)).toEqual(['CI/CD', 'Go']);
  });
});
