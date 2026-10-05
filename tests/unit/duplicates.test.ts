import { describe, expect, it } from 'vitest';

import { companyDuplicates, consultantDuplicates, contactDuplicates, normalizeCompany, normalizeText } from '@/lib/duplicates/detect';

describe('normalisation', () => {
  it('should ignore case, accents and punctuation', () => {
    expect(normalizeText('  Hélène  DUPONT-Martin ')).toBe('helene dupont martin');
  });

  it('should drop legal forms from company names', () => {
    expect(normalizeCompany('Nordal Assurances SAS')).toBe('nordal assurances');
    expect(normalizeCompany('NORDAL ASSURANCES (Groupe)')).toBe('nordal assurances');
  });
});

describe('consultantDuplicates', () => {
  it('should group consultants sharing an email or a full name', () => {
    // Arrange
    const list = [
      { id: '1', first_name: 'Inès', last_name: 'Morel', email: 'ines@exemple.fr' },
      { id: '2', first_name: 'Ines', last_name: 'MOREL', email: null },
      { id: '3', first_name: 'Inès', last_name: 'Moreau', email: 'INES@exemple.fr' },
      { id: '4', first_name: 'Hugo', last_name: 'Lambert', email: 'hugo@exemple.fr' },
    ];

    // Act
    const groups = consultantDuplicates(list);

    // Assert : 1-2 par le nom, 1-3 par l'email → un seul groupe de trois.
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items.map((c) => c.id).sort()).toEqual(['1', '2', '3']);
    expect(groups[0]!.reasons.sort()).toEqual(['email', 'name']);
  });
});

describe('contactDuplicates', () => {
  it('should match the same name only within the same company, and the same phone anywhere', () => {
    const list = [
      { id: 'a', first_name: 'Paul', last_name: 'Durand', company_id: 'c1', phone: '+33 6 12 34 56 78' },
      { id: 'b', first_name: 'Paul', last_name: 'Durand', company_id: 'c2', phone: null },
      { id: 'c', first_name: 'Paul', last_name: 'Durand', company_id: 'c1', phone: null },
      { id: 'd', first_name: 'Léa', last_name: 'Petit', company_id: 'c3', phone: '06.12.34.56.78' },
    ];
    const groups = contactDuplicates(list);
    expect(groups.map((g) => g.items.map((c) => c.id).sort())).toEqual([['a', 'c', 'd']]);
    expect(groups[0]!.reasons.sort()).toEqual(['name', 'phone']);
  });
});

describe('companyDuplicates', () => {
  it('should group companies with the same name once legal forms are removed', () => {
    const groups = companyDuplicates([
      { id: 'x', name: 'Helio Retail' },
      { id: 'y', name: 'HELIO RETAIL SAS' },
      { id: 'z', name: 'Helio Energie' },
    ]);
    expect(groups.map((g) => g.items.map((c) => c.id))).toEqual([['x', 'y']]);
  });
});
