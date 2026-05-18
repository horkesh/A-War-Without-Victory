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

    it('Batch 38: in-loop week-39 final-save serialize/hash block removed', () => {
        const raw = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        // The in-loop block previously held `if (week_index === weeks - 1) {
        // serializeState(state); createHash(...) }` — Batch 38 removed it as
        // structurally redundant with the post-reconciliation step. There
        // must be no `week_index === weeks - 1` check that calls serializeState
        // or createHash in the scenario_runner.
        const inLoopFinalSaveBlock = /if\s*\(\s*week_index\s*===\s*weeks\s*-\s*1\s*\)\s*\{\s*const\s+serialized\s*=/;
        expect(raw).not.toMatch(inLoopFinalSaveBlock);
    });

    it('Batch 38: post-loop `if (!final_state_hash)` fallback removed', () => {
        const raw = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        // The fallback block previously was `if (!final_state_hash) { ... }`
        // followed by a `final_state_hash = _serTimeSync(...)` reassignment.
        // Batch 38 removed it; the unconditional post-reconciliation block at
        // line ~2503 is the sole producer of `final_state_hash`.
        const fallbackBlock = /if\s*\(\s*!\s*final_state_hash\s*\)\s*\{\s*final_state_hash\s*=/;
        expect(raw).not.toMatch(fallbackBlock);
    });

    it('Batch 38: final-save-serialize and final-save-hash each have exactly one call site (the post-reconciliation block)', () => {
        const raw = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        const finalSaveSerializeCount = (raw.match(/'final-save-serialize'/g) ?? []).length;
        const finalSaveHashCount = (raw.match(/'final-save-hash'/g) ?? []).length;
        // Before Batch 38: 2 of each (in-loop week-39 + post-loop) and the
        // hash had a third in the fallback. After Batch 38: exactly 1 each.
        expect(finalSaveSerializeCount).toBe(1);
        expect(finalSaveHashCount).toBe(1);
    });

    it('Batch 38: replay.jsonl line type no longer carries a `state_hash` field', () => {
        const raw = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        // The replay actions JSONL line previously had `state_hash?: string`
        // attached to weeks where the in-loop serialize ran. The field had
        // zero consumers in src/tests/tools (verified by grep). Batch 38
        // dropped it along with the redundant producer.
        const replayLineTypeWithStateHash = /replayLine\s*:\s*\{[^}]*state_hash\?:/;
        expect(raw).not.toMatch(replayLineTypeWithStateHash);
    });
});
