import { describe, expect, it } from 'vitest';

import { exportFormatSchema, toDelimited } from '@/lib/finance/export-format';

const rows = [
  { numero: 'PF-2026-0012', tiers: 'Nordal; Assurances', montant_ht: 12600.5, date: '2026-10-02', note: 'dit "urgent"' },
  { numero: 'PF-2026-0013', tiers: 'Helio Retail', montant_ht: 9800, date: '2026-10-03', note: null },
];

describe('toDelimited', () => {
  it('keeps the historical format by default (semicolon, dot, ISO dates)', () => {
    expect(toDelimited(rows)).toBe(
      'numero;tiers;montant_ht;date;note\n' + 'PF-2026-0012;"Nordal; Assurances";12600.5;2026-10-02;"dit ""urgent"""\n' + 'PF-2026-0013;Helio Retail;9800;2026-10-03;',
    );
  });

  it('writes decimal commas and French dates for French accounting tools', () => {
    const out = toDelimited(rows, { decimal: ',', date: 'fr' });
    expect(out.split('\n')[1]).toBe('PF-2026-0012;"Nordal; Assurances";12600,5;02/10/2026;"dit ""urgent"""');
  });

  it('quotes decimal commas when the separator is a comma', () => {
    const out = toDelimited(rows, { separator: ',', decimal: ',' });
    expect(out.split('\n')[1]).toBe('PF-2026-0012,"Nordal; Assurances","12600,5",2026-10-02,"dit ""urgent"""');
  });

  it('supports tab-separated output', () => {
    expect(toDelimited(rows, { separator: 'tab' }).split('\n')[0]).toBe('numero\ttiers\tmontant_ht\tdate\tnote');
  });

  it('returns an empty string without rows', () => {
    expect(toDelimited([])).toBe('');
  });
});

describe('exportFormatSchema', () => {
  it('fills defaults and rejects unknown values', () => {
    expect(exportFormatSchema.parse({})).toEqual({ separator: ';', decimal: '.', date: 'iso' });
    expect(exportFormatSchema.safeParse({ separator: '|' }).success).toBe(false);
  });
});
