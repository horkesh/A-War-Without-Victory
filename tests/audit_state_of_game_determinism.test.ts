/**
 * Phase H3.0: Determinism checks for state-of-the-game audit generator.
 * - Outputs contain no timestamp keys/phrases.
 * - state_matrix.md rows are stable-sorted by ID.
 * - Two runs produce byte-identical files for the three artifacts.
 */

import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = process.cwd();
const AUDIT_DIR = join(ROOT, 'docs', '40_reports', 'audit');
const FILES = ['master_state_overview.md', 'state_matrix.md', 'mvp_backlog.md'] as const;

// Phrases that indicate actual timestamps in output (not policy text like "no generated at")
const TIMESTAMP_PHRASES = [
  'Generated at:',
  'generated at:',
  'timestamp:',
  'Timestamp:',
  'Date.now()',
  'new Date()',
  'Last Updated:',
  'last updated:',
  'last run:',
];

function runAuditState(): void {
  const r = spawnSync('npm', ['run', 'audit:state'], {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    throw new Error(`audit:state failed: ${r.stderr || r.stdout}`);
  }
}

function readAuditFile(name: string): string {
  return readFileSync(join(AUDIT_DIR, name), 'utf8');
}

test('audit artifacts: no timestamp phrases in outputs', () => {
  runAuditState();
  for (const name of FILES) {
    const content = readAuditFile(name);
    for (const phrase of TIMESTAMP_PHRASES) {
    assert(
      !content.includes(phrase),
      `File ${name} must not contain "${phrase}"`
    );
    }
  }
});

test('audit artifacts: state_matrix rows stable-sorted by ID', () => {
  runAuditState();
  const content = readAuditFile('state_matrix.md');
  const lines = content.split('\n');
  const dataRows = lines.filter((l) => l.startsWith('| A-') || l.startsWith('| D-') || l.startsWith('| M-') || l.startsWith('| S-') || l.startsWith('| U-'));
  const ids = dataRows.map((row) => {
    const cells = row.split('|').map((c) => c.trim());
    return cells[1]; // ID column
  });
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(ids, sorted, 'state_matrix rows must be sorted by ID');
});

test('audit artifacts: two runs produce byte-identical files', () => {
  runAuditState();
  const first: Record<string, Buffer> = {};
  for (const name of FILES) {
    first[name] = readFileSync(join(AUDIT_DIR, name));
  }
  runAuditState();
  for (const name of FILES) {
    const second = readFileSync(join(AUDIT_DIR, name));
    assert(
      first[name].equals(second),
      `File ${name} must be byte-identical across two runs`
    );
  }
});
