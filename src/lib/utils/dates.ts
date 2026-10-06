/**
 * Écart en jours entre deux dates AAAA-MM-JJ (ou horodatages ISO, dont seule
 * la date compte). Calcul en UTC : insensible aux changements d'heure.
 */
export function dayDiff(from: string, to: string): number {
  const utc = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}
