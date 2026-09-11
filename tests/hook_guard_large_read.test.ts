/**
 * The local executor was built, measured, documented — and then barely used, for the least
 * interesting reason. Getting a trustworthy answer out of it took four steps (write a spec, write
 * a schema, dispatch, write a verifier); reading the file took one. So the file got read, every
 * time, at thousands of tokens each.
 *
 * That is a friction problem, not a discipline problem, and "prefer delegation" written in a
 * README is a tier-5 rule — this session is a long demonstration that those do not fire. So the
 * reminder goes where the decision happens, at the moment the tokens are about to be spent, and
 * `local:ask` collapsed the four steps into one so that taking the advice is cheap.
 *
 * IT IS ADVISORY AND MUST STAY SO. The hook cannot know why the file is being read:
 *   reading FOR FACTS    — delegable, and the whole point
 *   reading TO CHANGE IT — not delegable; you need the real contents, and a summary is not a
 *                          substitute for them
 * A blocking version would break the second case, which is most editing work. The distinction is
 * reading-for-facts versus reading-to-change, and only the planner knows which it is.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_large_read.sh';

type Verdict = 'fires' | 'quiet';

function verdictFor(toolInput: Record<string, unknown>): Verdict {
  const out = execFileSync('bash', [GUARD], {
    input: JSON.stringify({ tool_input: toolInput }),
    encoding: 'utf8',
  }).trim();
  if (out === '') return 'quiet';
  const parsed = JSON.parse(out) as {
    hookSpecificOutput?: { additionalContext?: string; permissionDecision?: string };
  };
  // If this ever blocks, editing large files becomes impossible. It must never deny.
  expect(parsed.hookSpecificOutput?.permissionDecision).toBeUndefined();
  return parsed.hookSpecificOutput?.additionalContext ? 'fires' : 'quiet';
}

describe('guard_large_read (advisory)', () => {
  it('exists and is registered as a PreToolUse Read hook', () => {
    expect(existsSync(GUARD)).toBe(true);
    const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8')) as {
      hooks: Record<string, Array<{ matcher?: string; hooks?: Array<{ command?: string }> }>>;
    };
    const onRead = settings.hooks.PreToolUse.some((group) => group.matcher === 'Read'
      && (group.hooks ?? []).some((hook) => (hook.command ?? '').includes('guard_large_read.sh')));
    expect(onRead).toBe(true);
  });

  it.each([
    ['docs/plans/MASTER_ROADMAP.md', 'a ~48 KB plan'],
    ['docs/PROJECT_LEDGER.md', 'the ledger, hundreds of KB'],
  ])('SUGGESTS delegation for %s — %s', (file) => {
    expect(verdictFor({ file_path: file })).toBe('fires');
  });

  it('hands over the command with the file already filled in', () => {
    // A suggestion the reader has to assemble themselves is one they will skip.
    const out = execFileSync('bash', [GUARD], {
      input: JSON.stringify({ tool_input: { file_path: 'docs/plans/MASTER_ROADMAP.md' } }),
      encoding: 'utf8',
    });
    const context = (JSON.parse(out) as {
      hookSpecificOutput: { additionalContext: string };
    }).hookSpecificOutput.additionalContext;
    expect(context).toContain('npm run local:ask -- --read docs/plans/MASTER_ROADMAP.md');
    // And it must say when to ignore it, or it becomes noise on every edit.
    expect(context).toContain('about to EDIT');
  });

  // ── Silence, where suggesting would be wrong or useless ────────────────────────

  it.each([
    [{ file_path: 'tools/local_executor/ask.mjs' }, 'a small file — the round trip is not worth it'],
    [{ file_path: 'docs/plans/MASTER_ROADMAP.md', offset: 100, limit: 50 }, 'already scoped by the caller'],
    [{ file_path: 'docs/Balkan_BattlegroundsI.pdf' }, 'a PDF the local model cannot read either'],
    [{ file_path: 'does/not/exist.md' }, 'a file that is not there'],
    [{}, 'no path at all'],
  ])('stays QUIET for %o — %s', (toolInput, _why) => {
    expect(verdictFor(toolInput as Record<string, unknown>)).toBe('quiet');
  });
});
