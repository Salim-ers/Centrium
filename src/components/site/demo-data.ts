// =========================================================================
// Données d'EXEMPLE des scènes produit du site. Elles illustrent l'interface
// et sont toujours présentées comme telles (« Données d'exemple ») : sociétés
// et personnes fictives, aucun chiffre présenté comme un résultat client.
// =========================================================================

import type { SeriesPoint } from '@/components/bento/charts';
import type { ActivityRow, ClientRow, KpiData, MissionRow, PipelineStage, StaffRow, TodoItem } from '@/components/bento/widgets';

export const EXAMPLE_LABEL = 'Données d’exemple';

export const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
export const eurK = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€` : eur(n));

export const KPIS: KpiData[] = [
  { label: 'CA signé', value: '184,2 k€', delta: 12.4, spark: [96, 104, 101, 118, 126, 131, 129, 142, 151, 163, 171, 184], foot: 'vs. trimestre précédent', progress: 74 },
  { label: 'Marge', value: '31,8 %', delta: 2.1, spark: [27, 28, 27.5, 29, 29.6, 30.1, 29.8, 30.6, 31, 31.4, 31.2, 31.8], foot: 'Marge brute moyenne' },
  { label: 'Taux d’occupation', value: '87 %', delta: -1.5, spark: [82, 84, 86, 88, 89, 88, 90, 89, 88, 87, 88, 87], foot: '26 consultants sur 30', progress: 87 },
  { label: 'Pipeline pondéré', value: '312 k€', delta: 8.9, spark: [210, 228, 240, 236, 252, 270, 266, 281, 290, 301, 296, 312], foot: '18 opportunités ouvertes' },
];

export const TODO: TodoItem[] = [
  { id: 't1', label: 'CRA à valider', detail: 'Septembre · 4 consultants', count: 4 },
  { id: 't2', label: 'Mission Nordal se termine', detail: 'Dans 21 jours · prévoir la suite' },
  { id: 't3', label: 'Relancer Helio Retail', detail: 'Devis envoyé il y a 12 jours' },
  { id: 't4', label: 'Nouveau besoin client', detail: 'Varenne Énergie · Data engineer' },
];

const MONTHS = ['Nov.', 'Déc.', 'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.'];
const REV = [118, 124, 121, 133, 139, 146, 151, 149, 158, 141, 167, 172];
const MAR = [34, 36, 35, 39, 42, 44, 47, 46, 50, 44, 53, 55];
export const SERIES: SeriesPoint[] = MONTHS.map((label, i) => ({
  label,
  revenue: REV[i]! * 1000,
  margin: MAR[i]! * 1000,
  forecast: i >= 9 ? (REV[i]! + 6 + (i - 9) * 4) * 1000 : null,
}));

export const STAFF: StaffRow[] = [
  { id: 's1', name: 'Camille R.', initials: 'CR', status: 'mission', detail: 'Nordal Assurances · Lead dev', days: 21, segments: [{ from: 0, to: 0.62, kind: 'mission' }, { from: 0.68, to: 1, kind: 'proposed' }] },
  { id: 's2', name: 'Yanis B.', initials: 'YB', status: 'available', detail: 'Disponible · Data engineer', segments: [{ from: 0.18, to: 0.9, kind: 'proposed' }] },
  { id: 's3', name: 'Inès M.', initials: 'IM', status: 'soon', detail: 'Fin de mission le 31 oct.', days: 27, segments: [{ from: 0, to: 0.45, kind: 'mission' }] },
  { id: 's4', name: 'Hugo L.', initials: 'HL', status: 'mission', detail: 'Helio Retail · DevOps', segments: [{ from: 0, to: 1, kind: 'mission' }] },
  { id: 's5', name: 'Léa D.', initials: 'LD', status: 'leave', detail: 'Congés jusqu’au 14 oct.', segments: [{ from: 0, to: 0.2, kind: 'leave' }, { from: 0.25, to: 1, kind: 'mission' }] },
];

export const MISSIONS: MissionRow[] = [
  { id: 'm1', client: 'Nordal Assurances', consultant: 'Camille R.', progress: 82, end: '25 oct.', daysLeft: 21, marginPct: 34 },
  { id: 'm2', client: 'Helio Retail', consultant: 'Hugo L.', progress: 46, end: '12 mars', daysLeft: 159, marginPct: 29 },
  { id: 'm3', client: 'Varenne Énergie', consultant: 'Inès M.', progress: 91, end: '31 oct.', daysLeft: 27, marginPct: 31 },
];

export const PIPELINE: PipelineStage[] = [
  { key: 'qualif', label: 'Qualification', amount: 142000, count: 7 },
  { key: 'proposal', label: 'Proposition', amount: 118000, count: 5 },
  { key: 'nego', label: 'Négociation', amount: 96000, count: 4 },
  { key: 'won', label: 'Gagné', amount: 64000, count: 2 },
];

export const CLIENTS: ClientRow[] = [
  { id: 'c1', name: 'Nordal Assurances', revenue: 58400, share: 32, marginPct: 34, consultants: 6 },
  { id: 'c2', name: 'Helio Retail', revenue: 41200, share: 22, marginPct: 29, consultants: 4 },
  { id: 'c3', name: 'Varenne Énergie', revenue: 33800, share: 18, marginPct: 31, consultants: 3 },
  { id: 'c4', name: 'Opaline Banque', revenue: 24100, share: 13, marginPct: 27, consultants: 2 },
];

export const FEED: ActivityRow[] = [
  { id: 'a1', label: 'Opportunité gagnée', detail: 'Helio Retail · DevOps senior', when: 'il y a 2 h' },
  { id: 'a2', label: 'CRA validé', detail: 'Camille R. · Septembre', when: 'il y a 5 h' },
  { id: 'a3', label: 'Besoin déposé par le client', detail: 'Varenne Énergie', when: 'hier' },
];

/** Résultats du matching (scène « Trouver. Pas deviner. »). */
export const MATCHES = [
  {
    name: 'Yanis B.',
    role: 'Data engineer · 7 ans',
    score: 92,
    criteria: [
      { label: 'Compétences requises', value: '6 / 6', ok: true },
      { label: 'Disponibilité', value: 'Immédiate', ok: true },
      { label: 'TJM', value: 'Dans la cible', ok: true },
    ],
  },
  {
    name: 'Inès M.',
    role: 'Data engineer · 9 ans',
    score: 87,
    criteria: [
      { label: 'Compétences requises', value: '5 / 6', ok: true },
      { label: 'Disponibilité', value: 'Dans 27 jours', ok: true },
      { label: 'TJM', value: '+ 40 €', ok: false },
    ],
  },
  {
    name: 'Thomas G.',
    role: 'Analytics engineer · 5 ans',
    score: 81,
    criteria: [
      { label: 'Compétences requises', value: '5 / 6', ok: true },
      { label: 'Séniorité', value: 'Un cran en dessous', ok: false },
      { label: 'Langues', value: 'Anglais courant', ok: true },
    ],
  },
] as const;

/** Les sept composantes réelles du score de matching (sur 100). */
export const MATCHING_CRITERIA = [
  { label: 'Compétences requises', max: 50 },
  { label: 'Séniorité', max: 12 },
  { label: 'Disponibilité', max: 12 },
  { label: 'Compétences souhaitées', max: 10 },
  { label: 'TJM', max: 8 },
  { label: 'Langues', max: 5 },
  { label: 'Localisation', max: 3 },
] as const;
