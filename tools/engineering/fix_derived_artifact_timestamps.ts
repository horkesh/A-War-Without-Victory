/**
 * One-off: Strip forbidden timestamp keys from existing derived JSON artifacts.
 * Run once to fix files on disk so artifact_determinism.test.ts passes.
 * Phase H6.4.8 — no mechanics change.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { stripTimestampKeysForArtifacts } from './determinism_guard.js';


const DERIVED_DIR = resolve('data/derived');

const ARTIFACTS = [
  'front_edges.json',
  'settlements_index.json',
  'map_build_report.json',
  'map_raw_audit_report.json',
  'polygon_failures.json',
  'fallback_geometries.json'
];

async function main(): Promise<void> {
  for (const name of ARTIFACTS) {
    const path = resolve(DERIVED_DIR, name);
    try {
      const content = await readFile(path, 'utf8');
      const json = JSON.parse(content) as unknown;
      const sanitized = stripTimestampKeysForArtifacts(json);
      await writeFile(path, JSON.stringify(sanitized, null, 2), 'utf8');
      process.stdout.write(`Stripped timestamps: ${name}\n`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        process.stdout.write(`Skip (missing): ${name}\n`);
      } else {
        throw err;
      }
    }
  }
}

main().catch((err) => {
  process.stderr.write(String(err));
  process.exit(1);
});
