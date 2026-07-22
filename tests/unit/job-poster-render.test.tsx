// @vitest-environment node
//
// Test de rendu RÉEL avec le vrai moteur PDF (@react-pdf/renderer, le même
// qu'en production). On rend chaque fixture en buffer PDF et on vérifie
// qu'elle tient sur EXACTEMENT une page A4 — la garantie centrale de la
// fiche de poste (section 23/24 du cahier des charges, adaptée à React-PDF
// pour lequel Playwright/DOM ne s'applique pas).

import zlib from 'node:zlib';
import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';

import type { JobOffer } from '@/types';
import { JobOfferPosterPDF } from '@/components/offers/pdf/JobOfferPosterPDF';

// Génère un vrai PNG RVB valide WxH (gris uni) en data URI, sans réseau —
// pour exercer le rendu du logo (object-fit contain) avec de vraies
// dimensions (logo horizontal vs carré).
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function makePng(w: number, h: number): string {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 160)]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const idat = zlib.deflateSync(raw);
  const png = Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}
const LOGO_WIDE = makePng(120, 40);
const LOGO_SQUARE = makePng(80, 80);

function makeOffer(p: Partial<JobOffer> = {}): JobOffer {
  return {
    id: 'o1',
    organization_id: 'org1',
    company_id: null,
    contact_id: null,
    owner_id: null,
    title: 'Chargé(e) de Tests H/F – JIRA / XRAY / SOAPUI',
    description: null,
    required_skills: ['JIRA', 'XRAY', 'SQL'],
    nice_to_have: [],
    seniority: 'senior',
    daily_rate_min: 450,
    daily_rate_max: 550,
    location: 'Paris',
    remote_days: 2,
    start_date: null,
    duration_months: 6,
    deadline: null,
    status: 'open',
    source_kind: null,
    source: null,
    context:
      "Mission auprès d'un grand compte du secteur du transport au sein des équipes en charge des solutions de données et de facturation.",
    mission_purpose:
      'Garantir la qualité fonctionnelle des applications du domaine en concevant et exécutant les campagnes de tests.',
    tasks: [
      'Concevoir les stratégies et plans de tests',
      'Préparer les jeux de données',
      'Exécuter les campagnes de recette',
      'Identifier et documenter les anomalies',
    ],
    tech_stack: ['JIRA', 'XRAY', 'SOAPUI', 'POSTMAN', 'SQL'],
    profile_requirements: [
      'Expérience significative en tests fonctionnels',
      'Maîtrise de JIRA / XRAY',
      'Autonomie et rigueur',
    ],
    working_conditions: [],
    contract_kind: 'Freelance',
    show_rate: null,
    work_mode: 'hybrid',
    work_mode_detail: null,
    start_type: 'asap',
    start_label: null,
    experience_label: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...p,
  };
}

/** Compte les objets /Type /Page (hors /Pages) dans le buffer PDF. */
function pdfPageCount(buf: Buffer): number {
  const s = buf.toString('latin1');
  const m = s.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return m ? m.length : 0;
}

async function renderPages(offer: JobOffer, logoSrc?: string): Promise<number> {
  const buf = await renderToBuffer(
    <JobOfferPosterPDF offer={offer} logoSrc={logoSrc} contactEmail="rh@exemple.fr" locale="fr" />,
  );
  return pdfPageCount(buf);
}

const longTitle =
  'Chargé(e) de Tests Fonctionnels et Techniques H/F – JIRA / XRAY / SOAPUI / POSTMAN / SQL / SHELL / DEVOPS';
const bigText = (n: number) =>
  Array.from({ length: n }, (_, i) => `Élément détaillé numéro ${i + 1} décrivant une responsabilité précise`);

const CASES: { name: string; offer: JobOffer; logo?: string }[] = [
  { name: '01 titre + contenu courts', offer: makeOffer({ title: 'Dev', context: 'Court.', tasks: ['A'], profile_requirements: ['B'], tech_stack: ['Go'] }) },
  { name: '02 titre extrêmement long', offer: makeOffer({ title: longTitle }) },
  { name: '03 nom d’organisation très long (via contexte long)', offer: makeOffer({ context: 'x'.repeat(560) }) },
  { name: '04 dix technologies', offer: makeOffer({ tech_stack: ['JIRA', 'XRAY', 'SOAPUI', 'POSTMAN', 'SQL', 'SHELL', 'DEVOPS', 'JENKINS', 'GIT', 'DOCKER'] }) },
  { name: '05 TJM désactivé', offer: makeOffer({ show_rate: false }) },
  { name: '06 TJM activé', offer: makeOffer({ show_rate: true }) },
  { name: '07 hybride sans nombre de jours', offer: makeOffer({ work_mode: 'hybrid', remote_days: null }) },
  { name: '08 ASAP', offer: makeOffer({ start_type: 'asap', start_date: null }) },
  { name: '09 date précise', offer: makeOffer({ start_type: 'date', start_date: '2026-08-03' }) },
  { name: '10 contenu IA très long', offer: makeOffer({ context: 'x'.repeat(900), mission_purpose: 'y'.repeat(400), tasks: bigText(12), profile_requirements: bigText(12), working_conditions: bigText(6), tech_stack: Array.from({ length: 14 }, (_, i) => `TECH${i}`) }) },
  { name: '11 logo horizontal', offer: makeOffer(), logo: LOGO_WIDE },
  { name: '12 logo carré', offer: makeOffer(), logo: LOGO_SQUARE },
  { name: '13 informations absentes', offer: makeOffer({ location: null, work_mode: null, start_type: null, start_date: null, remote_days: null, seniority: null, duration_months: null, contract_kind: null, mission_purpose: null, working_conditions: [] }) },
];

describe('Fiche de poste — rendu réel : toujours exactement 1 page A4', () => {
  for (const c of CASES) {
    it(
      c.name,
      async () => {
        const pages = await renderPages(c.offer, c.logo);
        expect(pages).toBe(1);
      },
      15000,
    );
  }

  it('rend aussi en anglais sur 1 page', async () => {
    const buf = await renderToBuffer(
      <JobOfferPosterPDF offer={makeOffer()} contactEmail="hr@example.com" locale="en" />,
    );
    expect(pdfPageCount(buf)).toBe(1);
  });
});
