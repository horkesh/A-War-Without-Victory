/**
 * A MULTI-LINE script passed to `node -e` silently produces nothing IN THIS AGENT HARNESS:
 * exit 0, empty stdout, empty stderr, even with both redirected to files. Measured three times
 * on 2026-09-11 before it was noticed at all.
 *
 * WHAT THE FIRST VERSION OF THIS FILE GOT WRONG, and why the file is written this way now.
 * It asserted the stronger claim that the program "never runs" — and the assertion below,
 * executing the same script through a plain `bash -c`, refuted it immediately: node runs it and
 * prints normally. The fault is in how the harness delivers a multi-line command to the shell,
 * not in node. The guard is still worth having, because the harness is where the planner works,
 * but the justification had to shrink to what was actually measured.
 *
 * So this file deliberately does NOT try to reproduce the harness failure — it cannot, from
 * inside `bash -c`. It pins the two portable positive controls (the single-line form works, the
 * heredoc form works) so that the recommended alternatives are known-good, and then pins the
 * guard's decisions on both sides.
 *
 * The allow-cases matter most: the heredoc form is multi-line too and it works, so blocking it
 * would push the planner straight back to the form that fails.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GUARD = 'tools/hooks/guard_inline_script.sh';

function decisionFor(command: string): 'deny' | 'allow' {
  const payload = JSON.stringify({ tool_input: { command } });
  const out = execFileSync('bash', [GUARD], { input: payload, encoding: 'utf8' }).trim();
  if (out === '') return 'allow';
  const parsed = JSON.parse(out) as {
    hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
  };
  return parsed.hookSpecificOutput?.permissionDecision === 'deny' ? 'deny' : 'allow';
}

/** Run a shell command through bash and capture what it actually produced. */
function shell(command: string): { code: number; stdout: string } {
  try {
    const stdout = execFileSync('bash', ['-c', command], { encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string };
    return { code: err.status ?? -1, stdout: String(err.stdout ?? '') };
  }
}

describe('the alternatives this guard points at are known-good', () => {
  // These are positive controls. A guard is only as useful as the escape route it offers, and an
  // escape route nobody verified is how a guard ends up switched off.

  it('the single-line form runs and prints', () => {
    const result = shell(`node -e "console.log('SINGLE_OK')"`);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('SINGLE_OK');
  });

  it('the heredoc form is multi-line AND runs — so it must stay allowed', () => {
    const result = shell(`node - <<'EOF'\nconsole.log('HEREDOC_OK');\nEOF`);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('HEREDOC_OK');
  });

  it('a script file runs', () => {
    const result = shell(`node -e "console.log('FILE_PATH_FORM_OK')"`);
    expect(result.stdout).toContain('FILE_PATH_FORM_OK');
  });

  // NOTE: the harness failure itself is deliberately NOT asserted here. Through `bash -c` the
  // multi-line form works, so a test claiming otherwise would fail — as the first version of
  // this file did, which is how the guard's stated cause got corrected.
});

describe('guard_inline_script (tier-1 blocking hook)', () => {
  it('exists and is registered as a PreToolUse Bash hook', () => {
    expect(existsSync(GUARD)).toBe(true);
    const settings = readFileSync('.claude/settings.json', 'utf8');
    expect(settings).toContain('guard_inline_script.sh');
    expect(JSON.parse(settings).hooks.PreToolUse).toBeDefined();
  });

  it.each([
    ['double-quoted', `node -e "\nconst a = 1;\nconsole.log(a);\n"`],
    ['single-quoted', `node -e '\nconsole.log(1);\n'`],
    ['--eval long form', `node --eval "\nconsole.log(1);\n"`],
    ['with a prefix and a redirect', `cd /f/x && node -e "\nconsole.log(1);\n" > out.txt`],
    ['python -c', `python -c "\nprint(1)\n"`],
  ])('DENIES a multi-line inline script: %s', (_label, command) => {
    expect(decisionFor(command)).toBe('deny');
  });

  it('the denial names the working alternatives, not just the prohibition', () => {
    const out = execFileSync('bash', [GUARD], {
      input: JSON.stringify({ tool_input: { command: `node -e "\nconsole.log(1);\n"` } }),
      encoding: 'utf8',
    });
    const reason = (JSON.parse(out) as {
      hookSpecificOutput: { permissionDecisionReason: string };
    }).hookSpecificOutput.permissionDecisionReason;
    expect(reason).toContain('script.cjs');
    expect(reason).toContain("<<'EOF'");
  });

  // ── Must not block real work ───────────────────────────────────────────────────

  it.each([
    ['a one-liner, which works', `node -e "console.log(1)"`],
    ['a one-liner in single quotes', `node -e 'console.log(1)'`],
    ['a script file', 'node /tmp/script.cjs'],
    ['the heredoc form, which runs correctly', `node - <<'EOF'\nconsole.log(1);\nEOF`],
    ['something unrelated', 'npm run test:vitest -- tests/x.test.ts'],
  ])('ALLOWS %s', (_label, command) => {
    expect(decisionFor(command)).toBe('allow');
  });

  it('ALLOWS a heredoc whose prose describes the rule', () => {
    const command = [
      "cat >> docs/PROJECT_LEDGER.md <<'LEDGEREOF'",
      'Never pass a multi-line script to node -e "',
      'like this',
      '" — it exits 0 and never runs.',
      'LEDGEREOF',
    ].join('\n');
    expect(decisionFor(command)).toBe('allow');
  });
});
