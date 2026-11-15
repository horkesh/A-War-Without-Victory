import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  resolveRootModules,
  resolveTsxCli,
  resolveVitestCli,
} from '../tools/test/vitest_shared_config.mjs';

/**
 * `tools/test/run_execution_contract.mjs` runs at import time (it spawns vitest and tsc), so it
 * is never imported here. These checks pin its path resolution: it must find vitest and tsc
 * through the shared walk-up resolver (so it works from a worktree without its own
 * node_modules), and every test file it lists must exist.
 */
const root = process.cwd();
const scriptSource = readFileSync(join(root, 'tools/test/run_execution_contract.mjs'), 'utf8');

const scratch = mkdtempSync(join(tmpdir(), 'awwv-exec-contract-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function fakePackage(modulesRoot: string, name: string): void {
  mkdirSync(join(modulesRoot, name), { recursive: true });
  writeFileSync(join(modulesRoot, name, 'package.json'), '{}', 'utf8');
}

describe('run_execution_contract path resolution', () => {
  it('resolves vitest, tsx and tsc through the shared walk-up resolver, not a literal node_modules join', () => {
    expect(scriptSource).toMatch(/resolveVitestCli\(root\)/);
    expect(scriptSource).toMatch(/resolveRootModules\(root,\s*'typescript'\)/);
    expect(scriptSource).not.toMatch(/join\(\s*root\s*,\s*['"]node_modules['"]/);
    expect(scriptSource).not.toMatch(/node_modules\/\.bin|node_modules\/vitest|node_modules\/typescript/);
  });

  it('finds vitest, tsx and tsc for this checkout', () => {
    expect(existsSync(resolveVitestCli(root))).toBe(true);
    expect(existsSync(resolveTsxCli(root))).toBe(true);
    const tscCli = join(resolveRootModules(root, 'typescript'), 'typescript', 'bin', 'tsc');
    expect(existsSync(tscCli)).toBe(true);
  });

  it('walks up from a nested worktree-like directory to the ancestor node_modules', () => {
    const main = join(scratch, 'main');
    const modules = join(main, 'node_modules');
    fakePackage(modules, 'vitest');
    fakePackage(modules, 'typescript');
    const worktree = join(main, '.claude', 'worktrees', 'wt');
    mkdirSync(worktree, { recursive: true });

    expect(resolveRootModules(worktree, 'vitest')).toBe(modules);
    expect(resolveVitestCli(worktree)).toBe(join(modules, 'vitest', 'vitest.mjs'));
    expect(join(resolveRootModules(worktree, 'typescript'), 'typescript', 'bin', 'tsc'))
      .toBe(join(modules, 'typescript', 'bin', 'tsc'));
  });

  it('prefers the nearest node_modules and falls back to <root>/node_modules when none exists', () => {
    const outer = join(scratch, 'outer');
    const inner = join(outer, 'inner');
    fakePackage(join(outer, 'node_modules'), 'vitest');
    fakePackage(join(inner, 'node_modules'), 'vitest');
    expect(resolveRootModules(inner, 'vitest')).toBe(join(inner, 'node_modules'));

    const orphan = join(scratch, 'orphan');
    mkdirSync(orphan, { recursive: true });
    const fallback = resolveRootModules(orphan, 'package-that-does-not-exist-anywhere');
    expect(fallback).toBe(join(orphan, 'node_modules'));
    expect(dirname(fallback)).toBe(orphan);
  });

  it('lists only test files that exist and has no duplicates', () => {
    const listed = [...scriptSource.matchAll(/'(tests\/[^']+\.test\.ts)'/g)].map((match) => match[1]);
    expect(listed.length).toBeGreaterThan(10);
    expect(new Set(listed).size).toBe(listed.length);
    const missing = listed.filter((file) => !existsSync(join(root, file)));
    expect(missing).toEqual([]);
  });
});
