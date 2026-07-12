/**
 * Mois localisés — source unique pour tous les composants qui affichent
 * un libellé de mois (CRA, graphiques CA, documents). Évite les tableaux
 * `MONTHS` FR dupliqués un peu partout.
 *
 * Usage :
 *   const { locale } = useLocale();
 *   const months = monthsLong(locale === 'en');
 *   months[period_month - 1]   // 1-indexé côté DB → 0-indexé ici
 */

const LONG_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const LONG_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
const SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthsLong(isEn: boolean): string[] {
  return isEn ? LONG_EN : LONG_FR;
}

export function monthsShort(isEn: boolean): string[] {
  return isEn ? SHORT_EN : SHORT_FR;
}

/** Libellé « Mois AAAA » localisé à partir d'un mois 1-indexé. */
export function monthYearLabel(month1: number, year: number, isEn: boolean): string {
  return `${monthsLong(isEn)[month1 - 1] ?? ''} ${year}`;
}
