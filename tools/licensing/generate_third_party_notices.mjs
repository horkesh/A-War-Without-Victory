#!/usr/bin/env node
/**
 * Write (or check) THIRD_PARTY_NOTICES.md at the repository root.
 *
 *   node tools/licensing/generate_third_party_notices.mjs           write the file
 *   node tools/licensing/generate_third_party_notices.mjs --check   exit 1 if it is stale
 *
 * Requires an installed tree (`npm ci`): licence texts are read from node_modules.
 * Output is deterministic: sorted, no timestamps, LF line endings.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNoticesForRoot, NOTICES_FILE } from './third_party_notices.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const target = join(rootDir, NOTICES_FILE);
const check = process.argv.includes('--check');

const { packages, markdown } = buildNoticesForRoot(rootDir);

if (check) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (current !== markdown) {
    console.error(`${NOTICES_FILE} is stale. Run: node tools/licensing/generate_third_party_notices.mjs`);
    process.exit(1);
  }
  console.log(`${NOTICES_FILE} is current (${packages.length} npm packages).`);
} else {
  writeFileSync(target, markdown, 'utf8');
  console.log(`Wrote ${NOTICES_FILE} (${packages.length} npm packages, ${Buffer.byteLength(markdown)} bytes).`);
}
