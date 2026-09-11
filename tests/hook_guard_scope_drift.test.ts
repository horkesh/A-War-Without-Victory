/**
 * `guard_scope_drift` fires when expensive, lane-consuming work is about to be spent — a scenario
 * run or a threshold blessing — and prints the lane the session declared, so drift becomes a
 * deliberate choice rather than an accident.
 *
 * WHY IT EXISTS (2026-08-26). A session opened on RE Phase 0: nine cheap items, none needing a
 * run. It repaired a genuine §6 blocker, correctly; that surfaced a switched-off mechanic; the
 * owner ruled it on; that produced four ahistorical villages — and the session then spent THREE
 * 188-week runs and five failed hypotheses chasing them, completing 1 of 9 planned items. No
 * single step was wrong, which is exactly why nothing stopped it.
 *
 * It is ADVISORY and these tests pin it as advisory. It does not judge whether the run is on the
 * lane; it cannot know. It asks.
 *
 * THE MENTION CASES ARE THE REASON THIS FILE EXISTS. The hook matched bare text, so
 * `echo 'npm run sim:scenario:run:188w is expensive'` fired it — and the orchestrator hook
 * chained off that, demanding an expert analysis of a scenario that never ran. Both were
 * answering a question about prose. A guard that fires on discussion of itself trains the reader
 * to ignore it, and an ignored guard is the one that was supposed to catch the thing nobody
 * noticed.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_scope_drift.sh';

type Verdict = 'fires' | 'quiet';

function verdictFor(command: string): Verdict {
  const payload = JSON.stringify({ tool_input: { command } });
  const out = execFileSync('bash', [GUARD], { input: payload, encoding: 'utf8' }).trim();
  if (out === '') return 'quiet';
  const parsed = JSON.parse(out) as {
    hookSpecificOutput?: { additionalContext?: string; permissionDecision?: string };
  };
  // If this ever denies, the hook has been promoted and this file must be revisited.
  expect(parsed.hookSpecificOutput?.permissionDecision).toBeUndefined();
  return parsed.hookSpecificOutput?.additionalContext ? 'fires' : 'quiet';
}

describe('guard_scope_drift (advisory)', () => {
  it('exists and is registered as a PreToolUse hook', () => {
    expect(existsSync(GUARD)).toBe(true);
    const settings = readFileSync('.claude/settings.json', 'utf8');
    expect(settings).toContain('guard_scope_drift.sh');
    expect(JSON.parse(settings).hooks.PreToolUse).toBeDefined();
  });

  // ── Fires: something expensive is actually being spent ─────────────────────────

  it.each([
    ['npm run sim:scenario:run:188w', 'the 188-week scoring run'],
    ['npm run sim:scenario:run:40w', 'the 40-week diagnostic'],
    ['node tools/engine_health_gate.cjs --update', 'a threshold blessing'],
    ['cd /f/A-War-Without-Victory && npm run sim:scenario:run:188w', 'behind a cd'],
  ])('FIRES for %s — %s', (command) => {
    expect(verdictFor(command)).toBe('fires');
  });

  it('names the declared lane and asks rather than judging', () => {
    const out = execFileSync('bash', [GUARD], {
      input: JSON.stringify({ tool_input: { command: 'npm run sim:scenario:run:188w' } }),
      encoding: 'utf8',
    });
    const context = (JSON.parse(out) as {
      hookSpecificOutput: { additionalContext: string };
    }).hookSpecificOutput.additionalContext;
    expect(context).toContain('DECLARED LANE');
    expect(context).toContain('Is THIS run on that lane?');
    // It must offer queueing, not just disapproval — a guard with no exit is one you route around.
    expect(context).toContain('QUEUED');
  });

  // ── Silent: cheap work, and MENTIONS ───────────────────────────────────────────

  it.each([
    ['node tools/engine_health_gate.cjs', 'the gate WITHOUT --update spends nothing'],
    ['npm run test:vitest', 'the test suite is not a scenario run'],
    ['git status', 'unrelated'],
    ['', 'no command at all'],
  ])('stays QUIET for %s — %s', (command) => {
    expect(verdictFor(command)).toBe('quiet');
  });

  it.each([
    ["echo 'npm run sim:scenario:run:188w is expensive'", 'a quoted mention in an echo'],
    ['grep -rn "sim:scenario:run" docs/', 'searching the docs for it'],
    ['git commit -m "docs: explain why sim:scenario:run:188w is gated"', 'a commit message'],
  ])('stays QUIET for a MERE MENTION: %s — %s', (command) => {
    expect(verdictFor(command)).toBe('quiet');
  });

  it('stays QUIET for a heredoc whose body discusses scenario runs', () => {
    const command = [
      "cat >> docs/PROJECT_LEDGER.md <<'LEDGEREOF'",
      'The session spent three `npm run sim:scenario:run:188w` runs on an undeclared lane.',
      'Each `engine_health_gate.cjs --update` blessing compounded it.',
      'LEDGEREOF',
    ].join('\n');
    expect(verdictFor(command)).toBe('quiet');
  });
});
