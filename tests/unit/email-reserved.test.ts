import { describe, expect, it } from 'vitest';

import { isReservedEmail } from '@/lib/email/send';

describe('isReservedEmail', () => {
  it('ne délivre jamais aux domaines réservés (démo, tests)', () => {
    expect(isReservedEmail('demo-esn@demo.centrium.invalid')).toBe(true);
    expect(isReservedEmail('claire.vidal@nordal.example')).toBe(true);
    expect(isReservedEmail('a@example.com')).toBe(true);
    expect(isReservedEmail('a@x.test')).toBe(true);
  });

  it('laisse passer les vrais domaines, même proches', () => {
    expect(isReservedEmail('contact@latest.fr')).toBe(false);
    expect(isReservedEmail('jean@example-conseil.fr')).toBe(false);
    expect(isReservedEmail('salim@centrium-platform.com')).toBe(false);
  });
});
