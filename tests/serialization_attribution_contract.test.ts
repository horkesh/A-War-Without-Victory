import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('serialization attribution contract (Batch 33)', () => {
    it('static contract: scenario_runner has the 6 _serTimeSync/_serTimeAsync label literals', () => {
        const raw = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        const labels = [
            'brigade-temporal-write',
            'final-save-hash',
            'final-save-serialize',
            'final-save-write',
            'replay-sequence-write',
            'weekly-report-write',
        ];
        for (const label of labels) {
            expect(raw).toContain(`'${label}'`);
        }
        expect([...labels].sort()).toEqual(labels);
    });

    it('static contract: helpers exist and are gated independently of --timing-json', () => {
        const raw = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        expect(raw).toContain('function _serTimeSync<T>');
        expect(raw).toContain('async function _serTimeAsync<T>');
        expect(raw).toContain('PERF_PROFILE_SERIALIZATION');
        expect(raw).toContain('_serDetailDumpToStderr');
        expect(raw).toMatch(/enabled\s*\|\|\s*detailOn/);
    });

    it('static contract: no Date.now / new Date / performance.now in the helpers region', () => {
        const raw = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        const startIdx = raw.indexOf('const _serDetailNs');
        const endIdx = raw.indexOf('function buildScenarioTimingJson');
        expect(startIdx).toBeGreaterThanOrEqual(0);
        expect(endIdx).toBeGreaterThan(startIdx);
        const region = raw.slice(startIdx, endIdx);
        expect(region).not.toMatch(/\bDate\.now\s*\(/);
        expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(region).not.toMatch(/\bperformance\.now\s*\(/);
    });
});
