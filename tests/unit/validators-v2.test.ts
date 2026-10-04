import { describe, expect, it } from 'vitest';

import {
  clientRequestSchema,
  clientSchema,
  consultantFinancialsSchema,
  documentTemplateSchema,
  missionSchema,
  opportunityV2Schema,
  quoteSchema,
  skillList,
  taskSchema,
} from '@/lib/validators/v2';

const ID = '7b0c3a1e-2f4d-4c5b-9a6e-1d2c3b4a5f60';

describe('opportunityV2Schema', () => {
  it('accepts a minimal opportunity and normalises empty fields', () => {
    // Arrange
    const input = { title: 'Renfort data', company_id: '', start_date: '', required_skills: ['React', 'react', ' SQL '] };

    // Act
    const r = opportunityV2Schema.safeParse(input);

    // Assert
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.company_id).toBeNull();
      expect(r.data.start_date).toBeNull();
      expect(r.data.status).toBe('new');
      expect(r.data.required_skills).toEqual(['React', 'SQL']);
    }
  });

  it('rejects an out-of-range probability and a short title', () => {
    expect(opportunityV2Schema.safeParse({ title: 'A' }).success).toBe(false);
    expect(opportunityV2Schema.safeParse({ title: 'Mission', probability: 140 }).success).toBe(false);
  });
});

describe('taskSchema', () => {
  it('accepts a task linked to an entity', () => {
    expect(taskSchema.safeParse({ title: 'Relancer', entity_type: 'opportunity', entity_id: ID, due_date: '2026-10-10' }).success).toBe(true);
  });
  it('rejects a malformed due date', () => {
    expect(taskSchema.safeParse({ title: 'Relancer', due_date: '10/10/2026' }).success).toBe(false);
  });
});

describe('clientSchema', () => {
  it('accepts a client with an empty website', () => {
    const r = clientSchema.safeParse({ name: 'Acme', website: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.website).toBeNull();
  });
  it('rejects an invalid website URL', () => {
    expect(clientSchema.safeParse({ name: 'Acme', website: 'pas une url' }).success).toBe(false);
  });
});

describe('missionSchema', () => {
  const base = { title: 'Lead dev', consultant_id: ID, daily_rate_eur: 650, start_date: '2026-11-02' };
  it('accepts a mission with a later end date', () => {
    expect(missionSchema.safeParse({ ...base, end_date: '2027-04-30' }).success).toBe(true);
  });
  it('rejects an end date before the start date', () => {
    expect(missionSchema.safeParse({ ...base, end_date: '2026-10-01' }).success).toBe(false);
  });
});

describe('consultantFinancialsSchema', () => {
  it('accepts a daily cost and margin target', () => {
    expect(consultantFinancialsSchema.safeParse({ daily_cost_eur: 420, target_margin_pct: 30 }).success).toBe(true);
  });
  it('rejects a negative daily cost', () => {
    expect(consultantFinancialsSchema.safeParse({ daily_cost_eur: -1 }).success).toBe(false);
  });
});

describe('clientRequestSchema', () => {
  it('accepts a portal request', () => {
    expect(clientRequestSchema.safeParse({ title: 'Développeur Java senior', skills: ['Java'], seniority: 'senior', duration_months: 6 }).success).toBe(true);
  });
  it('rejects an unknown seniority and a zero duration', () => {
    expect(clientRequestSchema.safeParse({ title: 'Dev Java', seniority: 'guru' }).success).toBe(false);
    expect(clientRequestSchema.safeParse({ title: 'Dev Java', duration_months: 0 }).success).toBe(false);
  });
});

describe('quoteSchema', () => {
  const base = { title: 'Renfort T1', issue_date: '2026-10-04', items: [{ description: 'Développeur', quantity: '20', unit_price: '600' }] };
  it('accepts a quote and coerces numeric strings', () => {
    const r = quoteSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.items[0]!.quantity).toBe(20);
      expect(r.data.items[0]!.unit).toBe('jour');
      expect(r.data.vat_rate).toBe(20);
    }
  });
  it('rejects a quote without lines or with a negative price', () => {
    expect(quoteSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(quoteSchema.safeParse({ ...base, items: [{ description: 'X', quantity: 1, unit_price: -5 }] }).success).toBe(false);
  });
});

describe('documentTemplateSchema', () => {
  it('accepts a quote template', () => {
    const r = documentTemplateSchema.safeParse({ kind: 'quote', name: 'Standard', terms_text: 'Paiement à 30 jours.' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.is_default).toBe(false);
  });
  it('rejects an unsupported kind and an empty name', () => {
    expect(documentTemplateSchema.safeParse({ kind: 'invoice', name: 'X' }).success).toBe(false);
    expect(documentTemplateSchema.safeParse({ kind: 'quote', name: '  ' }).success).toBe(false);
  });
});

describe('skillList', () => {
  it('caps the list at 40 entries', () => {
    expect(skillList.safeParse(Array.from({ length: 41 }, (_, i) => `s${i}`)).success).toBe(false);
  });
});
