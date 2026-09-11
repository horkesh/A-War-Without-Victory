/**
 * A file-listing search piped into `head` is an incomplete inventory presented as a complete one.
 *
 * THIS GUARD EXISTS BECAUSE THE WRITTEN RULE FAILED TWICE, ON THE SAME READER.
 * `docs/life_lessons.md` carries it as a starred entry. It was violated anyway:
 *   - establishing "the tests that guard workflows": the truncation hid the test pinning install
 *     counts; an exhaustive search found EIGHT, not three, and main went red
 *   - 2026-09-11, choosing which files a task manifest would read: the five returned did not
 *     include the file the work was about, and the dispatch produced four perfectly VERIFIED
 *     quotes from an unrelated test
 *
 * `-l` is the discriminator: it asks WHICH FILES contain something, which is an inventory
 * question by construction. Content greps are left alone — peeking at the first few matching
 * lines is ordinary.
 *
 * The first version of this guard used lib/command_segments.sh, which splits on `|` — the very
 * character the check depends on. It therefore denied NOTHING while passing every allow-case,
 * which is the tell worth remembering: a guard that denies nothing is indistinguishable from a
 * guard that is perfectly precise, unless you test the deny side.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_truncated_search.sh';

function decisionFor(command: string): 'deny' | 'allow' {
  const out = execFileSync('bash', [GUARD], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  }).trim();
  if (out === '') return 'allow';
  const parsed = JSON.parse(out) as { hookSpecificOutput?: { permissionDecision?: string } };
  return parsed.hookSpecificOutput?.permissionDecision === 'deny' ? 'deny' : 'allow';
}

describe('guard_truncated_search (tier-1 blocking hook)', () => {
  it('exists and is registered as a PreToolUse Bash hook', () => {
    expect(existsSync(GUARD)).toBe(true);
    expect(readFileSync('.claude/settings.json', 'utf8')).toContain('guard_truncated_search.sh');
  });

  it.each([
    ['grep -rlE "date|Date" tests/ui/*.test.ts | head -5', 'the 2026-09-11 error, verbatim'],
    ['grep -rln "\.github/workflows" tests/ | head -5', 'the original incident, verbatim'],
    ['grep -rl pattern src/ | tail -3', 'tail truncates just as much'],
    ['rg -l pattern src/ | head -10', 'ripgrep form'],
    ['cd /f/x && grep -rl pat src/ | head -2', 'behind a cd'],
    ['grep -rl pat src/ | head -5 > /dev/null; grep -rl pat src/ | sort', 'a bad first statement still counts'],
  ])('DENIES %s — %s', (command) => {
    expect(decisionFor(command)).toBe('deny');
  });

  it('the denial offers the complete-list alternatives', () => {
    const out = execFileSync('bash', [GUARD], {
      input: JSON.stringify({ tool_input: { command: 'grep -rl pat src/ | head -5' } }),
      encoding: 'utf8',
    });
    const reason = (JSON.parse(out) as {
      hookSpecificOutput: { permissionDecisionReason: string };
    }).hookSpecificOutput.permissionDecisionReason;
    expect(reason).toContain('| sort');
    expect(reason).toContain('wc -l');
  });

  // ── Must not block real work ───────────────────────────────────────────────────

  it.each([
    ['grep -r pattern src/ | head -5', 'a CONTENT grep is lines, not an inventory'],
    ['grep -rl pattern src/ | sort', 'reading the whole list'],
    ['grep -rl pattern src/ | wc -l', 'counting'],
    ['grep -rl pattern src/ > /tmp/all.txt', 'capturing it complete'],
    ['ls -S docs/plans/*.md | head -10', 'ls is not a search'],
    ['git log --oneline | head -5', 'an unrelated pipeline'],
    ["echo 'grep -rl x | head -5 is banned'", 'a quoted mention of the rule'],
  ])('ALLOWS %s — %s', (command) => {
    expect(decisionFor(command)).toBe('allow');
  });
});
