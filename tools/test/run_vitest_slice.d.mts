import type { spawnSync } from 'node:child_process';

export function buildVitestSliceArgs(root: string, files: string[], passthrough: string[]): string[];
export function writeVitestSliceConfig(root: string, files: string[], configPath?: string): string;
export function runVitestSlice(argv: string[], root?: string, runChild?: typeof spawnSync): number;
