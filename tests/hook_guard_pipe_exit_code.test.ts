/**
 * `guard_pipe_exit_code` was ADVISORY until 2026-09-10, and was violated at least three times
 * anyway. The lesson recording the third violation says why, in its own words: "The repo hook
 * fired both times and I still had to be told by it."
 *
 * It now DENIES the one shape that is never intentional — a pipeline whose last stage is a pure
 * display filter (tail/head/sed/cut/wc/...), followed by a read of `$?`. A display filter has no
 * meaningful exit status, so reading it is always a mistake, never a question. `grep` is excluded
 * ON PURPOSE: `cmd | grep -q x; if [ $? -eq 0 ]` asks grep a question and reads grep's answer,
 * which is legitimate. Everything outside the narrow shape stays advisory.
 *
 * Three outcomes, and the QUIET cases are the ones that keep the guard usable, so they are
 * pinned as carefully as the denials. Note that `decisionFor` deliberately does NOT swallow
 * errors: if the hook crashes, these tests must go red rather than quietly reading as 'quiet'.
 *
 * Table contents drafted by the local executor model; the decision helper was rewritten, because
 * the draft returned `permissionDecision` directly (so it could never report 'warn') and caught
 * every error as 'quiet' — which would have passed the whole QUIET group against a broken hook.
 * See tools/local_executor/README.md.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_pipe_exit_code.sh';

type Decision = 'deny' | 'warn' | 'quiet';

/** Run the guard exactly as Claude Code would. Errors propagate — a crash must not read as quiet. */
function runGuard(command: string): string {
  const payload = JSON.stringify({ tool_input: { command } });
  return execFileSync('bash', [GUARD], { input: payload, encoding: 'utf8' }).trim();
}

function decisionFor(command: string): Decision {
  const out = runGuard(command);
  if (out === '') return 'quiet';
  const parsed = JSON.parse(out) as {
    hookSpecificOutput?: { permissionDecision?: string; additionalContext?: string };
  };
  if (parsed.hookSpecificOutput?.permissionDecision === 'deny') return 'deny';
  if (parsed.hookSpecificOutput?.additionalContext) return 'warn';
  return 'quiet';
}

describe('guard_pipe_exit_code (tier-1 for the unambiguous shape)', () => {
  it('exists and is registered as a PreToolUse Bash hook', () => {
    expect(existsSync(GUARD)).toBe(true);
    const settings = readFileSync('.claude/settings.json', 'utf8');
    expect(settings).toContain('guard_pipe_exit_code.sh');
    expect(JSON.parse(settings).hooks.PreToolUse).toBeDefined();
  });

  // ── The shape that is always a mistake ─────────────────────────────────────────
  // The first three are verbatim commands that actually shipped a wrong conclusion.

  it.each([
    'npm run desktop:map:build 2>&1 | tail -5; echo "BUILD_EXIT=$?"',
    'npx tsc --noEmit | tail -3; echo "rc=$?"',
    'git push -q 2>&1 | tail -1; echo "PUSH_EXIT=$?"',
    'cmd | head -20 && echo "$?"',
    'cmd | cut -d: -f1; rc="$?"',
    'cmd | wc -l; echo "count rc=$?"',
    'cmd | sed -n "1,5p"; if [ "$?" -eq 0 ]; then echo ok; fi',
  ])('DENIES %s', (command) => {
    expect(decisionFor(command)).toBe('deny');
  });

  it('the denial names the filter that swallowed the status, and offers a fix', () => {
    const reason = (JSON.parse(runGuard('npx tsc --noEmit | tail -3; echo "rc=$?"')) as {
      hookSpecificOutput: { permissionDecisionReason: string };
    }).hookSpecificOutput.permissionDecisionReason;
    expect(reason).toContain('tail');
    expect(reason).toContain('> /tmp/out.log');
  });

  // ── Legitimate, or merely ambiguous: warn, never block ─────────────────────────

  it.each([
    'git branch | grep -q foo; if [ "$?" -eq 0 ]; then echo yes; fi',
  ])('WARNS but does not deny: %s', (command) => {
    expect(decisionFor(command)).toBe('warn');
  });

  // ── Silence, because there is nothing to say ───────────────────────────────────

  it.each([
    'cmd | tail -5; echo done',
    'set -o pipefail; cmd | tail -5; echo "$?"',
    'cmd | tail -5; echo "${PIPESTATUS[0]}"',
    'npm test > /tmp/x.log 2>&1; rc=$?; tail -5 /tmp/x.log',
    'echo hello world',
  ])('stays QUIET for %s', (command) => {
    expect(decisionFor(command)).toBe('quiet');
  });

  // ── Writing about the rule must stay possible ──────────────────────────────────
  // The stash guard blocked the commit that documented it. This guard must not repeat that.

  it('ALLOWS a heredoc whose body quotes the rule', () => {
    const command = `cat >> docs/PROJECT_LEDGER.md << 'LEDGEREOF'
Never read the status variable after a pipe: cmd | tail -5; echo "rc=$?" reports tail's status.
LEDGEREOF`;
    expect(decisionFor(command)).toBe('quiet');
  });

  it('ALLOWS the offending string carried as a single-quoted argument', () => {
    // Single quotes suppress expansion, so this is data, not a status read. The guard's own
    // probe harness is this shape, and an earlier version denied it.
    expect(decisionFor(`probe 'cmd | tail -5; echo $?' DENY`)).toBe('quiet');
  });
});
