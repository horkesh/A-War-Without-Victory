import {
  closeSync,
  mkdirSync,
  openSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isAbsolute, join, resolve } from 'node:path';

function assertSimpleIdentity(label, value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} must contain only letters, digits, underscores, and hyphens`);
  }
  return value;
}

function resolveOutputRoot(root, configuredRoot) {
  if (typeof configuredRoot !== 'string' || configuredRoot.trim() === '') {
    throw new Error('Vitest receipt output root must be a non-empty path');
  }
  return isAbsolute(configuredRoot) ? resolve(configuredRoot) : resolve(root, configuredRoot);
}

export function createReceiptRun(root, configuredRoot, manifest = {}) {
  const outputRoot = resolveOutputRoot(root, configuredRoot);
  mkdirSync(outputRoot, { recursive: true });
  if (!statSync(outputRoot).isDirectory()) {
    throw new Error(`Vitest receipt output root is not a directory: ${outputRoot}`);
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const runId = `run-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${process.pid}-${randomUUID()}`;
    const runDir = join(outputRoot, runId);
    try {
      mkdirSync(runDir);
    } catch (error) {
      if (error?.code === 'EEXIST') continue;
      throw error;
    }
    const manifestPath = join(runDir, 'manifest.json');
    writeFileSync(manifestPath, `${JSON.stringify({
      schema: 'awwv.vitest-file-receipt-run.v1',
      run_id: runId,
      created_at_utc: new Date().toISOString(),
      ...manifest,
    }, null, 2)}\n`, { flag: 'wx' });
    return { runId, runDir, manifestPath };
  }
  throw new Error('Could not allocate a unique Vitest receipt run directory');
}

export function receiptEnvironmentForLane(run, { workerId, lane }, baseEnv = process.env) {
  const safeWorker = assertSimpleIdentity('worker id', workerId);
  const safeLane = assertSimpleIdentity('lane', lane);
  const receiptFile = join(run.runDir, `${safeWorker}-${safeLane}.jsonl`);
  let fd;
  try {
    fd = openSync(receiptFile, 'wx');
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(`Vitest receipt lane already exists: ${receiptFile}`);
    }
    throw error;
  }
  closeSync(fd);
  return {
    ...baseEnv,
    AWWV_VITEST_RECEIPT_RUN_ID: run.runId,
    AWWV_VITEST_RECEIPT_FILE: receiptFile,
    AWWV_VITEST_RECEIPT_WORKER: safeWorker,
    AWWV_VITEST_RECEIPT_LANE: safeLane,
  };
}
