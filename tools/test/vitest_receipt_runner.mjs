import {
  appendFileSync,
  closeSync,
  fstatSync,
  fsyncSync,
  openSync,
  readSync,
} from 'node:fs';
import { relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { VitestTestRunner } from 'vitest/runners';

const IntrinsicDate = Date;
const realWallClockNow = Date.now.bind(Date);
const monotonicNow = performance.now.bind(performance);
const RECEIPT_TAIL_BYTES = 64 * 1024;

function toPosix(value) {
  return value.replaceAll('\\', '/');
}

function finalFileState(file) {
  const visit = (tasks) => tasks.flatMap((task) => task.type === 'suite' ? visit(task.tasks) : [task]);
  const tests = visit(file.tasks ?? []);
  if (file.result?.state === 'fail') return 'fail';
  if (tests.length > 0 && tests.every((test) => test.mode === 'skip' || test.result?.state === 'skip')) {
    return 'skip';
  }
  return file.result?.state ?? 'unknown';
}

function elapsedSince(started) {
  const duration = monotonicNow() - started;
  return Number.isFinite(duration) ? Math.max(0, duration) : 0;
}

function recoverLaneSequence(file, identity) {
  const fd = openSync(file, 'r');
  try {
    const size = fstatSync(fd).size;
    if (size === 0) return 0;
    const length = Math.min(size, RECEIPT_TAIL_BYTES);
    const buffer = Buffer.allocUnsafe(length);
    const bytesRead = readSync(fd, buffer, 0, length, size - length);
    const lines = buffer.subarray(0, bytesRead).toString('utf8').trimEnd().split('\n');
    const event = JSON.parse(lines.at(-1));
    if (
      event.run_id !== identity.runId
      || event.worker_id !== identity.workerId
      || event.lane !== identity.lane
      || !Number.isInteger(event.sequence)
      || event.sequence < 1
    ) {
      throw new Error(`receipt lane tail does not match its owner: ${file}`);
    }
    return event.sequence;
  } finally {
    closeSync(fd);
  }
}

export default class AwwvReceiptRunner extends VitestTestRunner {
  constructor(config) {
    super(config);
    if (process.env.AWWV_VITEST_RECEIPT_FILE) {
      const identity = {
        runId: process.env.AWWV_VITEST_RECEIPT_RUN_ID,
        workerId: process.env.AWWV_VITEST_RECEIPT_WORKER,
        lane: process.env.AWWV_VITEST_RECEIPT_LANE,
      };
      this.receipt = {
        file: process.env.AWWV_VITEST_RECEIPT_FILE,
        ...identity,
        root: config.root,
        sequence: recoverLaneSequence(process.env.AWWV_VITEST_RECEIPT_FILE, identity),
        collectionStarts: new Map(),
        executionStarts: new Map(),
        collectionFailed: new Set(),
      };
    } else {
      this.receipt = null;
    }
  }

  persist(filepath, phase, state, durationMs) {
    if (!this.receipt) return;
    const event = {
      schema: 'awwv.vitest-file-receipt.v1',
      run_id: this.receipt.runId,
      worker_id: this.receipt.workerId,
      lane: this.receipt.lane,
      file: toPosix(relative(this.receipt.root, filepath)),
      sequence: ++this.receipt.sequence,
      phase,
      recorded_at_utc: new IntrinsicDate(realWallClockNow()).toISOString(),
      duration_ms: durationMs,
      state,
    };
    const fd = openSync(this.receipt.file, 'a');
    try {
      appendFileSync(fd, `${JSON.stringify(event)}\n`, 'utf8');
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }

  importFile(filepath, source) {
    if (source !== 'collect' || !this.receipt) return super.importFile(filepath, source);
    const started = monotonicNow();
    this.receipt.collectionStarts.set(filepath, started);
    this.persist(filepath, 'collection_start', 'running', null);
    try {
      return Promise.resolve(super.importFile(filepath, source)).then((value) => {
        this.persist(filepath, 'collection_finish', 'collected', elapsedSince(started));
        return value;
      }, (error) => {
        this.receipt.collectionFailed.add(filepath);
        this.persist(filepath, 'collection_finish', 'collection_error', elapsedSince(started));
        throw error;
      });
    } catch (error) {
      this.receipt.collectionFailed.add(filepath);
      this.persist(filepath, 'collection_finish', 'collection_error', elapsedSince(started));
      throw error;
    }
  }

  async onBeforeRunSuite(suite) {
    if (this.receipt && 'filepath' in suite && !this.receipt.collectionFailed.has(suite.filepath)) {
      this.receipt.executionStarts.set(suite.filepath, monotonicNow());
      this.persist(suite.filepath, 'execution_start', 'running', null);
    }
    const result = await super.onBeforeRunSuite(suite);
    if (this.receipt && 'filepath' in suite && suite.mode === 'skip') {
      const started = this.receipt.executionStarts.get(suite.filepath);
      this.persist(
        suite.filepath,
        'execution_finish',
        'skip',
        started === undefined ? null : elapsedSince(started),
      );
    }
    return result;
  }

  async onAfterRunSuite(suite) {
    const result = await super.onAfterRunSuite(suite);
    if (this.receipt && 'filepath' in suite && !this.receipt.collectionFailed.has(suite.filepath)) {
      const started = this.receipt.executionStarts.get(suite.filepath);
      this.persist(
        suite.filepath,
        'execution_finish',
        finalFileState(suite),
        started === undefined ? null : elapsedSince(started),
      );
    }
    return result;
  }
}
