/**
 * Extraction des couleurs dominantes d'une image (PNG/JPG/WebP/SVG).
 *
 * Fonctionne CLIENT-SIDE uniquement (Canvas API). Approche :
 *   1. Fetch l'image en blob → URL locale (contourne CORS / tainted canvas)
 *   2. Si SVG : essaie d'abord d'extraire les `fill`/`stroke` du XML
 *      (plus précis qu'une analyse pixel par pixel)
 *   3. Sinon : Canvas → downscale 64×64 → quantize les couleurs en buckets
 *      → compte les occurrences → filtre les couleurs neutres (blanc/noir/gris)
 *   4. Retourne les 2 couleurs dominantes :
 *      - primaire : la plus fréquente
 *      - accent : la plus fréquente avec assez de distance vs primaire (hue ≥ 30°)
 */

export type ExtractedColors = {
  primary: string; // hex #RRGGBB
  accent: string; // hex #RRGGBB
};

const DOWNSCALE = 64;
const QUANTIZE_STEP = 32; // arrondit chaque canal à un multiple de 32 → 8³ = 512 buckets
const MIN_DISTANCE_HUE = 25; // accent doit être à au moins 25° de hue de primaire

const FALLBACK: ExtractedColors = {
  primary: '#C65F46', // terracotta Centrium
  accent: '#9D4432', // terracotta profond Centrium
};

export async function extractColorsFromImage(url: string): Promise<ExtractedColors> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return FALLBACK;
    const blob = await res.blob();

    // SVG : on tente d'abord de lire le XML
    if (blob.type === 'image/svg+xml' || url.toLowerCase().endsWith('.svg')) {
      const text = await blob.text();
      const svgColors = extractFromSvgText(text);
      if (svgColors) return svgColors;
    }

    // Sinon : Canvas
    return await extractFromBitmap(blob);
  } catch {
    return FALLBACK;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SVG : extraction depuis le XML (regex sur fill="..." et stroke="...")
// ──────────────────────────────────────────────────────────────────────────

function extractFromSvgText(svg: string): ExtractedColors | null {
  const colors = new Map<string, number>();
  const RE = /(?:fill|stroke)\s*=\s*"([^"]+)"|(?:fill|stroke)\s*:\s*([^;}\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(svg))) {
    const raw = (m[1] ?? m[2] ?? '').trim().toLowerCase();
    if (!raw || raw === 'none' || raw === 'transparent' || raw === 'currentcolor') continue;

    const hex = toHex(raw);
    if (!hex) continue;
    if (isNeutral(hex)) continue;

    colors.set(hex, (colors.get(hex) ?? 0) + 1);
  }

  if (colors.size === 0) return null;
  return pickTwoColors([...colors.entries()].map(([c, n]) => ({ color: c, count: n })));
}

// ──────────────────────────────────────────────────────────────────────────
// Bitmap : extraction depuis Canvas (PNG/JPG/WebP)
// ──────────────────────────────────────────────────────────────────────────

async function extractFromBitmap(blob: Blob): Promise<ExtractedColors> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    const w = (canvas.width = DOWNSCALE);
    const h = (canvas.height = DOWNSCALE);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return FALLBACK;

    ctx.fillStyle = '#ffffff'; // fond blanc pour les PNG transparents
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map<string, number>();

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue; // ignore les pixels semi-transparents
      const r = quantize(data[i]);
      const g = quantize(data[i + 1]);
      const b = quantize(data[i + 2]);
      const hex = rgbToHex(r, g, b);
      if (isNeutral(hex)) continue;
      buckets.set(hex, (buckets.get(hex) ?? 0) + 1);
    }

    if (buckets.size === 0) return FALLBACK;

    const sorted = [...buckets.entries()]
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count);

    return pickTwoColors(sorted);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers couleur
// ──────────────────────────────────────────────────────────────────────────

function quantize(v: number): number {
  return Math.min(255, Math.round(v / QUANTIZE_STEP) * QUANTIZE_STEP);
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Convertit ce qu'on trouve dans un SVG en hex `#RRGGBB`. */
function toHex(raw: string): string | null {
  if (raw.startsWith('#')) {
    if (raw.length === 4) {
      // #abc → #aabbcc
      return '#' + [...raw.slice(1)].map((c) => c + c).join('').toLowerCase();
    }
    if (raw.length === 7) return raw.toLowerCase();
    return null;
  }
  const rgbMatch = raw.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return rgbToHex(+rgbMatch[1]!, +rgbMatch[2]!, +rgbMatch[3]!);
  }
  // CSS named colors basiques
  const NAMED: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    purple: '#800080',
    orange: '#ffa500',
  };
  return NAMED[raw] ?? null;
}

/**
 * Une couleur est "neutre" si :
 *   - tous canaux > 235 (quasi-blanc)
 *   - tous canaux < 25 (quasi-noir)
 *   - écart max-min entre canaux < 15 (gris pur)
 */
function isNeutral(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max > 235) return true;
  if (max < 25) return true;
  if (max - min < 15) return true;
  return false;
}

/** Distance circulaire entre deux teintes en degrés (0-180). */
function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

function hexToHue(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

/**
 * Pioche primaire = plus fréquent, accent = plus fréquent suivant
 * avec une distance hue suffisante. Si rien ne distance assez,
 * accent = 2e plus fréquent tel quel.
 */
function pickTwoColors(
  sorted: Array<{ color: string; count: number }>,
): ExtractedColors {
  if (sorted.length === 0) return FALLBACK;

  const primary = sorted[0]!.color;
  const primaryHue = hexToHue(primary);

  let accent: string | null = null;
  for (let i = 1; i < sorted.length; i++) {
    const candidate = sorted[i]!.color;
    if (hueDistance(primaryHue, hexToHue(candidate)) >= MIN_DISTANCE_HUE) {
      accent = candidate;
      break;
    }
  }

  if (!accent) {
    accent = sorted[1]?.color ?? complementaryHue(primary);
  }

  return { primary, accent };
}

/** Couleur complémentaire (hue + 180°) au cas où on n'a qu'une couleur. */
function complementaryHue(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  // Approche simple : inversion canal puis ajustement luminosité ~similaire
  return rgbToHex(255 - r, 255 - g, 255 - b);
}
