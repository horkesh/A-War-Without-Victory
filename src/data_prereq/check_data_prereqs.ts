/**
 * Phase H1.2: Deterministic, check-only data prerequisites for headless runs.
 * No generation; no timestamps; no environment-dependent absolute paths in output.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_PREREQS } from './data_prereq_registry.js';
import type { DataPrereq } from './data_prereq_types.js';

/** Format missing-prereq remediation for stderr (shared by CLI and harness). No timestamps. */
export function formatMissingRemediation(result: CheckDataPrereqsResult): string {
    const lines: string[] = ['MISSING DATA PREREQUISITES:'];
    for (const { prereq_id, missing_paths } of result.missing) {
        const prereq = DATA_PREREQS.find((p) => p.id === prereq_id);
        if (!prereq) continue;
        lines.push('', prereq.description, `  Missing: ${missing_paths.join(', ')}`, '  To fix:');
        for (const cmd of prereq.remediation.commands) {
            lines.push(`    ${cmd}`);
        }
        if (prereq.remediation.notes?.length) {
            for (const note of prereq.remediation.notes) {
                lines.push(`  ${note}`);
            }
        }
    }
    lines.push('');
    return lines.join('\n');
}

export interface CheckDataPrereqsOptions {
    /** Base directory for path resolution (default: repo root / cwd). Used by tests. */
    baseDir?: string;
    strict?: boolean;
}

export interface CheckDataPrereqsResult {
    ok: boolean;
    missing: Array<{ prereq_id: string; missing_paths: string[] }>;
}

/**
 * Check that all required data prerequisite files exist.
 * Deterministic: prereqs in registry order; missing paths sorted lexicographically.
 */
export function checkDataPrereqs(opts?: CheckDataPrereqsOptions): CheckDataPrereqsResult {
    const baseDir = opts?.baseDir ?? process.cwd();
    const missing: Array<{ prereq_id: string; missing_paths: string[] }> = [];

    for (const prereq of DATA_PREREQS) {
        const absent: string[] = [];
        for (const rel of prereq.required_paths) {
            const abs = join(baseDir, rel);
            if (!existsSync(abs)) {
                absent.push(rel);
            }
        }
        if (absent.length > 0) {
            absent.sort((a, b) => a.localeCompare(b));
            missing.push({ prereq_id: prereq.id, missing_paths: absent });
        }
    }

    return {
        ok: missing.length === 0,
        missing
    };
}

/**
 * Get full prereq records for missing ids (for remediation output).
 */
export function getPrereqsById(ids: string[]): DataPrereq[] {
    const set = new Set(ids);
    return DATA_PREREQS.filter((p) => set.has(p.id));
}
