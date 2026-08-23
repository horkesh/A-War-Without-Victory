import type { TestInventoryRow, TestShard } from './test_suite_inventory.mjs';

export interface BalancedTestPlan {
  parallelShards: TestShard[];
  serialFiles: string[];
  partitionedFiles: string[];
}

export interface BalancedWorkerPlan {
  shardIndex: number;
  shardCount: number;
  files: string[];
}

export function deterministicShardValues(total: number, shardIndex: number, shardCount: number): number[];
export function partitionInventory(inventory: TestInventoryRow[], shardCount: number): BalancedTestPlan;
export function aggregateChildStatuses(statuses: number[]): 0 | 1;
export function buildWorkerPlans(plan: BalancedTestPlan, shardCount: number): BalancedWorkerPlan[];
export function filterInventoryByPattern(inventory: TestInventoryRow[], pattern: string): TestInventoryRow[];
export function renderBalancedVitestConfig(files: string[]): string;
export function runVitestChild(
  vitestCli: string,
  configPath: string,
  passthrough: string[],
  root: string,
  env?: NodeJS.ProcessEnv,
): Promise<number>;
export interface BalancedVitestDependencies {
  inventory?: TestInventoryRow[];
  runVitestChild?: typeof runVitestChild;
}

export function runBalancedVitest(
  argv: string[],
  root?: string,
  dependencies?: BalancedVitestDependencies,
): Promise<number>;
