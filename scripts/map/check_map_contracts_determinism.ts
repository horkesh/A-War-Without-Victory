/**
 * Determinism check: run derive + index twice; data_index.json and settlements_substrate.geojson
 * must be byte-identical (same hashes). Exit non-zero if not.
 *
 * Usage: npm run map:contracts:determinism
 *   or: tsx scripts/map/check_map_contracts_determinism.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { computeSha256Hex } from './lib/awwv_contracts.js';


const DERIVED_DIR = resolve('data/derived');
const INDEX_PATH = resolve(DERIVED_DIR, 'data_index.json');
const SUBSTRATE_PATH = resolve(DERIVED_DIR, 'settlements_substrate.geojson');

function hash(path: string): string {
  return computeSha256Hex(readFileSync(path));
}

function main(): void {
  mkdirSync(DERIVED_DIR, { recursive: true });

  execSync('npm run map:derive:substrate', { stdio: 'inherit', cwd: resolve() });
  execSync('npm run map:viewer:substrate:index', { stdio: 'inherit', cwd: resolve() });

  const indexHash1 = hash(INDEX_PATH);
  const substrateHash1 = hash(SUBSTRATE_PATH);

  execSync('npm run map:derive:substrate', { stdio: 'inherit', cwd: resolve() });
  execSync('npm run map:viewer:substrate:index', { stdio: 'inherit', cwd: resolve() });

  const indexHash2 = hash(INDEX_PATH);
  const substrateHash2 = hash(SUBSTRATE_PATH);

  if (indexHash1 !== indexHash2) {
    console.error('FAIL: data_index.json differs between runs.');
    console.error('  Run 1:', indexHash1);
    console.error('  Run 2:', indexHash2);
    process.exit(1);
  }
  if (substrateHash1 !== substrateHash2) {
    console.error('FAIL: settlements_substrate.geojson differs between runs.');
    console.error('  Run 1:', substrateHash1);
    console.error('  Run 2:', substrateHash2);
    process.exit(1);
  }

  console.log('PASS: determinism check — data_index.json and settlements_substrate.geojson identical across two full builds.');
}

main();
