// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { extractText, getDocumentProxy } from 'unpdf';

import { resolveBrand } from '@/lib/cv/branding';
import { DOSSIER_TEMPLATES, dossierTemplate, isDossierTemplateId } from '@/lib/cv/templates';
import { DossierPDF, mixWithWhite } from '@/components/cv/pdf/DossierPDF';
import { tint } from '@/components/cv/DossierDocument';
import type { OrgBranding } from '@/lib/auth/context';
import type { CVContent } from '@/types';

const content: CVContent = {
  header: { displayName: 'Prénom Nom', jobTitle: 'Intitulé', subTitle: null, yearsExperience: 6, location: 'Ville', mobility: null, availability: null },
  summary: 'Résumé.',
  skillCategories: [{ name: 'Catégorie', items: ['A', 'B'] }],
  experiences: [
    { id: 'x', consultant_id: 'c', client_name: 'Client', role: 'Rôle', start_date: '2023-01-01', end_date: null, context: 'Contexte', tasks: ['Tâche'], environment: ['Outil'], order_index: 1, created_at: '' },
  ],
  educations: [{ id: 'e', consultant_id: 'c', year: 2015, degree: 'Diplôme', institution: null, created_at: '' }],
  languages: [{ code: 'fr', level: 'Natif' }],
};

const org = (over: Partial<OrgBranding>) => ({ name: 'Atlas Conseil', brandName: null, footerTagline: null, primaryColor: null, accentColor: null, logoUrl: null, ...over }) as OrgBranding;

describe('resolveBrand', () => {
  it('falls back to the organization name and neutral colors, never another vendor', () => {
    const b = resolveBrand(org({}));
    expect(b.brandName).toBe('Atlas Conseil');
    expect(b.footerTagline).toBe('');
    expect(b.primary).toBe('#23201d');
    expect(b.logoUrl).toBeNull();
    expect(JSON.stringify({ ...b, qrCodeUrl: null })).not.toMatch(/quadcore/i);
  });

  it('uses the organization identity when configured', () => {
    const b = resolveBrand(org({ brandName: 'Atlas', footerTagline: 'Conseil IT', primaryColor: '#1d4ed8', accentColor: '#16a34a' }));
    expect([b.brandName, b.footerTagline, b.primary, b.accent]).toEqual(['Atlas', 'Conseil IT', '#1d4ed8', '#16a34a']);
  });

  it('has no brand name at all without an organization', () => {
    expect(resolveBrand(null).brandName).toBe('');
  });
});

describe('dossier templates', () => {
  it('offers four neutral layouts, three of them storable as default', () => {
    expect(DOSSIER_TEMPLATES.map((t) => t.name)).toEqual(['Minimal', 'Consulting', 'Executive', 'Compact']);
    expect(DOSSIER_TEMPLATES.filter((t) => t.persistable).map((t) => t.id)).toEqual(['standard', 'executive', 'dense']);
    expect(dossierTemplate('unknown').name).toBe('Consulting');
    expect(isDossierTemplateId('minimal')).toBe(true);
    expect(isDossierTemplateId('quadcore')).toBe(false);
  });

  it('derives tints from the brand color', () => {
    expect(tint('#1d4ed8', 0.1)).toBe('rgba(29, 78, 216, 0.1)');
    expect(mixWithWhite('#000000', 0.5)).toBe('#808080');
    expect(mixWithWhite('#1d4ed8', 0)).toBe('#ffffff');
  });

  it.each(DOSSIER_TEMPLATES.map((t) => t.id))('renders the %s PDF with its footer on every page', async (id) => {
    const brand = resolveBrand(org({ footerTagline: 'Conseil IT' }));
    const buf = await renderToBuffer(<DossierPDF content={content} template={id} brand={brand} />);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    // Régression : un interligne posé sur la page masquait le pied de page fixe.
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: true });
    expect(text).toContain('Atlas Conseil — Conseil IT');
    expect(text).toContain('1 / 1');
  }, 30000);
});
