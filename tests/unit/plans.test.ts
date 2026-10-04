import { describe, expect, it } from 'vitest';

import { PLAN_CATALOG, isSelfServicePlan, nextPlan, planLabel } from '@/lib/billing/plans';

describe('plan catalogue', () => {
  it('prices yearly plans at 10 months', () => {
    for (const p of Object.values(PLAN_CATALOG)) {
      if (p.yearlyEur != null) expect(p.yearlyEur).toBe(p.monthlyEur * 10);
    }
  });

  it('only allows online checkout for Starter, Team and Growth', () => {
    expect(isSelfServicePlan('v2_team')).toBe(true);
    expect(isSelfServicePlan('v2_scale')).toBe(false);
    expect(isSelfServicePlan('starter')).toBe(false);
    expect(isSelfServicePlan(null)).toBe(false);
  });

  it('suggests the next tier, mapping legacy plans onto V2', () => {
    expect(nextPlan('v2_starter')).toBe('v2_team');
    expect(nextPlan('v2_growth')).toBe('v2_scale');
    expect(nextPlan('growth')).toBe('v2_growth');
    expect(nextPlan('v2_scale')).toBeNull();
  });

  it('labels legacy and quote-based plans honestly', () => {
    expect(planLabel('enterprise')).toBe('Illimité (offre historique)');
    expect(planLabel('v2_scale')).toBe('Scale — dès 299 € HT/mois');
    expect(planLabel('v2_team', 'en')).toBe('Team — €99 excl. VAT/month');
  });
});
