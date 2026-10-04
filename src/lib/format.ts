// =========================================================================
// Formatage partagé (montants, pourcentages, dates) — FR / EN.
// Les montants Centrium sont stockés et affichés en euros HT.
// =========================================================================

type Lang = 'fr' | 'en';

const nf = (lang: Lang) => (lang === 'en' ? 'en-GB' : 'fr-FR');

export function formatEur(n: number | null | undefined, lang: Lang = 'fr', digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(nf(lang), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

/** Montant compact pour les KPI : 12,4 k€ / 1,2 M€. */
export function formatEurCompact(n: number | null | undefined, lang: Lang = 'fr'): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const fmt = (v: number, d: number) =>
    v.toLocaleString(nf(lang), { maximumFractionDigits: d, minimumFractionDigits: 0 });
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000, 2)} M€`;
  if (abs >= 10_000) return `${fmt(n / 1_000, 0)} k€`;
  if (abs >= 1_000) return `${fmt(n / 1_000, 1)} k€`;
  return `${fmt(n, 0)} €`;
}

export function formatPct(n: number | null | undefined, lang: Lang = 'fr', digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toLocaleString(nf(lang), { maximumFractionDigits: digits })} %`.replace(' %', lang === 'fr' ? ' %' : '%');
}

export function formatNumber(n: number | null | undefined, lang: Lang = 'fr', digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString(nf(lang), { maximumFractionDigits: digits });
}

export function formatDate(
  isoDate: string | null | undefined,
  lang: Lang = 'fr',
  style: 'short' | 'medium' | 'long' = 'medium',
): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate.length === 10 ? isoDate + 'T00:00:00' : isoDate);
  if (Number.isNaN(d.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString(nf(lang), opts);
}

export function monthLabel(key: string, lang: Lang = 'fr', withYear = false): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y!, (m ?? 1) - 1, 1);
  const s = d.toLocaleDateString(nf(lang), withYear ? { month: 'short', year: '2-digit' } : { month: 'short' });
  return s.replace('.', '');
}

/** « il y a 3 j », « dans 12 j », « aujourd'hui ». */
export function relativeDays(isoDate: string | null | undefined, lang: Lang = 'fr', today = new Date()): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate.slice(0, 10) + 'T00:00:00');
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (diff === 0) return lang === 'fr' ? "aujourd'hui" : 'today';
  if (diff === 1) return lang === 'fr' ? 'demain' : 'tomorrow';
  if (diff === -1) return lang === 'fr' ? 'hier' : 'yesterday';
  if (diff > 0) return lang === 'fr' ? `dans ${diff} j` : `in ${diff} d`;
  return lang === 'fr' ? `il y a ${-diff} j` : `${-diff} d ago`;
}
