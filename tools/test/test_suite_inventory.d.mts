export interface TestInventoryRow {
  file: string;
  durationMs: number;
  serial: boolean;
  reasons: string[];
}

export interface TestShard {
  index: number;
  totalDurationMs: number;
  files: string[];
}

export const DEFAULT_UNMEASURED_DURATION_MS: 1000;

export function classifyTestSource(file: string, source: string): Pick<TestInventoryRow, 'serial' | 'reasons'>;
export function buildTestInventory(rootDir: string, durationsByFile?: Record<string, number>): TestInventoryRow[];
export function balanceTestFiles(rows: TestInventoryRow[], shardCount: number): TestShard[];
export function serializeInventory(rows: TestInventoryRow[]): string;
