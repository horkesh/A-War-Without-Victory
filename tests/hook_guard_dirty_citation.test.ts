/**
 * `guard_dirty_citation` warns when a file being read is MODIFIED or UNTRACKED, because what you
 * just read is then not HEAD. On 2026-08-26 a packet cited `pre_planned_operations.ts:1163`
 * "[SOURCE-VERIFIED at HEAD]" from a tree that was +69/-5; the real HEAD lines were 1231/1260/
 * 1262/1263, and every seat that re-checked landed in unrelated code.
 *
 * It is ADVISORY, and these tests pin it as advisory, so that promoting it later is a decision
 * rather than a guess.
 *
 * EVERY FIXTURE HERE IS REAL. An earlier attempt to generate these cases produced twelve
 * well-formed ones — `src/main.ts`, `src/lib/utils.ts`, `temp/new_experiment.js` — and all twelve
 * were inert, because none of those paths exist in this repo. All twelve came back silent, which
 * reads exactly like "this hook is dead" for a hook that had fired twice that same session. So
 * the fixtures below are created or discovered at run time and never invented: this hook's
 * behaviour is a function of real git state, and a test that guesses at git state measures
 * nothing.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_dirty_citation.sh';
const SCRATCH = join('logs', 'local_executor', '_hook_fixtures');

type Verdict = 'fires' | 'quiet';

function verdictFor(toolInput: Record<string, string>): Verdict {
  const payload = JSON.stringify({ tool_input: toolInput });
  const out = execFileSync('bash', [GUARD], { input: payload, encoding: 'utf8' }).trim();
  if (out === '') return 'quiet';
  const parsed = JSON.parse(out) as {
    hookSpecificOutput?: { additionalContext?: string; permissionDecision?: string };
  };
  expect(parsed.hookSpecificOutput?.permissionDecision).toBeUndefined();
  return parsed.hookSpecificOutput?.additionalContext ? 'fires' : 'quiet';
}

/** A tracked file that git reports clean RIGHT NOW. Chosen, never assumed. */
function aCleanTrackedFile(): string {
  const candidates = ['CLAUDE.md', 'package.json', 'tsconfig.json', '.gitignore', 'README.md'];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const status = execFileSync('git', ['status', '--porcelain', '--', candidate], {
      encoding: 'utf8',
    }).trim();
    if (status === '') return candidate;
  }
  throw new Error(
    `no clean tracked file among ${candidates.join(', ')} — cannot test the quiet path honestly`,
  );
}

afterAll(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe('guard_dirty_citation (advisory)', () => {
  it('WARNS about a file that exists but is untracked', () => {
    mkdirSync(SCRATCH, { recursive: true });
    const file = join(SCRATCH, 'untracked_fixture.txt');
    writeFileSync(file, 'not at HEAD\n');
    expect(verdictFor({ file_path: file })).toBe('fires');
  });

  it('the untracked warning says the citation would be fiction, not merely stale', () => {
    mkdirSync(SCRATCH, { recursive: true });
    const file = join(SCRATCH, 'untracked_message.txt');
    writeFileSync(file, 'x\n');
    const out = execFileSync('bash', [GUARD], {
      input: JSON.stringify({ tool_input: { file_path: file } }),
      encoding: 'utf8',
    });
    const context = (JSON.parse(out) as {
      hookSpecificOutput: { additionalContext: string };
    }).hookSpecificOutput.additionalContext;
    expect(context).toContain('UNTRACKED');
    expect(context).toContain('git show HEAD:');
  });

  it('stays QUIET for a tracked file that is clean', () => {
    expect(verdictFor({ file_path: aCleanTrackedFile() })).toBe('quiet');
  });

  it('stays QUIET for a path that does not exist', () => {
    // Nothing can be cited from a file that is not there, so there is nothing to warn about.
    // This is also why a batch of invented paths measures nothing at all.
    expect(verdictFor({ file_path: 'src/definitely-not-a-real-file.ts' })).toBe('quiet');
  });

  it('accepts the path under `path` as well as `file_path`', () => {
    mkdirSync(SCRATCH, { recursive: true });
    const file = join(SCRATCH, 'alt_key_fixture.txt');
    writeFileSync(file, 'y\n');
    expect(verdictFor({ path: file })).toBe('fires');
  });

  it('reads only a path — the offending text under another key does nothing', () => {
    expect(verdictFor({ command: 'cat some-modified-file.ts' })).toBe('quiet');
  });

  it('stays QUIET for an empty path', () => {
    expect(verdictFor({ file_path: '' })).toBe('quiet');
  });
});
