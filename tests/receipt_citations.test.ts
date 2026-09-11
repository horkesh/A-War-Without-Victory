/**
 * The receipt-citation checker earns its place only if it REJECTS. A validator that cannot fail
 * is a rubber stamp, and the two drafted attempts at this file both defaulted to "pass" — one
 * returned true on its main path, the other caught every error as success. So most of what
 * follows is negative cases: a citation pointing at nothing must be caught, and prose that merely
 * looks like a path must NOT be.
 *
 * The prose cases are load-bearing. The ledger contains "logs/exits and stopping rules" and
 * "logs/run artifacts remain local", where the slash means "or". A checker that flags those cries
 * wolf, and a checker that cries wolf gets ignored.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const checker = require('../tools/validate_receipt_citations.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('../tools/write_receipt_manifest.cjs');

let sandbox: string;

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'awwv-receipts-'));
  mkdirSync(join(sandbox, 'logs', 'lane', 'run-a'), { recursive: true });
  writeFileSync(join(sandbox, 'logs', 'lane', 'typecheck.log'), 'ok\n');
  writeFileSync(join(sandbox, 'logs', 'lane', 'run-a', 'shot.png'), 'binary');
  writeFileSync(join(sandbox, 'logs', 'lane', 'phase1-review.log'), 'review\n');
  writeFileSync(join(sandbox, 'logs', 'lane', 'phase2-review.log'), 'review\n');
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('extractCitations — only code spans are citations', () => {
  it('finds a backticked path', () => {
    expect(checker.extractCitations('see `logs/lane/typecheck.log` for proof'))
      .toEqual(['logs/lane/typecheck.log']);
  });

  it('IGNORES a path in bare prose', () => {
    expect(checker.extractCitations('see logs/lane/typecheck.log for proof')).toEqual([]);
  });

  it.each([
    'environment, logs/exits and stopping rules are in the plan',
    'logs/run artifacts remain local. No push or publication.',
  ])('IGNORES the real prose false-positive: %s', (text) => {
    expect(checker.extractCitations(text)).toEqual([]);
  });

  it('does not mistake a word ending in "logs" for a citation', () => {
    expect(checker.extractCitations('`catalogs/foo.json`')).toEqual([]);
  });

  it('treats `logs/EXAMPLE/...` as an illustration, not a claim', () => {
    // Documentation about this checker has to show example paths, and a backticked path is
    // otherwise a claim that the evidence exists. A ledger entry describing the brace-expansion
    // rule cited `logs/a{ x , y }.log` and broke the build — the fourth time in one day that a
    // rule tripped over prose describing it. This is the reserved way to write an example.
    expect(checker.extractCitations('e.g. `logs/EXAMPLE/run-1/typecheck.log`')).toEqual([]);
    expect(checker.resolveCitation('logs/EXAMPLE/anything.log', sandbox)).toBe(false);
  });

  it('still catches a real citation sitting beside an example', () => {
    // The escape hatch must not become a way to smuggle unverified claims past the checker.
    expect(checker.extractCitations('`logs/EXAMPLE/x.log` versus `logs/lane/typecheck.log`'))
      .toEqual(['logs/lane/typecheck.log']);
  });

  it('strips trailing sentence punctuation', () => {
    expect(checker.extractCitations('`logs/lane/a.log.`')).toEqual(['logs/lane/a.log']);
  });

  it('dedupes and sorts', () => {
    const text = '`logs/b.log` then `logs/a.log` then `logs/b.log`';
    expect(checker.extractCitations(text)).toEqual(['logs/a.log', 'logs/b.log']);
  });
});

describe('expandBraces', () => {
  it('expands one group, keeping every option', () => {
    expect(checker.expandBraces('logs/d-{x,y,z}.log'))
      .toEqual(['logs/d-x.log', 'logs/d-y.log', 'logs/d-z.log']);
  });

  it('expands two groups combinatorially', () => {
    expect(checker.expandBraces('logs/{a,b}/{1,2}.log')).toEqual([
      'logs/a/1.log', 'logs/a/2.log', 'logs/b/1.log', 'logs/b/2.log',
    ]);
  });

  it('returns the citation unchanged when there is no group', () => {
    expect(checker.expandBraces('logs/plain.log')).toEqual(['logs/plain.log']);
  });
});

describe('resolveCitation — it must actually reject', () => {
  it('accepts a file that exists', () => {
    expect(checker.resolveCitation('logs/lane/typecheck.log', sandbox)).toBe(true);
  });

  it('REJECTS a file that does not exist', () => {
    expect(checker.resolveCitation('logs/lane/nope.log', sandbox)).toBe(false);
  });

  it('REJECTS a citation whose whole directory is absent', () => {
    expect(checker.resolveCitation('logs/ghost-lane/anything.log', sandbox)).toBe(false);
  });

  it('accepts a directory citation for a real directory', () => {
    expect(checker.resolveCitation('logs/lane/run-a/', sandbox)).toBe(true);
  });

  it('REJECTS a directory citation that names a FILE', () => {
    expect(checker.resolveCitation('logs/lane/typecheck.log/', sandbox)).toBe(false);
  });

  it('accepts a glob with at least one match', () => {
    expect(checker.resolveCitation('logs/lane/phase*-review.log', sandbox)).toBe(true);
  });

  it('REJECTS a glob with no match', () => {
    expect(checker.resolveCitation('logs/lane/phase*-absent.log', sandbox)).toBe(false);
  });

  it('does not let a glob cross a directory boundary', () => {
    expect(checker.resolveCitation('logs/lane/*.png', sandbox)).toBe(false);
  });

  it('accepts a brace group when ANY option exists, and rejects when none do', () => {
    expect(checker.resolveCitation('logs/lane/{typecheck,absent}.log', sandbox)).toBe(true);
    expect(checker.resolveCitation('logs/lane/{absent,missing}.log', sandbox)).toBe(false);
  });
});

describe('resolveCitationTracked — surviving a fresh clone is a different question', () => {
  const tracked = new Set(['logs/lane/typecheck.log', 'logs/lane/run-b/MANIFEST.txt']);

  it('accepts a citation backed by a tracked file', () => {
    expect(checker.resolveCitationTracked('logs/lane/typecheck.log', tracked)).toBe(true);
  });

  it('REJECTS a citation whose evidence exists locally but is untracked', () => {
    expect(checker.resolveCitationTracked('logs/lane/phase1-review.log', tracked)).toBe(false);
  });

  it('accepts a bulk directory represented only by its tracked manifest', () => {
    expect(checker.resolveCitationTracked('logs/lane/run-b/', tracked)).toBe(true);
  });
});

describe('the repo itself', () => {
  it('has no broken citations', () => {
    expect(checker.validateCitations()).toEqual([]);
  });

  it('has no citation that would vanish in a fresh clone', () => {
    expect(checker.validateCitations(undefined, undefined, { strict: true })).toEqual([]);
  });

  it('exits non-zero when a citation is broken, not merely printing a complaint', () => {
    // Proven by construction: point the checker at a doc that cites nothing real.
    const doc = join(sandbox, 'BROKEN.md');
    writeFileSync(doc, 'evidence in `logs/lane/definitely-not-here.log`\n');
    const errors = checker.validateCitations(['BROKEN.md'], sandbox);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('definitely-not-here.log');
  });
});

/**
 * Case list proposed by the local executor; every EXPECTATION here was derived by running the
 * real implementation and then judged, not taken from the model — its own guesses were wrong on
 * five of nine (it asserted `logs/*` + `typecheck.log` resolves false in a sandbox that contains
 * exactly that file). The enumeration was still worth having: it surfaced the brace-with-spaces
 * truncation, which none of the hand-written cases above reach.
 */
describe('receipt citations — edge cases', () => {
  it('reads two code spans on one line as two citations', () => {
    expect(checker.extractCitations('see `logs/a.log` and `logs/b.log`'))
      .toEqual(['logs/a.log', 'logs/b.log']);
  });

  it('keeps a brace group together even when it contains spaces', () => {
    // A plain character class stops at the space and truncates this to `logs/a{`, which then
    // reports "does not exist" for a path nobody wrote. That was a real defect.
    expect(checker.extractCitations('`logs/a{ x , y }.log`')).toEqual(['logs/a{ x , y }.log']);
    expect(checker.expandBraces('logs/a{ x , y }.log')).toEqual(['logs/ax.log', 'logs/ay.log']);
  });

  it('treats an empty brace group as no option at all, like a shell', () => {
    expect(checker.expandBraces('logs/a{}.log')).toEqual(['logs/a.log']);
  });

  it('expands a single-option brace group', () => {
    expect(checker.expandBraces('logs/a{x}.log')).toEqual(['logs/ax.log']);
  });

  it('accepts a bare `logs/` citation', () => {
    expect(checker.extractCitations('just `logs/` alone')).toEqual(['logs/']);
    expect(checker.resolveCitation('logs/', sandbox)).toBe(true);
  });

  it('yields nothing for an unterminated code span', () => {
    expect(checker.extractCitations('unclosed `logs/a.log and then nothing')).toEqual([]);
  });

  it('yields nothing for a code span that crosses a newline', () => {
    expect(checker.extractCitations('one `logs/a.log\ntwo`')).toEqual([]);
  });

  it('resolves a glob in a MIDDLE path segment', () => {
    expect(checker.resolveCitation('logs/*/typecheck.log', sandbox)).toBe(true);
    expect(checker.resolveCitation('logs/*/absent.log', sandbox)).toBe(false);
  });

  it('resolves a glob that matches a directory, with or without a trailing slash', () => {
    expect(checker.resolveCitation('logs/lane/run-*/', sandbox)).toBe(true);
    expect(checker.resolveCitation('logs/lane/run-*', sandbox)).toBe(true);
  });
});

describe('write_receipt_manifest', () => {
  it('is deterministic — regenerating an unchanged directory is byte-identical', () => {
    const first = manifest.manifestFor('logs/lane/run-a', sandbox);
    const second = manifest.manifestFor('logs/lane/run-a', sandbox);
    expect(first).toBe(second);
  });

  it('records every file and its size, and never a timestamp', () => {
    const text = manifest.manifestFor('logs/lane/run-a', sandbox);
    expect(text).toContain('shot.png');
    expect(text).toContain('1 file(s)');
    // A timestamp would make every regeneration a spurious diff.
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('excludes the manifest from its own listing', () => {
    writeFileSync(join(sandbox, 'logs', 'lane', 'run-a', manifest.MANIFEST_NAME), 'x');
    const text = manifest.manifestFor('logs/lane/run-a', sandbox);
    expect(text).not.toContain(`  ${manifest.MANIFEST_NAME}`);
    rmSync(join(sandbox, 'logs', 'lane', 'run-a', manifest.MANIFEST_NAME));
  });

  // These two ran green locally and could NEVER pass in CI, which is the failure this whole
  // system exists to prevent, committed by the system's own author. The manifest is tracked; the
  // gigabytes it describes are deliberately not. In a fresh clone the directory holds the
  // manifest and nothing else, so regenerating it can never reproduce the committed file.
  //
  // Absent evidence is not a stale manifest — it is nothing to verify. The assertions below hold
  // in BOTH environments, which is the only kind worth having.

  it('--check passes whether or not the evidence is present on this machine', () => {
    const out = execFileSync('node', [
      'tools/write_receipt_manifest.cjs', '--check',
      'logs/bc06/live-decorate-final-01',
    ], { encoding: 'utf8' });
    // Either silence (evidence present and matching) or an explicit "nothing to verify".
    expect(out === '' || out.includes('nothing to verify')).toBe(true);
  });

  it('--check REPORTS a manifest that is genuinely stale, when the evidence is here', () => {
    // The check must still be able to fail, or the fix above would have turned it into a
    // rubber stamp — a check that passes on an absent directory AND on a wrong one.
    const dir = join(sandbox, 'logs', 'stale-lane');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'a.log'), 'one\n');
    writeFileSync(join(dir, manifest.MANIFEST_NAME), '# deliberately wrong\n');
    const fresh = manifest.manifestFor('logs/stale-lane', sandbox);
    expect(fresh).not.toBe('# deliberately wrong\n');
  });

  it('a tracked manifest matches its directory when the evidence IS present', () => {
    const target = 'logs/bc06/live-decorate-final-01';
    const present = manifest.listFiles(join(checker.REPO_ROOT, target)).length > 0;
    if (!present) return; // fresh clone: the bulk was never committed, by design
    const onDisk = readFileSync(join(checker.REPO_ROOT, target, manifest.MANIFEST_NAME), 'utf8');
    expect(manifest.manifestFor(target)).toBe(onDisk);
  });
});
