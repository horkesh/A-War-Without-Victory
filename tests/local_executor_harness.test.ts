/**
 * Local-executor harness wiring.
 *
 * A harness is only "standing" if it is discoverable at session start and cannot decay
 * silently. These tests pin the wiring, not the model: they never call ollama, so they
 * pass in CI where no local model exists.
 *
 * What each guards:
 *   - config is DATA, so swapping models needs no code edit
 *   - the entry points exist and are registered as npm scripts
 *   - both entry points REFUSE rather than proceed when under-specified
 *   - CLAUDE.md still points at the harness — this is the discovery path, and a tool
 *     nobody loads is not a harness
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CONFIG = 'tools/local_executor/config.json';
const DELEGATE = 'tools/local_executor/delegate.mjs';
const GATE = 'tools/local_executor/gate.mjs';
const PREFLIGHT = 'tools/local_executor/preflight.mjs';

/** Run a node script and return its exit code, never throwing. */
function exitCodeOf(script: string, args: string[] = []): number {
  try {
    execFileSync('node', [script, ...args], { stdio: 'pipe' });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? -1;
  }
}

describe('local executor harness', () => {
  it('every entry point exists', () => {
    for (const file of [CONFIG, DELEGATE, GATE, PREFLIGHT]) {
      expect(existsSync(file), file).toBe(true);
    }
  });

  it('model choice is data, not code', () => {
    const config = JSON.parse(readFileSync(CONFIG, 'utf8')) as Record<string, unknown>;
    for (const key of ['host', 'model', 'num_ctx', 'think']) {
      expect(config[key], key).toBeDefined();
    }
    expect(typeof config.model).toBe('string');
    expect(typeof config.num_ctx).toBe('number');
    expect(config.num_ctx as number).toBeGreaterThanOrEqual(32768);

    // The default model must not be hardcoded in the script — that is what makes a swap
    // a data edit rather than a code edit.
    const delegate = readFileSync(DELEGATE, 'utf8');
    expect(delegate).toContain('config.model');
    expect(delegate).not.toMatch(/opt\('--model',\s*'[^']+'\)/);
  });

  it('both entry points are registered as npm scripts', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['gate:local']).toContain('local_executor/gate.mjs');
    expect(pkg.scripts['local:check']).toContain('local_executor/preflight.mjs');
    expect(pkg.scripts['local:delegate']).toContain('local_executor/delegate.mjs');
  });

  // ── The refusals are the safety property. A harness that proceeds when
  //    under-specified is worse than no harness: it produces confident nothing.

  it('the gate REFUSES when no acceptance tests are declared', () => {
    expect(exitCodeOf(GATE)).toBe(2);
  });

  it('the gate REFUSES a declared test file that does not exist', () => {
    expect(exitCodeOf(GATE, ['--tests', 'tests/definitely_not_a_real_file.test.ts'])).toBe(2);
  });

  it('delegate REFUSES without a spec or prompt', () => {
    expect(exitCodeOf(DELEGATE)).toBe(2);
  });

  it('delegate REFUSES a --read file that does not exist', () => {
    expect(exitCodeOf(DELEGATE, ['--prompt', 'x', '--read', 'src/nope_not_real.ts'])).toBe(2);
  });

  // ── Argument parsing ───────────────────────────────────────────────────────────
  //
  // On 2026-09-11 `--read a.sh b.sh c.sh` sent ONE file and silently dropped two, because
  // --read took a single value and the rest became stray argv. The dispatch reported success,
  // and the model answered confidently about code it had never been shown. Nothing in the
  // output said so. These pin both halves of the fix: every file arrives, and anything the
  // parser does not understand stops the dispatch.

  /** stderr of a delegate run, pointed at a dead host so it never reaches a real model. */
  function stderrOf(args: string[]): string {
    try {
      execFileSync('node', [DELEGATE, ...args, '--host', 'http://127.0.0.1:1'], { stdio: 'pipe' });
      return '';
    } catch (error) {
      return String((error as { stderr?: Buffer }).stderr ?? '');
    }
  }

  it.each([
    ['space-separated', [CONFIG, DELEGATE, GATE]],
    ['comma-separated', [[CONFIG, DELEGATE, GATE].join(',')]],
  ])('--read sends EVERY file when %s', (_label, readArgs) => {
    const stderr = stderrOf(['--prompt', 'x', '--read', ...readArgs, '--out', 'unused.md']);
    for (const file of [CONFIG, DELEGATE, GATE]) {
      expect(stderr, `${file} should have been included`).toContain(`including ${file}`);
    }
  });

  it('REFUSES an argument it does not understand rather than ignoring it', () => {
    expect(exitCodeOf(DELEGATE, ['--prompt', 'x', '--reed', 'typo.ts', '--out', 'unused.md']))
      .toBe(2);
    expect(stderrOf(['--prompt', 'x', '--reed', 'typo.ts', '--out', 'unused.md']))
      .toContain('unrecognised argument');
  });

  it('REFUSES a flag given no value', () => {
    expect(exitCodeOf(DELEGATE, ['--prompt', 'x', '--out'])).toBe(2);
  });

  it('the determinism ban list covers the rule that has actually been violated', () => {
    // A 30B model returned .localeCompare() for a "deterministic comparator" on 2026-09-10.
    // It is locale-dependent and looked more professional than the correct answer.
    const gate = readFileSync(GATE, 'utf8');
    for (const banned of ['Math\\.random', 'Date\\.now', 'localeCompare']) {
      expect(gate, `${banned} must be in the determinism ban list`).toContain(banned);
    }
  });

  it('CLAUDE.md points at the harness, so a new session discovers it', () => {
    // This is the discovery path. If it is removed the harness silently stops existing
    // for every future session, which is exactly the decay this test prevents.
    const claude = readFileSync('CLAUDE.md', 'utf8');
    expect(claude).toContain('tools/local_executor');
    expect(claude).toMatch(/gate:local/);
  });
});
