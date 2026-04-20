import { describe, it, expect } from 'vitest';
import {
  consultantSchema,
  contactSchema,
  opportunitySchema,
  invoiceSchema,
  loginSchema,
} from '@/lib/validators';

describe('consultantSchema', () => {
  it('accepts valid consultant data', () => {
    const result = consultantSchema.safeParse({
      first_name: 'Alex',
      last_name: 'Dupont',
      job_title: 'QA Automation',
      seniority: 'confirmed',
      years_experience: 7,
      status: 'available',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty first_name', () => {
    const result = consultantSchema.safeParse({
      first_name: '',
      last_name: 'Dupont',
      job_title: 'QA',
      seniority: 'confirmed',
      years_experience: 7,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid seniority enum', () => {
    const result = consultantSchema.safeParse({
      first_name: 'Alex',
      last_name: 'Dupont',
      job_title: 'QA',
      seniority: 'demi-dieu',
      years_experience: 7,
    });
    expect(result.success).toBe(false);
  });

  it('coerces string years_experience to number', () => {
    const result = consultantSchema.safeParse({
      first_name: 'Alex',
      last_name: 'Dupont',
      job_title: 'QA',
      seniority: 'confirmed',
      years_experience: '7',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.years_experience).toBe(7);
    }
  });
});

describe('contactSchema', () => {
  it('accepts valid contact', () => {
    const result = contactSchema.safeParse({
      first_name: 'Claire',
      last_name: 'Rousseau',
      contact_type: 'manager',
      email: 'c.rousseau@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({
      first_name: 'Claire',
      last_name: 'Rousseau',
      contact_type: 'manager',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('allows empty email', () => {
    const result = contactSchema.safeParse({
      first_name: 'Claire',
      last_name: 'Rousseau',
      contact_type: 'manager',
      email: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('opportunitySchema', () => {
  it('accepts minimal valid opportunity', () => {
    const result = opportunitySchema.safeParse({ title: 'Mission BNP' });
    expect(result.success).toBe(true);
  });

  it('clamps probability between 0 and 100', () => {
    const r1 = opportunitySchema.safeParse({ title: 'M', probability: 150 });
    expect(r1.success).toBe(false);
    const r2 = opportunitySchema.safeParse({ title: 'M', probability: -5 });
    expect(r2.success).toBe(false);
    const r3 = opportunitySchema.safeParse({ title: 'M', probability: 75 });
    expect(r3.success).toBe(true);
  });
});

describe('invoiceSchema', () => {
  it('accepts valid invoice', () => {
    const result = invoiceSchema.safeParse({
      company_id: '11111111-1111-1111-1111-111111111111',
      invoice_number: 'FAC-2026-0001',
      issue_date: '2026-04-01',
      due_date: '2026-05-01',
      amount_ht: 11550,
      vat_rate: 20,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for company_id', () => {
    const result = invoiceSchema.safeParse({
      company_id: 'not-a-uuid',
      invoice_number: 'FAC-2026-0001',
      issue_date: '2026-04-01',
      due_date: '2026-05-01',
      amount_ht: 11550,
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('validates email and password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@quadcore.fr',
      password: 'hunter2',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@quadcore.fr',
      password: '123',
    });
    expect(result.success).toBe(false);
  });
});
