export interface ReceiptRun {
  runId: string;
  runDir: string;
  manifestPath: string;
}

export interface ReceiptLaneIdentity {
  workerId: string;
  lane: string;
}

export function createReceiptRun(
  root: string,
  configuredRoot: string,
  manifest?: Record<string, unknown>,
): ReceiptRun;

export function receiptEnvironmentForLane(
  run: ReceiptRun,
  identity: ReceiptLaneIdentity,
  baseEnv?: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv & {
  AWWV_VITEST_RECEIPT_RUN_ID: string;
  AWWV_VITEST_RECEIPT_FILE: string;
  AWWV_VITEST_RECEIPT_WORKER: string;
  AWWV_VITEST_RECEIPT_LANE: string;
};
