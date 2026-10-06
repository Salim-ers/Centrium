/** Minuscules, sans accents ni espaces superflus (comparaisons tolérantes). */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `needle` apparaît comme mot entier dans `haystack` (accents et casse ignorés). */
export function containsWord(haystack: string, needle: string): boolean {
  const n = fold(needle);
  if (!n) return false;
  return new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(n)}($|[^a-z0-9+#])`).test(fold(haystack));
}

/** Nom d'une langue à partir de son code (« en » → « Anglais »). */
export function languageName(code: string, lang: 'fr' | 'en'): string {
  try {
    const name = new Intl.DisplayNames([lang === 'fr' ? 'fr-FR' : 'en-GB'], { type: 'language' }).of(code.toLowerCase());
    if (name && name.toLowerCase() !== code.toLowerCase()) return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    // code non reconnu
  }
  return code.toUpperCase();
}
