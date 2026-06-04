#!/usr/bin/env node
/**
 * Script de génération PDF des docs produit Centrium.
 *
 * Convertit les fichiers Markdown sous docs/produit/*.md en PDF
 * stylés avec docs/produit/pdf-style.css.
 *
 * Usage :
 *   npm run docs:pdf
 *
 * Prérequis :
 *   npm install -D md-to-pdf
 *
 * Sortie :
 *   docs/produit/dist/MANUEL_UTILISATEUR.pdf
 *   docs/produit/dist/PRESENTATION_ENTREPRISE.pdf
 */

import { mdToPdf } from 'md-to-pdf';
import { readdir, mkdir } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'docs', 'produit');
const DIST = join(SRC, 'dist');
const STYLESHEET = join(SRC, 'pdf-style.css');

const CONFIG = {
  // Stylesheet local au repo — garantit un rendu identique en CI et en
  // local, pas de dépendance externe.
  stylesheet: [STYLESHEET],
  // Format A4 portrait
  pdf_options: {
    format: 'A4',
    margin: { top: '22mm', right: '18mm', bottom: '22mm', left: '18mm' },
    printBackground: true,
    displayHeaderFooter: false, // géré par @page CSS
    preferCSSPageSize: true,
  },
  // Conserve les emojis Unicode (💡 ⚠️ 🔒) en glyphes natifs.
  launch_options: {
    args: ['--no-sandbox', '--font-render-hinting=none'],
  },
  // Marked options pour parser le frontmatter YAML et le retirer du HTML
  marked_options: {
    headerIds: true,
    breaks: false,
  },
  // body_class : permet de scoper le CSS au body de la doc
  body_class: 'centrium-doc',
};

async function ensureDistDir() {
  try {
    await mkdir(DIST, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

async function listMarkdownFiles() {
  const all = await readdir(SRC);
  return all.filter((f) => extname(f) === '.md').map((f) => join(SRC, f));
}

async function convertOne(mdPath) {
  const name = basename(mdPath, '.md');
  const outPath = join(DIST, `${name}.pdf`);
  console.log(`📄  ${name}.md → ${name}.pdf`);

  const pdf = await mdToPdf(
    { path: mdPath },
    {
      ...CONFIG,
      dest: outPath,
    },
  );

  if (pdf) {
    const sizeKb = (pdf.content.byteLength / 1024).toFixed(1);
    console.log(`✅  ${name}.pdf (${sizeKb} KB)`);
  } else {
    console.error(`❌  Échec sur ${name}.md`);
  }
}

async function main() {
  console.log('\n📚  Génération PDF des docs Centrium\n');
  await ensureDistDir();
  const files = await listMarkdownFiles();
  if (files.length === 0) {
    console.warn('⚠️   Aucun .md trouvé sous docs/produit/');
    return;
  }
  console.log(`🔍  ${files.length} document(s) à convertir\n`);
  for (const f of files) {
    try {
      await convertOne(f);
    } catch (err) {
      console.error(`💥  Erreur sur ${f} :`, err.message);
    }
  }
  console.log(`\n✨  Terminé. PDFs disponibles dans ${DIST}\n`);
}

main().catch((err) => {
  console.error('💥  Erreur fatale :', err);
  process.exit(1);
});
