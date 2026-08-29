#!/usr/bin/env node
/* eslint-env node */
/**
 * Fail if the built tactical-map bundle has a CYCLIC chunk graph.
 *
 * Why this exists: `manualChunks` in src/ui/map/vite.config.ts can cut through a
 * strongly-connected set of app modules. The resulting chunks import each other in a
 * cycle, ES module initialisation order breaks, and the bundle throws a temporal
 * dead-zone ReferenceError before React mounts. That shipped once — 26 chunk cycles
 * and "Cannot access 'ir' before initialization" — and was invisible to every existing
 * gate because the dev server does not chunk-split and `vite build` exiting 0 only
 * means the bundle was WRITTEN, not that it RUNS.
 *
 * Usage: node tools/ui/check_chunk_cycles.cjs [distDir]
 * Default distDir: dist/tactical-map
 */

const fs = require('node:fs');
const path = require('node:path');

const distDir = process.argv[2]
  || process.env.AWWV_TACTICAL_MAP_DIST
  || path.join(process.cwd(), 'dist', 'tactical-map');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error(`[check-chunk-cycles] no built assets at ${assetsDir}. Run \`npm run desktop:map:build\` first.`);
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
if (files.length === 0) {
  console.error(`[check-chunk-cycles] no .js chunks in ${assetsDir}`);
  process.exit(1);
}

// Static import / re-export specifiers only: those are what force evaluation order.
// Dynamic import() is lazy and cannot create an initialisation cycle.
const STATIC_SPECIFIER = /(?:import|export)\s*(?:[^'"]*?\s*from\s*)?["'](\.\/[^"']+\.js)["']/g;

const graph = new Map();
for (const file of files) {
  const source = fs.readFileSync(path.join(assetsDir, file), 'utf8');
  const deps = new Set();
  let match;
  while ((match = STATIC_SPECIFIER.exec(source)) !== null) {
    const dep = match[1].replace(/^\.\//, '');
    if (dep !== file && files.includes(dep)) deps.add(dep);
  }
  graph.set(file, deps);
}

const chunkName = (file) => file.replace(/-[^-]+\.js$/, '');

const cycles = [];
const reported = new Set();
const onStack = new Set();
const stack = [];

function visit(node) {
  onStack.add(node);
  stack.push(node);
  for (const dep of graph.get(node) || []) {
    if (onStack.has(dep)) {
      const cycle = stack.slice(stack.indexOf(dep)).concat(dep).map(chunkName);
      const key = [...new Set(cycle)].sort().join('|');
      if (!reported.has(key)) {
        reported.add(key);
        cycles.push(cycle);
      }
    } else if (!onStack.has(dep)) {
      visit(dep);
    }
  }
  stack.pop();
  onStack.delete(node);
}

for (const file of files) visit(file);

if (cycles.length > 0) {
  console.error(`[check-chunk-cycles] FAIL: ${cycles.length} import cycle(s) across ${files.length} chunks.`);
  console.error('A cyclic chunk graph breaks ES module init order and throws a TDZ ReferenceError at runtime.');
  console.error('Cause is almost always a manualChunks rule in src/ui/map/vite.config.ts splitting app source.\n');
  for (const cycle of cycles.slice(0, 12)) {
    console.error('  ' + cycle.join('\n    -> '));
    console.error('');
  }
  if (cycles.length > 12) console.error(`  ...and ${cycles.length - 12} more`);
  process.exit(1);
}

console.log(`[check-chunk-cycles] OK: ${files.length} chunks, no import cycles.`);
