import { describe, expect, it } from 'vitest';

import { DEFAULT_MARGIN_POLICY, marginLevel, marginPolicySchema, resolveMarginPolicy, simulateMargin } from '@/lib/finance/margin-policy';

describe('marginPolicySchema', () => {
  it('should accept a target below the good-margin threshold', () => {
    expect(marginPolicySchema.safeParse({ target: 18, good: 28 }).success).toBe(true);
  });

  it('should reject a good-margin threshold not above the target', () => {
    expect(marginPolicySchema.safeParse({ target: 25, good: 25 }).success).toBe(false);
    expect(marginPolicySchema.safeParse({ target: -5, good: 20 }).success).toBe(false);
  });
});

describe('resolveMarginPolicy', () => {
  it('should fall back on defaults when nothing valid is stored', () => {
    expect(resolveMarginPolicy(undefined)).toEqual(DEFAULT_MARGIN_POLICY);
    expect(resolveMarginPolicy({ target: 'x' })).toEqual(DEFAULT_MARGIN_POLICY);
  });

  it('should return the stored policy', () => {
    expect(resolveMarginPolicy({ target: 22, good: 35 })).toEqual({ target: 22, good: 35 });
  });
});

describe('marginLevel', () => {
  const policy = { target: 20, good: 30 };

  it('should rate margins against the organisation target and threshold', () => {
    expect(marginLevel(14, policy)).toBe('low');
    expect(marginLevel(20, policy)).toBe('fair');
    expect(marginLevel(29.9, policy)).toBe('fair');
    expect(marginLevel(30, policy)).toBe('good');
  });

  it('should let a consultant target take precedence', () => {
    expect(marginLevel(24, policy, 25)).toBe('low');
    // Objectif propre au-dessus du seuil de bonne marge : bonne dès l'objectif atteint.
    expect(marginLevel(36, policy, 35)).toBe('good');
  });
});

describe('simulateMargin', () => {
  it('should compute margin per day, percentage and monthly estimate', () => {
    // Arrange / Act
    const s = simulateMargin(650, 480);

    // Assert
    expect(s.perDay).toBe(170);
    expect(s.pct).toBeCloseTo(26.15, 2);
    expect(s.monthly).toBe(3400);
  });

  it('should not compute a percentage without a rate', () => {
    expect(simulateMargin(0, 300).pct).toBeNull();
  });
});
