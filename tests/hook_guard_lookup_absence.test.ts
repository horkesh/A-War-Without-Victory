/**
 * `guard_lookup_absence` warns when a search looks for a field assigned a LITERAL value, because
 * that pattern cannot match an assignment of a computed one. On 2026-08-26 searching
 * `readiness = 'active'` returned 2 hits and produced the false conclusion "nothing restores
 * readiness"; the real write was `formation.readiness = deriveReadinessState(formation)`, and the
 * wrong hypothesis became a plan prerequisite before 232 counter-examples killed it.
 *
 * It is ADVISORY, and these tests pin it as advisory. They exist so that promoting it later is a
 * decision rather than a guess: nobody can tell whether a hook is safe to make blocking without
 * knowing exactly what it fires on today.
 *
 * The load-bearing half is the SILENT cases. This hook's own advice is "re-run against the bare
 * field name" — so if it fired on `readiness =` it would be warning about its own remedy, and
 * would be switched off within a day.
 *
 * Case shapes proposed by the local executor; every expectation below was derived by running the
 * hook and then judged. Its own first batch produced two cases where twelve were asked for,
 * because the schema constraining the reply set no minimum length.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_lookup_absence.sh';

type Verdict = 'fires' | 'quiet';

/** Feed a search pattern to the hook exactly as Claude Code would. Errors are not swallowed. */
function verdictFor(toolInput: Record<string, string>): Verdict {
  const payload = JSON.stringify({ tool_input: toolInput });
  const out = execFileSync('bash', [GUARD], { input: payload, encoding: 'utf8' }).trim();
  if (out === '') return 'quiet';
  const parsed = JSON.parse(out) as {
    hookSpecificOutput?: { additionalContext?: string; permissionDecision?: string };
  };
  // If this ever returns 'deny', the hook has been promoted and this file must be revisited.
  expect(parsed.hookSpecificOutput?.permissionDecision).toBeUndefined();
  return parsed.hookSpecificOutput?.additionalContext ? 'fires' : 'quiet';
}

describe('guard_lookup_absence (advisory)', () => {
  it('exists and is registered as a PostToolUse hook', () => {
    expect(existsSync(GUARD)).toBe(true);
    const settings = readFileSync('.claude/settings.json', 'utf8');
    expect(settings).toContain('guard_lookup_absence.sh');
    expect(JSON.parse(settings).hooks.PostToolUse).toBeDefined();
  });

  // ── Fires: a field pinned to a literal ─────────────────────────────────────────

  it.each([
    ["readiness = 'active'", 'the 2026-08-26 search, verbatim'],
    ['status = "open"', 'double quotes'],
    ["phase: 'war'", 'object-literal form, not assignment'],
  ])('WARNS about %s — %s', (pattern) => {
    expect(verdictFor({ pattern })).toBe('fires');
  });

  it('says what to search instead, not merely that the search is narrow', () => {
    const out = execFileSync('bash', [GUARD], {
      input: JSON.stringify({ tool_input: { pattern: "readiness = 'active'" } }),
      encoding: 'utf8',
    });
    const context = (JSON.parse(out) as {
      hookSpecificOutput: { additionalContext: string };
    }).hookSpecificOutput.additionalContext;
    expect(context).toContain('deriveReadinessState');
    expect(context).toContain('whowrites');
  });

  // ── Silent: the remedy, and everything unrelated ───────────────────────────────

  it.each([
    ['readiness =', 'THE HOOK\'S OWN ADVICE — warning here would make it self-defeating'],
    ['readiness', 'a bare field name'],
    ['function deriveReadinessState', 'searching for the computed writer itself'],
    ['x = 1', 'an unquoted number is not a pinned string literal'],
    ['', 'no pattern at all'],
  ])('stays QUIET for %s — %s', (pattern) => {
    expect(verdictFor({ pattern })).toBe('quiet');
  });

  it('reads only the fields it documents', () => {
    // The hook inspects `pattern` and `command`. A payload carrying the offending text under any
    // other key must do nothing — a case that sets the wrong field proves nothing, and a whole
    // batch of such cases once read as "this hook is dead".
    expect(verdictFor({ file_path: "readiness = 'active'" })).toBe('quiet');
  });
});
