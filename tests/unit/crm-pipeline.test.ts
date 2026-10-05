import { describe, expect, it } from 'vitest';
import { OPEN_STAGES, PIPELINE_STAGES, nextStage } from '@/lib/crm/pipeline';
import { followUpState, pipelineSentence, summarizePipeline } from '@/lib/crm/summary';
import { HIDDEN_PAGES, NAV_ITEMS, SECTION_TABS, activeSectionTab, breadcrumb, canSeeNavItem, isNavItemActive } from '@/lib/navigation';
import type { Permission } from '@/lib/auth/permissions';
import type { OpportunityStatus } from '@/types';

const opp = (status: OpportunityStatus, extra: Partial<{ expected_revenue: number | null; next_follow_up: string | null; archived: boolean }> = {}) => ({
  id: Math.random().toString(36).slice(2),
  status,
  expected_revenue: 10000,
  probability: 50,
  daily_rate_eur: null,
  duration_months: null,
  next_follow_up: null,
  ...extra,
});

describe('CRM : étapes du tableau', () => {
  it('affiche les cinq étapes de travail, sans gagné ni perdu', () => {
    // Arrange / Act
    const ids = OPEN_STAGES.map((s) => s.id);
    // Assert
    expect(ids).toEqual(['prospect', 'qualified', 'meeting', 'proposal', 'negotiation']);
  });

  it('donne une explication courte pour chaque étape', () => {
    for (const s of PIPELINE_STAGES) {
      expect(s.hint.fr.length).toBeGreaterThan(0);
      expect(s.hint.en.length).toBeGreaterThan(0);
    }
  });

  it('propose l’étape suivante, et rien après la négociation', () => {
    expect(nextStage('prospect')?.id).toBe('qualified');
    expect(nextStage('proposal')?.id).toBe('negotiation');
    expect(nextStage('negotiation')).toBeNull();
    expect(nextStage('won')).toBeNull();
    expect(nextStage(null)).toBeNull();
  });
});

describe('CRM : résumé du pipeline', () => {
  const today = '2026-10-04';

  it('compte les opportunités en cours, le montant et les relances en retard', () => {
    // Arrange
    const opps = [
      opp('new', { next_follow_up: '2026-10-01' }),
      opp('cv_sent', { expected_revenue: 30000, next_follow_up: today }),
      opp('negotiation', { next_follow_up: '2026-10-09' }),
      opp('won', { next_follow_up: '2026-09-01' }),
      opp('on_hold', { next_follow_up: '2026-09-01' }),
    ];
    // Act
    const s = summarizePipeline(opps, today);
    // Assert : gagnée et en veille ne sont pas « en cours »
    expect(s).toEqual({ open: 3, amount: 50000, overdue: 1 });
  });

  it('écrit une phrase simple, sans jargon', () => {
    expect(pipelineSentence({ open: 7, amount: 678000, overdue: 2 }, 'fr')).toMatch(/^7 opportunités en cours · 678.*k€ en jeu · 2 relances en retard$/);
    expect(pipelineSentence({ open: 1, amount: 0, overdue: 0 }, 'fr')).toBe('1 opportunité en cours');
    expect(pipelineSentence({ open: 0, amount: 0, overdue: 0 }, 'fr')).toBe('Aucune opportunité en cours.');
    expect(pipelineSentence({ open: 2, amount: 0, overdue: 1 }, 'en')).toBe('2 open opportunities · 1 overdue follow-up');
  });

  it('classe une relance : en retard, aujourd’hui, à venir', () => {
    expect(followUpState('2026-10-03', today)).toBe('late');
    expect(followUpState(today, today)).toBe('today');
    expect(followUpState('2026-10-05', today)).toBe('upcoming');
    expect(followUpState(null, today)).toBeNull();
  });
});

describe('Navigation V2 : huit destinations, un seul niveau d’onglets', () => {
  const byId = (id: string) => NAV_ITEMS.find((i) => i.id === id)!;
  const canWith = (perms: Permission[]) => (p: Permission) => perms.includes(p);

  it('expose exactement les huit destinations prévues, dans l’ordre', () => {
    expect(NAV_ITEMS.map((i) => i.id)).toEqual(['dashboard', 'crm', 'talents', 'staffing', 'missions', 'operations', 'analytics', 'portals']);
  });

  it('regroupe opportunités, clients et contacts dans le CRM', () => {
    for (const path of ['/crm', '/opportunities/abc', '/clients', '/clients/abc', '/contacts', '/crm/tasks']) {
      expect(isNavItemActive(byId('crm'), path)).toBe(true);
    }
    // La finance voit les clients sans le droit CRM.
    expect(canSeeNavItem(byId('crm'), canWith(['clients.view']))).toBe(true);
    expect(canSeeNavItem(byId('crm'), canWith(['finance.view']))).toBe(false);
  });

  it('retire le CV Optimizer du menu : il devient le dossier de compétences des Talents', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/cv-optimizer')).toBe(false);
    expect(HIDDEN_PAGES.some((p) => p.href === '/cv-optimizer')).toBe(true);
    expect(isNavItemActive(byId('talents'), '/cv-optimizer')).toBe(true);
  });

  it('range CRA, documents et finance sous Opérations', () => {
    for (const path of ['/timesheets', '/documents', '/documents/quotes/new', '/finance', '/invoices']) {
      expect(isNavItemActive(byId('operations'), path)).toBe(true);
    }
  });

  it('choisit l’onglet le plus spécifique', () => {
    expect(activeSectionTab(SECTION_TABS.crm, '/crm/tasks')?.href).toBe('/crm/tasks');
    expect(activeSectionTab(SECTION_TABS.crm, '/crm')?.href).toBe('/crm');
    expect(activeSectionTab(SECTION_TABS.crm, '/opportunities/abc')?.href).toBe('/crm');
    expect(activeSectionTab(SECTION_TABS.staffing, '/matching')?.href).toBe('/matching');
  });

  it('construit un fil d’Ariane court : destination, puis onglet', () => {
    expect(breadcrumb('/clients/abc', 'fr')).toEqual(['CRM', 'Clients']);
    expect(breadcrumb('/finance', 'fr')).toEqual(['Opérations', 'Pilotage financier']);
    expect(breadcrumb('/missions/abc', 'fr')).toEqual(['Missions']);
    expect(breadcrumb('/cv-optimizer', 'fr')).toEqual(['Talents']);
  });
});
