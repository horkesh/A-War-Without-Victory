import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createReceiptRun,
  receiptEnvironmentForLane,
} from '../tools/test/vitest_file_receipts.mjs';
import {
  renderBalancedVitestConfig,
  runVitestChild,
} from '../tools/test/run_vitest_balanced.mjs';

type ReceiptEvent = {
  schema: string;
  run_id: string;
  worker_id: string;
  lane: string;
  file: string;
  sequence: number;
  phase: string;
  recorded_at_utc: string;
  duration_ms: number | null;
  state: string;
};

const root = process.cwd();
const vitestCli = join(root, 'node_modules', 'vitest', 'vitest.mjs');
const retainedRunsRoot = join(
  root,
  'tmp/player-bot-capability-parity-20261024/suite-scratch-repair/runs',
);
mkdirSync(retainedRunsRoot, { recursive: true });
const fixtureOutputRoot = join(
  retainedRunsRoot,
  `vitest-balanced-receipts-${process.pid}-${randomUUID()}`,
);
mkdirSync(fixtureOutputRoot);
const receiptRoot = join(fixtureOutputRoot, 'receipts');

function renderRetainedVitestConfig(files: string[]): string {
  return renderBalancedVitestConfig(files).replace(
    '../../tools/test/discover_test_files.mjs',
    pathToFileURL(join(root, 'tools/test/discover_test_files.mjs')).href,
  );
}

function readEvents(path: string): ReceiptEvent[] {
  return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

async function runFixtures(names: string[], passthrough: string[] = [], runner?: string) {
  const run = createReceiptRun(root, receiptRoot, { shard_count: 1 });
  const configRoot = join(fixtureOutputRoot, 'configs', run.runId);
  mkdirSync(configRoot, { recursive: true });
  const config = join(configRoot, 'receipt.config.mjs');
  const generated = renderRetainedVitestConfig(names.map(
    (name) => `tests/fixtures/vitest_balanced/${name}.fixture.ts`,
  ));
  writeFileSync(config, runner
    ? generated.replace('tools/test/vitest_receipt_runner.mjs', runner)
    : generated, 'utf8');
  const env = receiptEnvironmentForLane(run, {
    workerId: 'worker-0',
    lane: 'parallel-0',
  });
  env.AWWV_VITEST_FIXTURE_OUTPUT_ROOT = fixtureOutputRoot;
  const status = await runVitestChild(vitestCli, config, passthrough, root, env);
  return { status, events: readEvents(env.AWWV_VITEST_RECEIPT_FILE), run, env };
}

async function runFixture(name: string, passthrough: string[] = [], runner?: string) {
  return runFixtures([name], passthrough, runner);
}

describe('balanced Vitest per-file receipts', () => {
  it('persists truthful pass, fail, skip, and collection-error file states with identities', async () => {
    const cases = [
      ['receipt_pass', 0, 'pass'],
      ['receipt_fail', 1, 'fail'],
      ['receipt_skip', 0, 'skip'],
      ['receipt_import_error', 1, 'collection_error'],
    ] as const;
    for (const [fixture, expectedExit, expectedState] of cases) {
      const result = await runFixture(fixture, ['--reporter=dot', '--silent']);
      expect(result.status, fixture).toBe(expectedExit);
      expect(result.events[0], fixture).toMatchObject({
        schema: 'awwv.vitest-file-receipt.v1',
        run_id: result.run.runId,
        worker_id: 'worker-0',
        lane: 'parallel-0',
        file: `tests/fixtures/vitest_balanced/${fixture}.fixture.ts`,
        sequence: 1,
        phase: 'collection_start',
        duration_ms: null,
        state: 'running',
      });
      expect(result.events.at(-1), fixture).toMatchObject({
        phase: expectedState === 'collection_error' ? 'collection_finish' : 'execution_finish',
        state: expectedState,
      });
      expect(result.events.at(-1)?.duration_ms, fixture).toBeTypeOf('number');
      expect(result.events.at(-1)!.duration_ms!, fixture).toBeGreaterThanOrEqual(0);
      expect(result.events.map((event) => event.sequence), fixture)
        .toEqual(result.events.map((_, index) => index + 1));
    }
  }, 30_000);

  it('persists a collection start before synchronous work and does not fabricate a finish when killed', async () => {
    const run = createReceiptRun(root, receiptRoot, { shard_count: 1 });
    const configRoot = join(fixtureOutputRoot, 'configs', run.runId);
    mkdirSync(configRoot, { recursive: true });
    const config = join(configRoot, 'receipt-block.config.mjs');
    writeFileSync(config, renderRetainedVitestConfig([
      'tests/fixtures/vitest_balanced/receipt_block.fixture.ts',
    ]), 'utf8');
    const env = receiptEnvironmentForLane(run, { workerId: 'worker-0', lane: 'parallel-0' });
    env.AWWV_VITEST_FIXTURE_OUTPUT_ROOT = fixtureOutputRoot;
    const child = spawn(process.execPath, [
      vitestCli, 'run', '--config', config, '--reporter=dot', '--silent',
    ], { cwd: root, env, stdio: 'ignore', shell: false });
    const deadline = Date.now() + 10_000;
    while (readFileSync(env.AWWV_VITEST_RECEIPT_FILE, 'utf8').length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(readFileSync(env.AWWV_VITEST_RECEIPT_FILE, 'utf8').length).toBeGreaterThan(0);
    child.kill('SIGTERM');
    const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveExit) => {
      child.once('exit', (code, signal) => resolveExit({ code, signal }));
    });
    expect(exit.code === null || exit.code !== 0).toBe(true);
    const events = readEvents(env.AWWV_VITEST_RECEIPT_FILE);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      phase: 'collection_start',
      state: 'running',
      duration_ms: null,
    });
  }, 30_000);

  it('does not let a nested default helper inherit and contaminate its outer receipt lane', async () => {
    const result = await runFixture('receipt_nested_child', ['--reporter=dot', '--silent']);
    expect(result.status).toBe(0);
    expect(new Set(result.events.map((event) => event.file))).toEqual(new Set([
      'tests/fixtures/vitest_balanced/receipt_nested_child.fixture.ts',
    ]));
    expect(result.events.map((event) => event.sequence))
      .toEqual(result.events.map((_, index) => index + 1));
  }, 30_000);

  it('continues lane sequence numbers strictly across two real file-runner instances', async () => {
    const result = await runFixtures(['receipt_pass', 'receipt_pass_second'], ['--reporter=dot', '--silent']);
    expect(result.status).toBe(0);
    expect(new Set(result.events.map((event) => event.file))).toEqual(new Set([
      'tests/fixtures/vitest_balanced/receipt_pass.fixture.ts',
      'tests/fixtures/vitest_balanced/receipt_pass_second.fixture.ts',
    ]));
    expect(result.events.map((event) => event.sequence))
      .toEqual(result.events.map((_, index) => index + 1));
    expect(new Set(result.events.map((event) => event.run_id))).toEqual(new Set([result.run.runId]));
    expect(new Set(result.events.map((event) => event.worker_id))).toEqual(new Set(['worker-0']));
    expect(new Set(result.events.map((event) => event.lane))).toEqual(new Set(['parallel-0']));
  }, 30_000);

  it('does not claim execution finish when native file finalization rejects', async () => {
    const result = await runFixture(
      'receipt_pass',
      ['--reporter=dot', '--silent'],
      'tests/fixtures/vitest_balanced/receipt_finalize_error_runner.fixture.mjs',
    );
    expect(result.status).toBe(1);
    expect(result.events.some((event) => event.phase === 'execution_start')).toBe(true);
    expect(result.events.some((event) => event.phase === 'execution_finish')).toBe(false);
  }, 30_000);

  it('uses captured real clocks when a test leaves fake time active', async () => {
    const result = await runFixture('receipt_fake_clock', ['--reporter=dot', '--silent']);
    expect(result.status).toBe(0);
    for (const event of result.events) {
      expect(Date.parse(event.recorded_at_utc)).toBeGreaterThan(Date.UTC(2020, 0, 1));
      if (event.duration_ms !== null) {
        expect(Number.isFinite(event.duration_ms)).toBe(true);
        expect(event.duration_ms).toBeGreaterThanOrEqual(0);
      }
    }
  }, 30_000);

  it('creates every run and lane receipt with create-new ownership outside generated configs', () => {
    const first = createReceiptRun(root, receiptRoot, { shard_count: 4 });
    const second = createReceiptRun(root, receiptRoot, { shard_count: 4 });
    expect(first.runDir).not.toBe(second.runDir);
    expect(first.runDir.startsWith(`${join(root, '.tmp_vitest_balanced')}${sep}`)).toBe(false);
    expect(existsSync(first.manifestPath)).toBe(true);
    const lane = receiptEnvironmentForLane(first, { workerId: 'serial', lane: 'serial' });
    expect(existsSync(lane.AWWV_VITEST_RECEIPT_FILE)).toBe(true);
    expect(() => receiptEnvironmentForLane(first, { workerId: 'serial', lane: 'serial' }))
      .toThrow(/already exists/);
  });
});
