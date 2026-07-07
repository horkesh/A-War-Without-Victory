/**
 * Bundle src/desktop/desktop_sim.ts to dist/desktop/desktop_sim.cjs for Electron main.
 * Run before `electron .` so main can require() the sim API.
 */

import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'dist', 'desktop');
const outFile = join(outDir, 'desktop_sim.cjs');
const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const startupSnapshotCheckScript = join(root, 'tools', 'scenario_runner', 'build_startup_snapshot.ts');

const startupSnapshotCheck = spawnSync(
  process.execPath,
  [tsxCli, startupSnapshotCheckScript, '--check'],
  {
    cwd: root,
    stdio: 'inherit',
  },
);

if (startupSnapshotCheck.status !== 0) {
  throw new Error('desktop:sim:build aborted because the baked startup snapshot is missing or stale. Run `npm run desktop:startup-snapshot:build` and commit the updated artifact.');
}

await mkdir(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [join(root, 'src', 'desktop', 'desktop_sim.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  define: {
    'import.meta.url': 'undefined',
  },
  outfile: outFile,
  sourcemap: true,
  target: 'node18',
  external: ['electron'],
});

console.log('desktop:sim:build OK:', outFile);
