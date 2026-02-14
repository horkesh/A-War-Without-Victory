/**
 * Bundle src/desktop/desktop_sim.ts to dist/desktop/desktop_sim.cjs for Electron main.
 * Run before `electron .` so main can require() the sim API.
 */

import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'dist', 'desktop');
const outFile = join(outDir, 'desktop_sim.cjs');

await mkdir(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [join(root, 'src', 'desktop', 'desktop_sim.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: outFile,
  sourcemap: true,
  target: 'node18',
  external: ['electron'],
});

console.log('desktop:sim:build OK:', outFile);
