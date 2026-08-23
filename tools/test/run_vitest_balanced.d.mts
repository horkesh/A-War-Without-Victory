import type { TestInventoryRow, TestShard } from './test_suite_inventory.mjs';

export interface BalancedTestPlan {
  parallelShards: TestShard[];
  serialFiles: string[];
  partitionedFiles: string[];
}

export function deterministicShardValues(total: number, shardIndex: number, shardCount: number): number[];
export function partitionInventory(inventory: TestInventoryRow[], shardCount: number): BalancedTestPlan;
export function aggregateChildStatuses(statuses: number[]): 0 | 1;
export function filterInventoryByPattern(inventory: TestInventoryRow[], pattern: string): TestInventoryRow[];
export function renderBalancedVitestConfig(files: string[]): string;
export function runBalancedVitest(argv: string[], root?: string): Promise<number>;
