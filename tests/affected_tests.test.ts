import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { affected, needlesFor } = require('../tools/affected_tests.cjs') as {
  affected: (baseRef: string, repoRoot?: string) => {
    changed: string[];
    reached: Map<string, string>;
    tests: string[];
    why: Map<string, Set<string>>;
  };
  needlesFor: (file: string) => string[];
};

// WHY THIS TOOL EXISTS, AND WHY IT IS TESTED
//
// Running the whole suite locally before every push duplicates work CI is about to do anyway, so
// the local gate should be "everything the change can reach". Choosing that set by hand failed
// twice in one session, both times on a test that consumes DATA OR DOCS rather than code:
// task_manifests (a manifest named a changed CSS file) and plan_index (a plan was edited).
//
// A selector that silently under-covers is worse than no selector, because it produces confident
// green. These tests pin the two shapes that actually went wrong.

describe('affected-tests needle selection', () => {
  it('does not produce needles broad enough to match the whole suite', () => {
    // The first version walked EVERY ancestor directory, which added `src/ui/map` and selected
    // 546 of ~600 test files. A "targeted" set that is the whole suite is the question restated,
    // not an answer.
    const needles = needlesFor('src/ui/map/components/warroom/WarroomShellLayer.tsx');
    expect(needles).not.toContain('src/ui');
    expect(needles).not.toContain('src/ui/map');
    expect(needles).not.toContain('src/ui/map/components');
    expect(needles).toContain('src/ui/map/components/warroom');
    expect(needles).toContain('WarroomShellLayer.tsx');
  });

  it('does not use an extensionless basename, which matches half the repo', () => {
    expect(needlesFor('src/ui/map/styles/globals.css')).not.toContain('globals');
    expect(needlesFor('assets/ui/fonts/README.md')).not.toContain('README');
  });
});

describe('affected-tests selection over a sandbox repo', () => {
  let repo: string;

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

  const write = (rel: string, body: string): void => {
    mkdirSync(join(repo, rel.split('/').slice(0, -1).join('/')), { recursive: true });
    writeFileSync(join(repo, rel), body);
  };

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'awwv-affected-'));

    // A test that names its subject directly.
    write('src/widget/Widget.tsx', 'export const Widget = 1;\n');
    write('tests/widget.test.ts', "import '../src/widget/Widget';\n");

    // THE INDIRECTION CASE. This test names only the SCRIPT; the script knows the data path.
    // This is the shape that defeated the first version: tests/plan_index.test.ts never mentions
    // docs/plans, it requires tools/derive_plan_index.cjs, and the tool holds the path.
    write('docs/plans/some-plan.md', '# plan\n');
    write('tools/derive_index.cjs', "const INDEX = 'docs/plans/index.yml';\nmodule.exports = { INDEX };\n");
    write('tests/index_derivation.test.ts', "require('../tools/derive_index.cjs');\n");

    // A test that has nothing to do with any of it.
    write('src/other/Other.ts', 'export const other = 2;\n');
    write('tests/unrelated.test.ts', "import '../src/other/Other';\n");

    git('init', '-q');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'test');
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
    git('branch', '-M', 'main');
    git('checkout', '-q', '-b', 'work');
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('selects a test that names the changed file', () => {
    writeFileSync(join(repo, 'src/widget/Widget.tsx'), 'export const Widget = 99;\n');
    const result = affected('main', repo);
    expect(result.tests).toContain('tests/widget.test.ts');
    writeFileSync(join(repo, 'src/widget/Widget.tsx'), 'export const Widget = 1;\n');
  });

  it('selects a test that only names the SCRIPT which consumes the changed path', () => {
    // The motivating miss, in miniature. Editing a plan must select the index-derivation test even
    // though that test has never heard of `docs/plans`.
    writeFileSync(join(repo, 'docs/plans/some-plan.md'), '# plan, edited\n');
    const result = affected('main', repo);
    expect(result.reached.has('tools/derive_index.cjs'), 'script reached by the changed path').toBe(true);
    expect(result.tests).toContain('tests/index_derivation.test.ts');
    // And the reason is reported as the hop, so a human can tell why it was selected.
    expect([...(result.why.get('tests/index_derivation.test.ts') ?? [])].join(' ')).toContain('→');
    writeFileSync(join(repo, 'docs/plans/some-plan.md'), '# plan\n');
  });

  it('leaves out a test with no connection to the change', () => {
    // A selector that returns everything is not a selector. This is the assertion that keeps the
    // heuristic honest in the other direction.
    writeFileSync(join(repo, 'src/widget/Widget.tsx'), 'export const Widget = 99;\n');
    const result = affected('main', repo);
    expect(result.tests).not.toContain('tests/unrelated.test.ts');
    writeFileSync(join(repo, 'src/widget/Widget.tsx'), 'export const Widget = 1;\n');
  });

  it('always selects a changed test file itself', () => {
    writeFileSync(join(repo, 'tests/unrelated.test.ts'), "import '../src/other/Other';\n// touched\n");
    const result = affected('main', repo);
    expect(result.tests).toContain('tests/unrelated.test.ts');
  });
});
