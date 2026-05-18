/**
 * Static guard: docs-truth tests must not silence assertions with `.skip(`.
 *
 * Post-Batch-36 lesson (docs/40_reports/implemented/20260518_MERGE_GATE_FAST_SUITE_BATCH36.md):
 * a stale docs-truth assertion block in `tests/docs_desktop_v09_truth.test.ts` was
 * almost handed off as `it.skip(...)`. Codex refused to accept that as the merge
 * remediation. Docs-truth tests pin durable contracts; they must be re-authored
 * against the current truth, not silenced.
 *
 * This guard scans `tests/docs_*truth*.test.ts` (case-insensitive) for any
 * `describe.skip(` / `it.skip(` / `test.skip(` token. `*.skipIf(...)` conditional
 * fixture guards are permitted because they keep the test active when the
 * environment is suitable.
 *
 * To allow an exception, append the file path to ALLOWLIST below with a Codex/user
 * sign-off comment. The allowlist must stay empty by default.
 */

import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'vitest';

const TESTS_ROOT = resolve(process.cwd(), 'tests');

/**
 * Explicit allowlist for files permitted to use unconditional `.skip(`.
 * Keep empty unless Codex/user has signed off on the specific skip block.
 * Paths are repo-relative POSIX.
 */
const ALLOWLIST: ReadonlyArray<string> = [];

/** Match pattern lives at module scope so the test body stays small and pure. */
const DOCS_TRUTH_NAME = /^docs_.*truth.*\.test\.ts$/i;

/**
 * Skip-token detection: `describe.skip(`, `it.skip(`, `test.skip(`.
 * Allows `*.skipIf(...)` so conditional fixture-availability gates remain valid.
 */
const SKIP_TOKEN_RE = /\b(?:describe|it|test)\.skip\s*\(/;

async function listDocsTruthTests(): Promise<string[]> {
  const entries = await readdir(TESTS_ROOT, { withFileTypes: true });
  const matches: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!DOCS_TRUTH_NAME.test(entry.name)) continue;
    matches.push(join(TESTS_ROOT, entry.name));
  }
  matches.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return matches;
}

function toPosixRepoRelative(absPath: string): string {
  const cwd = process.cwd().replace(/\\/g, '/');
  const norm = absPath.replace(/\\/g, '/');
  return norm.startsWith(cwd + '/') ? norm.slice(cwd.length + 1) : norm;
}

function scanForSkip(absPath: string, content: string): string[] {
  const hits: string[] = [];
  const lines = content.split('\n');
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      inBlockComment = !trimmed.includes('*/');
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.length === 0) continue;
    if (SKIP_TOKEN_RE.test(line)) {
      hits.push(`${toPosixRepoRelative(absPath)}:${i + 1} ${line.trim()}`);
    }
  }
  return hits;
}

test('docs-truth tests: no unconditional .skip( without allowlist', async () => {
  const files = await listDocsTruthTests();
  assert.ok(
    files.length >= 1,
    `Expected at least one tests/docs_*truth*.test.ts file; found ${files.length}.`
  );

  const allowSet = new Set<string>(ALLOWLIST);
  const violations: string[] = [];
  for (const absPath of files) {
    const rel = toPosixRepoRelative(absPath);
    const content = await readFile(absPath, 'utf8');
    const hits = scanForSkip(absPath, content);
    if (hits.length === 0) continue;
    if (allowSet.has(rel)) continue;
    violations.push(...hits);
  }

  assert.strictEqual(
    violations.length,
    0,
    `Unconditional .skip( in docs-truth test files (allowlist policy is empty by default):\n${violations.join('\n')}`
  );
});

test('docs-truth no-skip allowlist is empty unless explicitly expanded', () => {
  // The allowlist itself is a deliberately empty array; expanding it requires a
  // code change reviewed by Codex/user.
  assert.strictEqual(
    ALLOWLIST.length,
    0,
    'docs-truth no-skip ALLOWLIST is non-empty. Confirm each entry has Codex/user sign-off recorded inline.'
  );
});
