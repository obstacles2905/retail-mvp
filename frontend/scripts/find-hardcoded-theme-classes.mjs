#!/usr/bin/env node
/**
 * Lists common hardcoded Tailwind grays / whites / blacks in TSX files
 * to migrate toward semantic tokens (bg-background, bg-card, text-foreground, …).
 *
 * Usage (from frontend/): node scripts/find-hardcoded-theme-classes.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const BASE = process.cwd();
const APP = join(BASE, 'app');
const COMPONENTS = join(BASE, 'components');

const PATTERNS = [
  /\bbg-white\b/g,
  /\btext-black\b/g,
  /\bbg-gray-\d{2,3}\b/g,
  /\btext-gray-\d{2,3}\b/g,
  /\bborder-gray-\d{2,3}\b/g,
  /\bdivide-gray-\d{2,3}\b/g,
  /\bbg-\[#/g,
  /\btext-\[#/g,
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (extname(p) === '.tsx' || extname(p) === '.ts') acc.push(p);
  }
  return acc;
}

function main() {
  const files = [...walk(APP), ...walk(COMPONENTS)];
  const hits = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        hits.push({ file, match: m[0] });
      }
    }
  }

  if (hits.length === 0) {
    console.log('No matches found.');
    return;
  }

  const byFile = new Map();
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, new Set());
    byFile.get(h.file).add(h.match);
  }

  console.log('Files with hardcoded palette classes (token migration candidates):\n');
  for (const [file, set] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(file.replace(BASE + '\\', '').replace(BASE + '/', ''));
    console.log('  ', [...set].sort().join(', '));
    console.log('');
  }
  console.log(`Total files: ${byFile.size}`);
}

main();
