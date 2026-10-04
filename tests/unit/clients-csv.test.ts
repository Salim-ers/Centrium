import { describe, expect, it } from 'vitest';

import { draftClientRows, mapClientHeaders } from '@/lib/clients/csv-import';

describe('client CSV import', () => {
  it('maps French and English headers regardless of accents and case', () => {
    expect(mapClientHeaders(['Société', 'Secteur', 'Site web', 'VILLE'])).toEqual({ name: 'Société', industry: 'Secteur', website: 'Site web', city: 'VILLE' });
    expect(mapClientHeaders(['Company', 'Type', 'Country'])).toEqual({ name: 'Company', kind: 'Type', country: 'Country' });
  });

  it('normalises kinds and websites, and reports invalid lines', () => {
    const drafts = draftClientRows(
      ['Nom', 'Type', 'Site'],
      [
        { Nom: 'Banque Lumen', Type: 'Partenaire', Site: 'lumen.example' },
        { Nom: 'Énergie Nord', Type: '', Site: '' },
        { Nom: '', Type: 'client', Site: '' },
        { Nom: '', Type: '', Site: '' },
      ],
    );
    expect(drafts).toHaveLength(3);
    expect(drafts[0]?.value).toMatchObject({ name: 'Banque Lumen', kind: 'esn_partner', website: 'https://lumen.example' });
    expect(drafts[1]?.value).toMatchObject({ name: 'Énergie Nord', kind: 'client', website: null });
    expect(drafts[2]).toMatchObject({ line: 4, value: null });
  });
});
