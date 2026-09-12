import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const scanner = require('../tools/scan_negative_source_assertions.cjs') as {
  scan: (repoRoot?: string) => string[];
  offends: (relPath: string, repoRoot?: string) => boolean;
  loadBaseline: (repoRoot?: string) => string[];
};

const repoRoot = resolve(__dirname, '..');

// WHY THIS TEST EXISTS
//
// A "must NOT appear" assertion over source text reads PROSE AS CODE, and the prose most likely to
// mention a banned construct is the comment explaining why it is banned. It has fired four times in
// two sessions, every time on the file's own explanation.
//
// After the first, tests/helpers/sourceComments.ts was written to own the stripping — and did not
// stop the next three, because a helper only helps if you remember to call it. That is a rule
// written down, which is the weakest form of fix there is. This test is the same rule at a tier
// where forgetting is caught rather than hoped against.

describe('negative source assertions are stripped, or baselined', () => {
  it('admits no NEW test that asserts absence against un-stripped source', () => {
    const baseline = new Set(scanner.loadBaseline());
    const added = scanner.scan().filter((file) => !baseline.has(file));
    expect(
      added,
      `${added.length} new test file(s) assert absence against un-stripped source:\n`
      + `${added.map((f) => `  - ${f}`).join('\n')}\n\n`
      + 'Strip comments first — tests/helpers/sourceComments.ts. If the assertion genuinely is not '
      + 'about source text, add the file to tests/negative_source_assertion_baseline.json with '
      + '`node tools/scan_negative_source_assertions.cjs --update`.',
    ).toEqual([]);
  });

  it('FIRES on the shape, proved against a sandbox rather than assumed', () => {
    // The positive control. A scanner that silently matches nothing passes its own baseline check
    // forever, and that is precisely the failure mode being guarded against here.
    const sandbox = mkdtempSync(join(tmpdir(), 'awwv-negassert-'));
    try {
      mkdirSync(join(sandbox, 'tests/helpers'), { recursive: true });
      copyFileSync(
        resolve(repoRoot, 'tests/helpers/sourceComments.ts'),
        join(sandbox, 'tests/helpers/sourceComments.ts'),
      );

      const offending = [
        "import { readFileSync } from 'node:fs';",
        "it('bans a thing', () => {",
        "  const source = readFileSync('src/x.ts', 'utf8');",
        "  expect(source).not.toContain('Math.random(');",
        '});',
      ].join('\n');
      writeFileSync(join(sandbox, 'tests/offender.test.ts'), offending);

      const stripped = [
        "import { readFileSync } from 'node:fs';",
        "import { withoutComments } from './helpers/sourceComments';",
        "it('bans a thing', () => {",
        "  const source = withoutComments(readFileSync('src/x.ts', 'utf8'));",
        "  expect(source).not.toContain('Math.random(');",
        '});',
      ].join('\n');
      writeFileSync(join(sandbox, 'tests/stripped.test.ts'), stripped);

      const positive = [
        "it('asserts about a value, not a file', () => {",
        "  expect(['a']).not.toContain('b');",
        '});',
      ].join('\n');
      writeFileSync(join(sandbox, 'tests/unrelated.test.ts'), positive);

      const found = scanner.scan(sandbox);
      expect(found, 'the un-stripped reader must be caught').toContain('tests/offender.test.ts');
      expect(found, 'a stripped reader must not be').not.toContain('tests/stripped.test.ts');
      expect(found, 'a test that reads no file must not be').not.toContain('tests/unrelated.test.ts');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('keeps the baseline shrinking-only in spirit — every entry still exists', () => {
    // A baseline naming files that are gone is a baseline nobody has read. It may shrink freely;
    // it must not rot.
    const missing = scanner.loadBaseline().filter((file) => !scanner.scan().includes(file));
    expect(missing, `baselined file(s) no longer offend — run --update to shrink:\n${missing.join('\n')}`)
      .toEqual([]);
  });
});
