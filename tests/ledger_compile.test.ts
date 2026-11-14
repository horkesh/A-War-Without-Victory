/**
 * Ledger fragments: one file per PR instead of a shared insertion point at the top of the ledger.
 * The compile step must be deterministic and idempotent, and the guard must ask for a fragment
 * only when a PR touches product code or data.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const compile = require('../tools/ledger_compile.cjs');
const guard = require('../tools/ledger_fragment_check.cjs');

const HEAD = '<!-- LEDGER ARCHIVE POINTERS -->\n<!--\n  pointers\n-->\n\n## 2026-10-01 — Old hand-written entry\n\nOld text.\n';

const dirs: string[] = [];
function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ledger-compile-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'fragments'));
  return dir;
}
function frag(dir: string, name: string, body: string): void {
  writeFileSync(join(dir, 'fragments', name), body, 'utf8');
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('ledger_compile', () => {
  it('orders fragments newest first, then by file name, and keeps old entries below', () => {
    const dir = scratch();
    frag(dir, '2026-11-14-b.md', '## 2026-11-14 — B\n\nb');
    frag(dir, '2026-11-14-a.md', '## 2026-11-14 — A\n\na');
    frag(dir, '2026-11-13-z.md', '## 2026-11-13 — Z\n\nz');
    frag(dir, 'README.md', '# not a fragment');
    const { fragments, errors } = compile.loadFragments(join(dir, 'fragments'));
    expect(errors).toEqual([]);
    const out = compile.applyBlock(HEAD, compile.renderBlock(fragments));
    const order = ['— A', '— B', '— Z', 'Old hand-written entry'].map((t) => out.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(out.indexOf(compile.BEGIN)).toBeGreaterThan(out.indexOf('-->'));
    expect(out.indexOf(compile.END)).toBeLessThan(out.indexOf('Old hand-written entry'));
  });

  it('is idempotent and independent of input order', () => {
    const dir = scratch();
    frag(dir, '2026-11-14-a.md', '## 2026-11-14 — A\n\na');
    frag(dir, '2026-11-12-c.md', '## 2026-11-12 — C\n\nc');
    const { fragments } = compile.loadFragments(join(dir, 'fragments'));
    const once = compile.applyBlock(HEAD, compile.renderBlock(fragments));
    const twice = compile.applyBlock(once, compile.renderBlock([...fragments].reverse()));
    expect(twice).toBe(once);
  });

  it('replaces the generated block when a fragment is added later', () => {
    const dir = scratch();
    frag(dir, '2026-11-12-c.md', '## 2026-11-12 — C\n\nc');
    let { fragments } = compile.loadFragments(join(dir, 'fragments'));
    const first = compile.applyBlock(HEAD, compile.renderBlock(fragments));
    frag(dir, '2026-11-14-a.md', '## 2026-11-14 — A\n\na');
    fragments = compile.loadFragments(join(dir, 'fragments')).fragments;
    const second = compile.applyBlock(first, compile.renderBlock(fragments));
    expect(second.split(compile.BEGIN).length).toBe(2);
    expect(second.indexOf('— A')).toBeLessThan(second.indexOf('— C'));
    expect(second.endsWith('Old text.\n')).toBe(true);
  });

  it('rejects bad names, headings and date mismatches', () => {
    const dir = scratch();
    frag(dir, 'notes.md', '## 2026-11-14 — X');
    frag(dir, '2026-11-14-no-heading.md', 'plain text');
    frag(dir, '2026-11-14-mismatch.md', '## 2026-11-13 — X');
    const { fragments, errors } = compile.loadFragments(join(dir, 'fragments'));
    expect(fragments).toEqual([]);
    expect(errors).toHaveLength(3);
  });

  it('check mode fails on a stale block and passes after compiling', () => {
    const dir = scratch();
    const ledger = join(dir, 'LEDGER.md');
    writeFileSync(ledger, HEAD, 'utf8');
    frag(dir, '2026-11-14-a.md', '## 2026-11-14 — A\n\na');
    const argv = (...flags: string[]) => ['node', 'x', '--dir', join(dir, 'fragments'), '--ledger', ledger, ...flags];
    const quiet = { log: console.log, error: console.error };
    console.log = () => undefined;
    console.error = () => undefined;
    try {
      expect(compile.main(argv('--check'))).toBe(1);
      expect(readFileSync(ledger, 'utf8')).toBe(HEAD);
      expect(compile.main(argv())).toBe(0);
      expect(readFileSync(ledger, 'utf8')).toContain('— A');
      expect(compile.main(argv('--check'))).toBe(0);
    } finally {
      console.log = quiet.log;
      console.error = quiet.error;
    }
  });

  it('the real fragments directory is valid', () => {
    const real = join(__dirname, '..', 'docs', 'ledger', 'fragments');
    const { errors } = compile.loadFragments(real);
    expect(errors).toEqual([]);
  });
});

describe('ledger_fragment_check', () => {
  it('asks for a fragment only when src/ or data/ changes', () => {
    expect(guard.evaluate(['docs/a.md'], ['docs/a.md']).ok).toBe(true);
    expect(guard.evaluate(['src/a.ts'], []).ok).toBe(false);
    expect(guard.evaluate(['data/a.json'], []).ok).toBe(false);
  });

  it('accepts an added fragment, and ignores the README', () => {
    const frag = 'docs/ledger/fragments/2026-11-14-x.md';
    expect(guard.evaluate(['src/a.ts', frag], [frag]).ok).toBe(true);
    const readme = 'docs/ledger/fragments/README.md';
    expect(guard.evaluate(['src/a.ts', readme], [readme]).ok).toBe(false);
  });

  it('accepts a direct ledger edit during the transition only', () => {
    const verdict = guard.evaluate(['src/a.ts', 'docs/PROJECT_LEDGER.md'], []);
    expect(verdict.ok).toBe(guard.ACCEPT_DIRECT_LEDGER_EDIT);
  });
});
