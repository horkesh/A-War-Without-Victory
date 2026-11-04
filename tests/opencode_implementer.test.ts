import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain ESM tool module without type declarations
import { allowCmdProblem, buildAgentConfig, diffSnapshots, globToRegExp, matchesAny, minimalEnv, parsePorcelainZ, parseStream, snapshot, spawnOptionsFor, terminateTree } from '../tools/opencode_implementer/run.mjs';

const POLICY = JSON.parse(fs.readFileSync(path.resolve('tools/opencode_implementer/policy.json'), 'utf8'));

describe('opencode implementer launcher: process-tree termination', () => {
  it('runs the implementer in its own process group on POSIX and hides the window on Windows', () => {
    expect(spawnOptionsFor('linux', { cwd: 'x' })).toEqual({ cwd: 'x', detached: true });
    expect(spawnOptionsFor('darwin', { cwd: 'x' })).toEqual({ cwd: 'x', detached: true });
    expect(spawnOptionsFor('win32', { cwd: 'x' })).toEqual({ cwd: 'x', windowsHide: true });
  });

  it('kills the whole group on POSIX, tolerates an already-gone group, and uses taskkill /T on Windows', () => {
    const calls: unknown[][] = [];
    const deps = { spawnSync: (...a: unknown[]) => { calls.push(['spawnSync', ...a]); }, kill: (...a: unknown[]) => { calls.push(['kill', ...a]); } };
    terminateTree(4242, 'linux', deps);
    terminateTree(4242, 'win32', deps);
    expect(calls[0]).toEqual(['kill', -4242, 'SIGKILL']);
    expect(calls[1].slice(0, 3)).toEqual(['spawnSync', 'taskkill', ['/PID', '4242', '/T', '/F']]);
    const gone = { spawnSync: () => {}, kill: () => { throw Object.assign(new Error('gone'), { code: 'ESRCH' }); } };
    expect(() => terminateTree(1, 'linux', gone)).not.toThrow();
    const denied = { spawnSync: () => {}, kill: () => { throw Object.assign(new Error('nope'), { code: 'EPERM' }); } };
    expect(() => terminateTree(1, 'linux', denied)).toThrow('nope');
  });

  it.skipIf(process.platform === 'win32')('a descendant spawned by the implementer cannot write after termination (POSIX, real processes)', async () => {
    const { spawn } = await import('node:child_process');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-tree-'));
    const late = path.join(dir, 'late.txt');
    // parent shell backgrounds a delayed writer, then waits: the shape of an implementer running a test runner
    const child = spawn('sh', ['-c', `(sleep 1; echo late > "${late}") & wait`], spawnOptionsFor(process.platform, { stdio: 'ignore' }));
    await new Promise((r) => setTimeout(r, 200));
    terminateTree(child.pid, process.platform);
    await new Promise((r) => setTimeout(r, 1500));
    expect(fs.existsSync(late)).toBe(false);
  });
});

describe('opencode implementer launcher: permission policy', () => {
  it('compiles default-deny first, protected-path denies last, and appends per-job shell allows', () => {
    const cfg = buildAgentConfig(POLICY, ['node activation/x/observer.mjs *']);
    const rules = cfg.agents['awwv-implementer'].permissions;
    expect(rules[0]).toEqual({ action: '*', resource: '*', effect: 'deny' });
    expect(rules.at(-1).effect).toBe('deny');
    expect(rules.some((r: { action: string; resource: string; effect: string }) =>
      r.action === 'shell' && r.resource === 'node activation/x/observer.mjs *' && r.effect === 'allow')).toBe(true);
    const shellAllows = rules.filter((r: { action: string; effect: string }) => r.action === 'shell' && r.effect === 'allow')
      .map((r: { resource: string }) => r.resource);
    for (const forbidden of ['git commit', 'git push', 'curl', 'npm install', 'node -e', 'powershell']) {
      expect(shellAllows.some((g: string) => forbidden.startsWith(g.replace(/\*$/, '')))).toBe(false);
    }
  });

  it('denies chaining, redirection and code-running flags after every allow, and protects the oracle', () => {
    const rules = buildAgentConfig(POLICY).agents['awwv-implementer'].permissions as { action: string; resource: string; effect: string }[];
    const lastAllow = rules.map((r) => r.effect).lastIndexOf('allow');
    const denyAfter = (action: string, resource: string) =>
      rules.findIndex((r, i) => i > lastAllow && r.action === action && r.resource === resource && r.effect === 'deny') > 0;
    for (const p of ['*;*', '*&*', '*|*', '*>*', '*$(*', '*--pre*', '*--output*', '*--ext-diff*', '* -c *']) expect(denyAfter('shell', p)).toBe(true);
    for (const p of ['tools/local_executor/**', 'tools/opencode_implementer/**', '.gitattributes', 'vitest.config.*', 'tsconfig*.json']) expect(denyAfter('edit', p)).toBe(true);
    expect(rules.some((r) => r.effect === 'allow' && /^rg\b/.test(r.resource))).toBe(false);
  });

  it('rejects unsafe per-job shell allows and accepts a concrete script', () => {
    for (const bad of ['*', 'node *', 'node -e *', 'node x.mjs; curl a', 'powershell *', 'git push *', 'npx foo *', 'node a*.mjs', 'python x.py']) {
      expect(allowCmdProblem(bad), bad).not.toBeNull();
    }
    expect(allowCmdProblem('node activation/x/observer.mjs *')).toBeNull();
    expect(() => buildAgentConfig(POLICY, ['node -e *'])).toThrow(/rejected/);
  });

  it('passes no secrets through the child environment', () => {
    const env = minimalEnv(POLICY, { PATH: 'p', USERPROFILE: 'u', GITHUB_TOKEN: 'x', ANTHROPIC_API_KEY: 'y', SLACK_WEBHOOK_URL: 'z' }, 'cfg.json');
    expect(env).toEqual({ PATH: 'p', USERPROFILE: 'u', OPENCODE_CONFIG: 'cfg.json' });
  });
});

const RUN = path.resolve('tools/opencode_implementer/run.mjs');

function tempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-impl-'));
  const g = (...a: string[]) => {
    const r = spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
  };
  g('init', '-q');
  g('config', 'user.email', 't@example.invalid');
  g('config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(dir, 'README.md'), 'x\n');
  g('add', '.');
  g('commit', '-q', '-m', 'init');
  return dir;
}

describe('opencode implementer launcher: boundary helpers', () => {
  it('glob matching distinguishes one segment from many', () => {
    expect(globToRegExp('src/*.ts').test('src/a.ts')).toBe(true);
    expect(globToRegExp('src/*.ts').test('src/x/a.ts')).toBe(false);
    expect(globToRegExp('src/**/*.ts').test('src/a.ts')).toBe(true);
    expect(globToRegExp('src/**/*.ts').test('src/x/y/a.ts')).toBe(true);
    expect(globToRegExp('tests/foo.test.ts').test('tests/fooXtest.ts')).toBe(false);
    expect(matchesAny('docs/x.md', ['src/**', 'tests/a.test.ts'])).toBe(false);
  });

  it('parses porcelain -z including rename sources', () => {
    const out = ' M src/a.ts\0?? new.txt\0R  b.ts\0old.ts\0';
    expect(parsePorcelainZ(out)).toEqual(['b.ts', 'new.txt', 'old.ts', 'src/a.ts']);
  });

  it('a path restored to HEAD, a pre-dirty path edited again, and a new file are all changes', () => {
    const pre = { 'src/a.ts': 'h1', 'keep.ts': 'k' };
    const post = { 'keep.ts': 'k', 'src/a.ts': 'h2', 'new.ts': 'n' };
    expect(diffSnapshots(pre, post)).toEqual(['new.ts', 'src/a.ts']);
    expect(diffSnapshots({ 'r.ts': 'x' }, {})).toEqual(['r.ts']);
    expect(diffSnapshots({ 'same.ts': 'x' }, { 'same.ts': 'x' })).toEqual([]);
  });

  it('detects a real write outside the allowlist in a git worktree', () => {
    const dir = tempRepo();
    fs.writeFileSync(path.join(dir, 'README.md'), 'pre-existing planner edit\n');
    const pre = snapshot(dir);
    fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 2;\n');
    fs.writeFileSync(path.join(dir, 'stray.txt'), 'oops\n');
    const post = snapshot(dir);
    const changed = diffSnapshots(pre.files, post.files);
    expect(changed).toEqual(['src/a.ts', 'stray.txt']);
    expect(changed.filter((p: string) => !matchesAny(p, ['src/**']))).toEqual(['stray.txt']);
    expect(post.head).toBe(pre.head);
  });

  it('extracts session, final report, tool counts, refusals and counters from the json stream', () => {
    const lines = [
      { type: 'step_start', sessionID: 'ses_1', part: { type: 'step-start' } },
      { type: 'tool_use', sessionID: 'ses_1', part: { type: 'tool', tool: 'shell', state: { status: 'error', input: { command: 'git push' }, error: 'Permission denied by rule' } } },
      { type: 'tool_use', sessionID: 'ses_1', part: { type: 'tool', tool: 'edit', state: { status: 'completed', input: {} } } },
      { type: 'step_finish', sessionID: 'ses_1', part: { type: 'step-finish', cost: 0.0125, tokens: { input: 10, output: 5, reasoning: 2, cache: { read: 7, write: 0 } } } },
      { type: 'text', sessionID: 'ses_1', part: { type: 'text', text: '## STATUS: DONE' } },
    ].map((l) => JSON.stringify(l)).join('\n');
    const s = parseStream(lines);
    expect(s.sessionId).toBe('ses_1');
    expect(s.tools).toEqual({ shell: 1, edit: 1 });
    expect(s.refusals).toHaveLength(1);
    expect(s.cost).toBeCloseTo(0.0125);
    expect(s.tokens).toEqual({ input: 10, output: 5, reasoning: 2, cache_read: 7, cache_write: 0 });
    expect(s.texts.at(-1)).toBe('## STATUS: DONE');
  });
});

describe('opencode implementer launcher: refuses rather than proceeds', () => {
  const run = (args: string[]) => spawnSync(process.execPath, [RUN, ...args], { encoding: 'utf8' });

  it('exits 2 without a declared write allowlist', () => {
    const dir = tempRepo();
    const brief = path.join(dir, '..', `${path.basename(dir)}-brief.md`);
    fs.writeFileSync(brief, 'do nothing');
    const r = run(['--job', 'test-job', '--brief', brief, '--dir', dir]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--allow is required');
  });

  it('exits 2 in the planner checkout unless explicitly allowed', () => {
    const brief = path.join(os.tmpdir(), 'oc-impl-brief.md');
    fs.writeFileSync(brief, 'do nothing');
    const r = run(['--job', 'test-job', '--brief', brief, '--dir', path.resolve('.'), '--allow', 'src/**']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('planner checkout');
  });

  it('dry-run reports the exact launch without invoking the implementer', () => {
    const dir = tempRepo();
    const brief = path.join(dir, '..', `${path.basename(dir)}-brief.md`);
    fs.writeFileSync(brief, 'do nothing');
    const r = run(['--job', 'test-job', '--brief', brief, '--dir', dir, '--allow', 'src/**', '--dry-run']);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.dry_run).toBe(true);
    expect(j.model).toBe('opencode-go/deepseek-v4.1-flash');
    expect(j.allow).toEqual(['src/**']);
  });
});
