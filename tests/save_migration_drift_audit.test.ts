import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('save migration drift audit diagnostic', () => {
    it('writes a deterministic post-migration drift report with no anonymous defaults remaining', () => {
        const cwd = process.cwd();
        const outputPath = resolve(cwd, 'tools', 'diagnostics', 'output', 'save_migration_drift.json');
        const committedBytes = readFileSync(outputPath);

        execFileSync(process.execPath, ['tools/diagnostics/save_migration_drift_audit.cjs'], {
            cwd,
            stdio: 'pipe',
        });

        const regeneratedBytes = readFileSync(outputPath);
        try {
            expect(regeneratedBytes).toEqual(committedBytes);
        } finally {
            if (!regeneratedBytes.equals(committedBytes)) {
                writeFileSync(outputPath, committedBytes);
            }
        }

        const report = JSON.parse(regeneratedBytes.toString('utf8')) as {
            latest_schema_version: number;
            anonymous_default_count: number;
            fields: Array<{ field: string }>;
        };

        expect(report.latest_schema_version).toBe(22);
        expect(report.anonymous_default_count).toBe(0);
        expect(report.fields).toEqual([]);
    });
});
