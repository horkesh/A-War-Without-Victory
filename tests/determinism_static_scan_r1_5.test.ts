/**
 * Phase R1.5: Determinism static scan (no Date.now/new Date/Math.random in core pipeline).
 * Scope is intentionally narrow: src/ and tools/scenario_runner/.
 * Excludes src/ui/warroom/ (display-only UI; turn-based date display uses Date for calendar math).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';




const ROOTS = [
  resolve(process.cwd(), 'src'),
  resolve(process.cwd(), 'tools', 'scenario_runner')
];

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.cache',
  '.tmp',
  'data',
  'docs',
  'runs'
]);

/** Path segment that excludes warroom UI from scan (display-only; not simulation pipeline). */
const WARROOM_UI_DIR = 'warroom';

function isUnderWarroom(path: string): boolean {
  const normalized = path.replace(/\\/g, '/');
  return normalized.includes('/ui/warroom');
}

const FILE_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs']);

const DISALLOWED_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'Date.now()', regex: /Date\.now\(\)/ },
  { label: 'new Date()', regex: /new Date\s*\(/ },
  { label: 'Math.random()', regex: /Math\.random\(\)/ }
];

async function collectFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      if (entry.name === WARROOM_UI_DIR && dir.endsWith('ui')) continue;
      await collectFiles(join(dir, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    const fullPath = join(dir, entry.name);
    if (isUnderWarroom(fullPath)) continue;
    const ext = entry.name.slice(entry.name.lastIndexOf('.'));
    if (FILE_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(path: string, content: string): string[] {
  const hits: string[] = [];
  const lines = content.split('\n');
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }
    if (trimmed.startsWith('/*')) {
      inBlockComment = !trimmed.includes('*/');
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.length === 0) continue;

    for (const pattern of DISALLOWED_PATTERNS) {
      if (pattern.regex.test(line)) {
        hits.push(`${path}:${i + 1} ${pattern.label}`);
      }
    }
  }

  return hits;
}

test('determinism scan: no Date.now/new Date/Math.random in core pipeline', async () => {
  const files: string[] = [];
  for (const root of ROOTS) {
    await collectFiles(root, files);
  }
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const violations: string[] = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    violations.push(...scanFile(file, content));
  }

  assert.strictEqual(
    violations.length,
    0,
    `Determinism violations found:\n${violations.join('\n')}`
  );
});
