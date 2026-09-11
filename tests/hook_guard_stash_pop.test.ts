/**
 * The stash guard is the repo's first TIER-1 railguard: it denies an action rather than
 * advising against it. This test pins both halves of that, because a guard is only worth
 * having if it (a) actually blocks the mistake and (b) never blocks legitimate work.
 *
 * (b) is not hypothetical, and stripping quoted text was not enough. The guard's FIRST REAL
 * USE blocked the commit that documents it: the ledger entry and commit message discuss
 * `git stash pop` in prose inside a heredoc, and a heredoc body is not quoted. So the guard
 * now matches on COMMAND POSITION — the command is split on shell separators and each segment
 * must START with `git stash <sub>`. A guard that blocks real work gets switched off, and a
 * switched-off guard protects nothing, so the false-positive cases below matter at least as
 * much as the true positives.
 *
 * WHY IT EXISTS: the same stray `git stash pop` happened on 2026-08-31 and again on
 * 2026-09-10. The second time, the warning was written in the stash message itself, was
 * read, and was ignored. Advisory had two chances.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_stash_pop.sh';

/** Feed a command to the guard exactly as Claude Code would, and read its decision. */
function decisionFor(command: string): 'deny' | 'allow' {
  const payload = JSON.stringify({ tool_input: { command } });
  const out = execFileSync('bash', [GUARD], { input: payload, encoding: 'utf8' }).trim();
  if (out === '') return 'allow';
  const parsed = JSON.parse(out) as {
    hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
  };
  return parsed.hookSpecificOutput?.permissionDecision === 'deny' ? 'deny' : 'allow';
}

describe('guard_stash_pop (tier-1 blocking hook)', () => {
  it('exists and is registered as a PreToolUse Bash hook', () => {
    expect(existsSync(GUARD)).toBe(true);
    const settings = readFileSync('.claude/settings.json', 'utf8');
    expect(settings).toContain('guard_stash_pop.sh');
    expect(JSON.parse(settings).hooks.PreToolUse).toBeDefined();
  });

  // ── It must block the mistake ──────────────────────────────────────────────────

  it.each([
    'git stash pop',
    'git stash pop -q',
    'git stash pop --quiet',
    'git stash apply',
    'git stash drop',
    'git stash clear',
    'git   stash   pop',
    'cd /f/A-War-Without-Victory && git stash pop && npm test',
    'npm test; git stash pop',
    'echo hi | git stash pop',
    // Modern command substitution IS a command position. (Legacy backticks are a documented gap.)
    'echo $(git stash pop)',
  ])('DENIES %s', (command) => {
    expect(decisionFor(command)).toBe('deny');
  });

  it('the denial explains what to do instead, not just that it refused', () => {
    const payload = JSON.stringify({ tool_input: { command: 'git stash pop' } });
    const out = execFileSync('bash', [GUARD], { input: payload, encoding: 'utf8' });
    const reason = (JSON.parse(out) as {
      hookSpecificOutput: { permissionDecisionReason: string };
    }).hookSpecificOutput.permissionDecisionReason;
    expect(reason).toContain('stash@{');            // how to do it deliberately
    expect(reason).toContain('git checkout HEAD --'); // the usual real alternative
  });

  // ── It must not block legitimate work ──────────────────────────────────────────
  // An explicit ref IS the deliberate act, so it is allowed.

  it.each([
    'git stash pop stash@{0}',
    'git stash apply stash@{3}',
    'git stash drop stash@{1}',
    'git stash list',
    'git stash show stash@{0}',
    'git stash -q -- some/file.ts',
    'git status',
    'git checkout HEAD -- some/file.ts',
  ])('ALLOWS %s', (command) => {
    expect(decisionFor(command)).toBe('allow');
  });

  // ── Mentions are not invocations ───────────────────────────────────────────────
  // The regression that made the first version unusable.

  it.each([
    "echo 'git stash pop is dangerous'",
    'git commit -m "docs: never run git stash pop without a ref"',
    'grep -rn "git stash pop" docs/',
  ])('ALLOWS a mere mention: %s', (command) => {
    expect(decisionFor(command)).toBe('allow');
  });

  // The regression that blocked the guard's own commit. A heredoc body is not quoted, so
  // quote-stripping alone left every doc commit about this rule unrunnable.
  it('ALLOWS a heredoc whose body discusses the rule in prose', () => {
    const command = `cat >> docs/PROJECT_LEDGER.md << 'LEDGEREOF'

## First tier-1 railguard

A stray \`git stash pop\` popped a foreign stash on 2026-08-31, and again on 2026-09-10.
The guard denies \`git stash pop|apply|drop\` without an explicit ref, and \`git stash clear\`
outright. Use git checkout HEAD -- <file> instead.
LEDGEREOF`;
    expect(decisionFor(command)).toBe('allow');
  });

  it('ALLOWS a commit whose message names the rule (the exact command it first blocked)', () => {
    const command = `git commit -F - << 'MSGEOF'
feat(hooks): first tier-1 railguard — deny bare git stash pop

guard_stash_pop denies \`git stash pop|apply|drop\` without an explicit
stash@{N} ref, and denies \`git stash clear\` outright.
MSGEOF`;
    expect(decisionFor(command)).toBe('allow');
  });
});
