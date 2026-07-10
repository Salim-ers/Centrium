import { describe, it, expect } from 'vitest';

import {
  computeCompleteness,
  resolveDocRequirements,
  type ConsultantForCompleteness,
} from '@/lib/alerts/completeness';
import {
  DEFAULT_ORG_NOTIFICATION_SETTINGS,
  resolveOrgSettings,
  reminderIntervalDays,
} from '@/lib/alerts/config';
import {
  detectContractAlerts,
  detectExpiringDocuments,
  detectForgottenInvoices,
  detectIncompleteProfiles,
  detectMissingTimesheets,
  previousPeriod,
} from '@/lib/alerts/detectors';
import { buildSmsBody, escalatePriority, shouldNotify } from '@/lib/alerts/reminders';

// ---------- Fixtures ----------

const TODAY = new Date('2026-07-10T08:00:00Z');

const freelance: ConsultantForCompleteness = {
  first_name: 'Alex',
  last_name: 'Martin',
  email: 'alex@exemple.fr',
  phone: '0612345678',
  job_title: 'DevOps',
  daily_rate_eur: 550,
  contract_type: 'freelance',
  status: 'available',
  city: 'Paris',
  address: '1 rue de la Paix',
  legal_status: 'SASU',
  company_name: 'Alex Conseil',
  siret: '12345678900011',
  iban: 'FR7630001007941234567890185',
  bic: 'BDFEFRPP',
};

const allFreelanceDocs = [
  { kind: 'id_card', expires_at: '2030-01-01' },
  { kind: 'kbis', expires_at: null },
  { kind: 'urssaf_vigilance', expires_at: '2026-12-01' },
  { kind: 'rc_pro', expires_at: '2027-03-01' },
  { kind: 'rib', expires_at: null },
];

// ---------- Complétude ----------

describe('computeCompleteness', () => {
  it('profil freelance complet → 100 %', () => {
    const reqs = resolveDocRequirements('freelance', null);
    const res = computeCompleteness(freelance, allFreelanceDocs, reqs, TODAY);
    expect(res.complete).toBe(true);
    expect(res.percent).toBe(100);
    expect(res.missingDocuments).toHaveLength(0);
  });

  it('freelance sans Kbis ni IBAN → incomplet avec manquants précis', () => {
    const reqs = resolveDocRequirements('freelance', null);
    const res = computeCompleteness(
      { ...freelance, iban: null },
      allFreelanceDocs.filter((d) => d.kind !== 'kbis'),
      reqs,
      TODAY,
    );
    expect(res.complete).toBe(false);
    expect(res.missingFields.map((f) => f.key)).toContain('iban');
    expect(res.missingDocuments.map((d) => d.kind)).toContain('kbis');
    expect(res.percent).toBeLessThan(100);
  });

  it('on ne demande PAS de Kbis à un salarié CDI', () => {
    const reqs = resolveDocRequirements('cdi', null);
    expect(reqs.map((r) => r.kind)).not.toContain('kbis');
    expect(reqs.map((r) => r.kind)).toContain('id_card');
  });

  it('un document expiré compte comme manquant', () => {
    const reqs = resolveDocRequirements('freelance', null);
    const docs = allFreelanceDocs.map((d) =>
      d.kind === 'rc_pro' ? { ...d, expires_at: '2026-01-01' } : d,
    );
    const res = computeCompleteness(freelance, docs, reqs, TODAY);
    expect(res.complete).toBe(false);
    expect(res.expiredDocuments.map((d) => d.kind)).toContain('rc_pro');
    expect(res.missingDocuments.map((d) => d.kind)).toContain('rc_pro');
  });

  it('un document expirant sous 30 j est signalé sans casser la complétude', () => {
    const reqs = resolveDocRequirements('freelance', null);
    const docs = allFreelanceDocs.map((d) =>
      d.kind === 'urssaf_vigilance' ? { ...d, expires_at: '2026-07-25' } : d,
    );
    const res = computeCompleteness(freelance, docs, reqs, TODAY);
    expect(res.complete).toBe(true);
    expect(res.expiringSoonDocuments.map((d) => d.kind)).toContain('urssaf_vigilance');
    expect(res.expiringSoonDocuments[0].days_left).toBe(15);
  });

  it('les overrides org remplacent les défauts du statut', () => {
    const reqs = resolveDocRequirements('freelance', [
      { contract_type: 'freelance', kind: 'custom_doc', label: 'Charte interne', required: true, active: true },
    ]);
    expect(reqs).toHaveLength(1);
    expect(reqs[0].kind).toBe('custom_doc');
  });
});

// ---------- Cadence / relances ----------

describe('shouldNotify', () => {
  const now = TODAY;

  it('premier envoi : send immédiat', () => {
    const d = shouldNotify('new', null, 7, now);
    expect(d).toEqual({ send: true, isReminder: false, reason: 'first_send' });
  });

  it('relance due après l’intervalle (7 j)', () => {
    const last = new Date(now.getTime() - 8 * 86_400_000);
    const d = shouldNotify('new', last, 7, now);
    expect(d.send).toBe(true);
    expect(d.isReminder).toBe(true);
  });

  it('pas de relance avant l’intervalle', () => {
    const last = new Date(now.getTime() - 3 * 86_400_000);
    expect(shouldNotify('new', last, 7, now).send).toBe(false);
  });

  it('alerte résolue → plus JAMAIS de relance', () => {
    const last = new Date(now.getTime() - 100 * 86_400_000);
    expect(shouldNotify('resolved', last, 7, now).send).toBe(false);
    expect(shouldNotify('dismissed', last, 7, now).send).toBe(false);
    expect(shouldNotify('snoozed', last, 7, now).send).toBe(false);
  });

  it('rejouer le cron le même jour ne renvoie pas (idempotence)', () => {
    const last = new Date(now.getTime() - 2 * 3_600_000); // il y a 2 h
    expect(shouldNotify('new', last, 7, now).send).toBe(false);
  });
});

describe('escalatePriority', () => {
  it('escalade après N relances sans résolution', () => {
    expect(escalatePriority('medium', 0, 2)).toBe('medium');
    expect(escalatePriority('medium', 2, 2)).toBe('high');
    expect(escalatePriority('medium', 4, 2)).toBe('critical');
    expect(escalatePriority('critical', 10, 2)).toBe('critical');
  });
  it('escalade désactivée (0) → priorité stable', () => {
    expect(escalatePriority('medium', 99, 0)).toBe('medium');
  });
});

describe('buildSmsBody', () => {
  it('reste sous 160 caractères, sans données sensibles', () => {
    const body = buildSmsBody(
      'Votre profil consultant est incomplet — merci de déposer vos documents manquants au plus vite pour permettre votre positionnement en mission',
      'https://www.centrium-platform.com/portal/profile',
    );
    expect(body.length).toBeLessThanOrEqual(160);
    expect(body).toContain('Centrium');
    expect(body).toContain('https://');
  });
});

// ---------- Réglages organisation ----------

describe('resolveOrgSettings', () => {
  it('sans override → défauts', () => {
    const s = resolveOrgSettings(null);
    expect(s).toEqual(DEFAULT_ORG_NOTIFICATION_SETTINGS);
  });
  it('override partiel : ne perd pas les autres clés', () => {
    const s = resolveOrgSettings({
      digest: { daily: true },
      cadences: { cra: { repeat_days: 3 } },
    } as never);
    expect(s.digest.daily).toBe(true);
    expect(s.digest.weekly).toBe(true); // conservé du défaut
    expect(s.cadences.cra.repeat_days).toBe(3);
    expect(s.cadences.cra.escalate_after_reminders).toBe(2); // conservé
    expect(s.channels.email).toBe(true);
  });
  it('cadence applicable par type d’alerte', () => {
    const s = resolveOrgSettings({ cadences: { cra: { repeat_days: 3 } } } as never);
    expect(reminderIntervalDays('timesheet_missing', s)).toBe(3);
    expect(reminderIntervalDays('contract_expiring', s)).toBe(7);
  });
});

// ---------- Détecteurs ----------

describe('previousPeriod', () => {
  it('mois standard', () => {
    expect(previousPeriod(new Date('2026-07-10T00:00:00Z'))).toEqual({ month: 6, year: 2026 });
  });
  it('janvier → décembre de l’année précédente', () => {
    expect(previousPeriod(new Date('2026-01-05T00:00:00Z'))).toEqual({ month: 12, year: 2025 });
  });
});

describe('detectMissingTimesheets', () => {
  const names = new Map([['c1', 'Alex Martin']]);
  const mission = {
    id: 'm1', title: 'Mission X', consultant_id: 'c1',
    status: 'active', start_date: '2026-01-01', end_date: null,
  };

  it('mission active sans CRA pour le mois précédent → alerte', () => {
    const out = detectMissingTimesheets([mission], [], names, TODAY);
    expect(out).toHaveLength(1);
    expect(out[0].dedupe_key).toBe('ts-missing:m1:2026-6');
    expect(out[0].kind).toBe('timesheet_missing');
  });

  it('CRA présent pour la période → aucune alerte (arrêt automatique)', () => {
    const out = detectMissingTimesheets(
      [mission],
      [{ id: 't1', mission_id: 'm1', period_month: 6, period_year: 2026, status: 'draft' }],
      names,
      TODAY,
    );
    expect(out).toHaveLength(0);
  });

  it('mission démarrée ce mois-ci → pas d’exigence rétroactive', () => {
    const out = detectMissingTimesheets(
      [{ ...mission, start_date: '2026-07-01' }], [], names, TODAY,
    );
    expect(out).toHaveLength(0);
  });
});

describe('detectForgottenInvoices', () => {
  const names = new Map([['c1', 'Alex Martin']]);
  const validated = {
    id: 't1', mission_id: 'm1', period_month: 5, period_year: 2026,
    status: 'client_validated', validated_at: '2026-06-20T10:00:00Z',
    consultant_id: 'c1', days_validated: 18,
  };

  it('CRA validé depuis 8 j sans facture → alerte critique', () => {
    const out = detectForgottenInvoices(
      [validated], [], names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('invoice_forgotten');
    expect(out[0].priority).toBe('critical');
  });

  it('facture client liée → aucune alerte', () => {
    const out = detectForgottenInvoices(
      [validated],
      [{
        id: 'i1', timesheet_id: 't1', status: 'sent', party: 'client',
        issue_date: '2026-06-21', created_at: '2026-06-21T10:00:00Z',
        invoice_number: 'F-1', due_date: '2026-07-21',
      }],
      names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out).toHaveLength(0);
  });

  it('validé il y a moins que le seuil → pas encore d’alerte', () => {
    const out = detectForgottenInvoices(
      [{ ...validated, validated_at: '2026-07-08T10:00:00Z' }],
      [], names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out).toHaveLength(0);
  });
});

describe('detectContractAlerts', () => {
  const names = new Map([['c1', 'Alex Martin']]);
  const activeMission = {
    id: 'm1', title: 'Mission X', consultant_id: 'c1',
    status: 'active', start_date: '2026-01-01', end_date: null,
  };

  it('consultant en mission sans contrat actif → alerte critique', () => {
    const out = detectContractAlerts([], [activeMission], names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY);
    const noContract = out.find((a) => a.kind === 'mission_no_contract');
    expect(noContract).toBeDefined();
    expect(noContract!.priority).toBe('critical');
  });

  it('contrat signé couvrant le consultant → pas d’alerte mission_no_contract', () => {
    const out = detectContractAlerts(
      [{
        id: 'k1', title: 'AT Alex', status: 'signed', consultant_id: 'c1',
        mission_id: 'm1', party: 'consultant', start_date: '2026-01-01',
        end_date: null, created_at: '2026-01-01T00:00:00Z', updated_at: null,
      }],
      [activeMission], names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out.find((a) => a.kind === 'mission_no_contract')).toBeUndefined();
  });

  it('contrat envoyé non signé depuis ≥ 3 j → relance signature', () => {
    const out = detectContractAlerts(
      [{
        id: 'k1', title: 'AT Alex', status: 'sent', consultant_id: 'c1',
        mission_id: null, party: 'consultant', start_date: '2026-07-01',
        end_date: null, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
      }],
      [], names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out.find((a) => a.kind === 'contract_pending_signature')).toBeDefined();
  });

  it('contrat actif expirant sous 15 j → priorité high', () => {
    const out = detectContractAlerts(
      [{
        id: 'k1', title: 'AT Alex', status: 'active', consultant_id: 'c1',
        mission_id: null, party: 'consultant', start_date: '2026-01-01',
        end_date: '2026-07-20', created_at: '2026-01-01T00:00:00Z', updated_at: null,
      }],
      [], names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    const exp = out.find((a) => a.kind === 'contract_expiring');
    expect(exp).toBeDefined();
    expect(exp!.priority).toBe('high');
  });

  it('mission dépassée (end_date passée, statut actif) → mission_overrun', () => {
    const out = detectContractAlerts(
      [{
        id: 'k1', title: 'AT', status: 'signed', consultant_id: 'c1',
        mission_id: null, party: 'consultant', start_date: '2026-01-01',
        end_date: null, created_at: '2026-01-01T00:00:00Z', updated_at: null,
      }],
      [{ ...activeMission, end_date: '2026-06-30' }],
      names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out.find((a) => a.kind === 'mission_overrun')).toBeDefined();
  });
});

describe('detectExpiringDocuments', () => {
  const names = new Map([['c1', 'Alex Martin']]);

  it('document expirant dans 7 j → alerte high, dedupe par document', () => {
    const out = detectExpiringDocuments(
      [{ id: 'd1', consultant_id: 'c1', kind: 'rc_pro', file_name: 'rc.pdf', expires_at: '2026-07-17' }],
      names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out).toHaveLength(1);
    expect(out[0].dedupe_key).toBe('doc-expiry:d1');
    expect(out[0].priority).toBe('high');
  });

  it('document expiré → critique ; document lointain → rien', () => {
    const out = detectExpiringDocuments(
      [
        { id: 'd1', consultant_id: 'c1', kind: 'kbis', file_name: 'k.pdf', expires_at: '2026-07-01' },
        { id: 'd2', consultant_id: 'c1', kind: 'rib', file_name: 'r.pdf', expires_at: '2027-07-01' },
        { id: 'd3', consultant_id: 'c1', kind: 'rib', file_name: 'r2.pdf', expires_at: null },
      ],
      names, DEFAULT_ORG_NOTIFICATION_SETTINGS, TODAY,
    );
    expect(out).toHaveLength(1);
    expect(out[0].priority).toBe('critical');
  });
});

describe('detectIncompleteProfiles', () => {
  it('dedupe_key stable par consultant + prospects/archivés exclus', () => {
    const base = {
      ...freelance, id: 'c1', archived: false, is_prospect: false,
      email: null, // manquant → incomplet
    };
    const out = detectIncompleteProfiles(
      [
        base,
        { ...base, id: 'c2', is_prospect: true },
        { ...base, id: 'c3', archived: true },
      ],
      new Map(),
      null,
      TODAY,
    );
    expect(out).toHaveLength(1);
    expect(out[0].dedupe_key).toBe('profile-incomplete:c1');
    expect(out[0].notify).toBe('both');
  });
});
