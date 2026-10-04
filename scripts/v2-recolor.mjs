#!/usr/bin/env node
// =========================================================================
// Centrium V2 — codemod des classes de couleur historiques (dark / néon)
// -------------------------------------------------------------------------
// Réécrit, dans les littéraux de chaînes de src/**, les classes Tailwind
// pensées pour un fond sombre (violet, magenta, text-white/xx,
// bg-white/[0.0x]…) vers les tokens sémantiques V2 (primary, success,
// warning, info, destructive, muted, border…).
//
// Usage : node scripts/v2-recolor.mjs [--dry]
// Sortie : nombre de remplacements par fichier + cas ambigus à revoir.
// Idempotent : un second passage ne modifie plus rien.
// =========================================================================

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const DRY = process.argv.includes('--dry');

// Gabarits de documents à charte figée (CV, PDF) et images edge : exclus.
const EXCLUDE = [
  'components/cv/QuadCoreCV',
  'components/cv/pdf',
  'components/offers/pdf',
  'lib/pdf',
  'lib/cv',
  'lib/email',
  'app/opengraph-image.tsx',
  'app/icon.tsx',
  'app/apple-icon.tsx',
];

const FAMILY = {
  violet: 'primary', purple: 'primary', fuchsia: 'primary', pink: 'primary',
  indigo: 'primary', magenta: 'primary',
  blue: 'info', sky: 'info', cyan: 'info',
  emerald: 'success', green: 'success', teal: 'success', lime: 'success',
  amber: 'warning', yellow: 'warning', orange: 'warning',
  red: 'destructive', rose: 'destructive',
};
const NEUTRAL = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const NAMED_SHADE = { neon: 500, glow: 500, brand: 600, deep: 800, muted: 700 };

const REMOVE = new Set([
  'qc-color-cycle', 'qc-color-cycle-always', 'qc-border-cycle', 'glow-c', 'glow-c-soft',
  'hero-glow', 'border-gradient-pink', 'qc-btn-premium', 'animate-gradient-pan',
  'animate-pulse-slow', 'animate-glow-shimmer',
]);

function splitVariant(tok) {
  let depth = 0;
  let last = -1;
  for (let i = 0; i < tok.length; i++) {
    const c = tok[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    else if (c === ':' && depth === 0) last = i;
  }
  return last === -1 ? ['', tok] : [tok.slice(0, last + 1), tok.slice(last + 1)];
}

function parseOpacity(op) {
  if (op == null) return null;
  const m = /^\[([\d.]+)\]$/.exec(op);
  if (m) return Number(m[1]);
  if (/^\d+$/.test(op)) return Number(op) / 100;
  return null;
}

/** Contexte d'un littéral : y a-t-il un fond plein coloré ? */
function hasSolidBg(tokens) {
  return tokens.some((t) => {
    const [, u] = splitVariant(t);
    if (t.includes(':')) return false;
    return (
      /^bg-(qc-gradient|gradient-to|primary|brand|destructive|success|warning|info|foreground)/.test(u) ||
      /^bg-(violet|purple|fuchsia|pink|indigo|magenta|blue|sky|cyan|emerald|green|teal|amber|orange|red|rose)(-[a-z]+|-\d{3})?$/.test(u) ||
      /^bg-(slate|gray|zinc|neutral|stone)-(6|7|8|9)\d\d$/.test(u) ||
      /^bg-black/.test(u) ||
      /^from-/.test(u)
    );
  });
}

const stats = { files: 0, changed: 0, replacements: 0 };
const ambiguous = [];

function mapUtil(util, variants, ctx) {
  let imp = '';
  if (util.startsWith('!')) {
    imp = '!';
    util = util.slice(1);
  }
  const out = (u) => (u == null ? null : imp + u);

  if (REMOVE.has(util)) return null;
  if (/^backdrop-(blur|saturate)/.test(util)) return null;
  if (/^shadow-glow/.test(util)) return null;
  if (/^shadow-\[0_0_/.test(util)) return null;
  if (/^drop-shadow-\[0_0_/.test(util)) return null;
  if (util === 'qc-italic-accent' || util === 'qc-gradient-text') return out('text-primary');
  if (util === 'font-editorial') return out('font-display');

  // Couleurs custom historiques.
  if (/^bg-(midnight|ink)(-[\w]+)?$/.test(util)) return out('bg-background');
  if (/^text-(midnight|ink)(-[\w]+)?$/.test(util)) return out('text-foreground');
  if (/^border-anthracite/.test(util)) return out('border-border');
  if (/^bg-anthracite/.test(util)) return out('bg-muted');
  if (/^bg-\[#0[a-d][0-9a-f]{4}\]$/i.test(util)) return out('bg-card');

  // Blanc / noir pensés pour fond sombre.
  let m = /^(text|bg|border(?:-[trblxy])?|divide|ring|from|via|to|placeholder)-(white|black)(?:\/(\[[\d.]+\]|\d+))?$/.exec(util);
  if (m) {
    const [, prop, col, opRaw] = m;
    const op = parseOpacity(opRaw);
    if (col === 'white') {
      if (prop === 'text') {
        if (op == null) {
          if (ctx.solidBg) return out('text-white');
          if (ctx.alone) {
            ambiguous.push(ctx.where);
            return out('text-white');
          }
          return out('text-foreground');
        }
        return out(op >= 0.85 ? 'text-foreground' : 'text-muted-foreground');
      }
      if (prop === 'bg') {
        if (op == null) return out('bg-white');
        if (variants) return out('bg-muted');
        return out(op <= 0.04 ? 'bg-card' : 'bg-muted');
      }
      if (prop.startsWith('border')) return out(op == null ? `${prop}-white` : `${prop}-border`);
      if (prop === 'divide') return out('divide-border');
      if (prop === 'ring') return out(op == null ? 'ring-white' : 'ring-border');
      if (prop === 'from' || prop === 'via' || prop === 'to') return out(`${prop}-transparent`);
      if (prop === 'placeholder') return out('placeholder-muted-foreground');
    } else {
      if (prop === 'text') return out('text-foreground');
      if (prop === 'bg') return out(op == null ? 'bg-foreground' : `bg-foreground/${opRaw}`);
      if (prop.startsWith('border')) return out(`${prop}-border`);
      return out(util);
    }
  }

  // Familles colorées et neutres.
  m = /^(text|bg|border(?:-[trblxy])?|divide|ring|ring-offset|from|via|to|fill|stroke|outline|decoration|accent|caret|placeholder|shadow)-([a-z]+)(?:-(\d{2,3}|neon|glow|brand|deep|muted))?(?:\/(\[[\d.]+\]|\d+))?$/.exec(util);
  if (!m) return out(util);
  const [, prop, fam, shadeRaw, opRaw] = m;
  const isNeutral = NEUTRAL.has(fam);
  const target = FAMILY[fam];
  if (!isNeutral && !target) return out(util);
  if (fam === 'magenta' && shadeRaw && /^\d+$/.test(shadeRaw)) return out(util);
  const shade = shadeRaw == null ? 500 : NAMED_SHADE[shadeRaw] ?? Number(shadeRaw);
  const opSuffix = opRaw ? `/${opRaw}` : '';

  if (prop === 'shadow') return null;

  if (isNeutral) {
    switch (prop) {
      case 'text':
        return out(shade >= 700 ? 'text-foreground' : 'text-muted-foreground');
      case 'bg':
        if (opRaw) return out(shade >= 800 ? `bg-foreground${opSuffix}` : 'bg-muted');
        if (shade <= 300) return out('bg-muted');
        if (shade <= 600) return out('bg-muted-foreground');
        return out('bg-foreground');
      case 'from': case 'via': case 'to':
        return out(`${prop}-muted`);
      case 'fill': case 'stroke':
        return out(`${prop}-muted-foreground`);
      case 'ring': case 'ring-offset':
        return out(`${prop}-border`);
      default:
        return out(prop.startsWith('border') || prop === 'divide' || prop === 'outline' ? `${prop}-border` : util);
    }
  }

  switch (prop) {
    case 'text':
      if (target === 'primary' && shade >= 800) return out('text-primary-deep');
      return out(`text-${target}`);
    case 'bg':
      if (opRaw) return out(`bg-${target}${opSuffix}`);
      if (shade <= 200) return out(target === 'primary' ? 'bg-brand-50' : `bg-${target}-soft`);
      if (target === 'primary' && shade >= 700) return out('bg-primary-deep');
      return out(`bg-${target}`);
    case 'from': case 'via': case 'to':
      if (target === 'primary' && shade >= 700 && !opRaw) return out(`${prop}-primary-deep`);
      return out(`${prop}-${target}${opSuffix}`);
    case 'placeholder':
      return out('placeholder-muted-foreground');
    default:
      return out(`${prop}-${target}${opSuffix}`);
  }
}

function transformLiteral(body, where, ctxTokens) {
  if (!body || !/[a-z]-/.test(body)) return body;
  // Préserve les espaces d'origine (classes multi-lignes).
  const parts = body.split(/(\s+)/);
  const tokens = parts.filter((p) => p && !/^\s+$/.test(p));
  const ctx = {
    solidBg: hasSolidBg(ctxTokens ?? tokens),
    alone: tokens.length === 1,
    where,
  };
  let changed = false;
  const hasEditorial = tokens.includes('font-editorial');
  const decorativeBlob =
    tokens.includes('absolute') &&
    tokens.includes('rounded-full') &&
    tokens.some((t) => /^blur-(2xl|3xl|\[\d+px\])$/.test(t));

  const mapped = parts.map((p) => {
    if (!p || /^\s+$/.test(p)) return p;
    if (!/^[!\w:\-\/\[\].%&>#]+$/.test(p)) return p;
    const [variants, util] = splitVariant(p);
    if (/(^|:)dark:/.test(variants) || variants.startsWith('dark:')) {
      changed = true;
      return null;
    }
    if (hasEditorial && util === 'italic') {
      changed = true;
      return null;
    }
    const next = mapUtil(util, variants, ctx);
    const full = next == null ? null : variants + next;
    if (full !== p) changed = true;
    return full;
  });
  if (decorativeBlob && !tokens.includes('hidden')) {
    mapped.push(' hidden');
    changed = true;
  }
  if (!changed) return body;
  stats.replacements++;
  // Recompose : supprime les tokens retirés et les doubles espaces induits.
  let outStr = '';
  for (let i = 0; i < mapped.length; i++) {
    const p = mapped[i];
    if (p == null) {
      // retire l'espace qui suit pour ne pas en laisser deux
      if (i + 1 < mapped.length && /^\s+$/.test(mapped[i + 1] ?? '')) mapped[i + 1] = '';
      continue;
    }
    outStr += p;
  }
  return outStr.replace(/ {2,}/g, ' ');
}

function transformFile(text, file) {
  // Littéraux simples/doubles (une ligne) et templates (sans ${}).
  return text
    .replace(/(["'])((?:(?!\1)[^\\\n]|\\.)*)\1/g, (all, q, body, offset) => {
      const line = text.slice(0, offset).split('\n').length;
      return q + transformLiteral(body, `${file}:${line}`) + q;
    })
    .replace(/`([^`$]*)`/g, (all, body, offset) => {
      const line = text.slice(0, offset).split('\n').length;
      return '`' + transformLiteral(body, `${file}:${line}`) + '`';
    })
    .replace(/`([^`]*\$\{[^`]*)`/g, (all, body, offset) => {
      // Templates avec interpolations : on ne transforme que les segments statiques.
      const line = text.slice(0, offset).split('\n').length;
      const segs = body.split(/(\$\{[^}]*\})/);
      const staticTokens = segs
        .filter((s) => !s.startsWith('${'))
        .join(' ')
        .split(/\s+/)
        .filter(Boolean);
      return (
        '`' +
        segs.map((s) => (s.startsWith('${') ? s : transformLiteral(s, `${file}:${line}`, staticTokens))).join('') +
        '`'
      );
    });
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(name)) acc.push(p);
  }
  return acc;
}

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/');
  if (EXCLUDE.some((e) => rel.startsWith(e))) continue;
  stats.files++;
  const before = readFileSync(file, 'utf8');
  const after = transformFile(before, rel);
  if (after !== before) {
    stats.changed++;
    if (!DRY) writeFileSync(file, after);
  }
}

console.log(`Fichiers analysés : ${stats.files}`);
console.log(`Fichiers modifiés : ${stats.changed}`);
console.log(`Littéraux réécrits : ${stats.replacements}`);
if (ambiguous.length) {
  console.log(`\ntext-white isolé (contexte inconnu, laissé tel quel) : ${ambiguous.length}`);
  for (const a of ambiguous) console.log('  ' + a);
}
