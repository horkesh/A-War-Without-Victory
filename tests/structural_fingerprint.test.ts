import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fp = require('../tools/diagnostics/structural_fingerprint.cjs') as {
    buildStructuralFields: (runDir: string) => Record<string, unknown>;
    buildFingerprint: (runDir: string) => { fingerprint: string; fields: Record<string, unknown> };
    fingerprintOf: (fields: unknown) => string;
    stableStringify: (v: unknown) => string;
    SCHEMA_VERSION: number;
};

function makeRunDir(opts: {
    controlAfter: Array<{ controller: string; count: number }>;
    flips?: Array<{ settlement_id: string; from: string | null; to: string | null }>;
    anchors: Array<{ anchor_id: string; passed: boolean }>;
    benchmark: { evaluated: number; passed: number; failed: number; not_reached: number };
    formationsActive?: number;
    weeks?: number;
}): string {
    const dir = mkdtempSync(join(tmpdir(), 'fp-'));
    writeFileSync(
        join(dir, 'control_delta.json'),
        JSON.stringify({ net_control_counts_after: opts.controlAfter, flips: opts.flips ?? [] }),
        'utf8',
    );
    writeFileSync(
        join(dir, 'run_summary.json'),
        JSON.stringify({
            scenario_id: 'fixture',
            weeks: opts.weeks ?? 40,
            summary: { final_turn: opts.weeks ?? 40 },
            anchor_checks: opts.anchors.map((a) => ({
                anchor_id: a.anchor_id,
                anchor_type: 'osid',
                expected_controller: 'RS',
                actual_controller: 'RS',
                passed: a.passed,
            })),
            bot_benchmark_evaluation: opts.benchmark,
            // formations are DELIBERATELY excluded from the fingerprint; include a
            // varying value to prove it does NOT affect the result.
            historical_alignment: {
                final: [
                    { faction: 'RS', brigades_total: 80, brigades_active: opts.formationsActive ?? 80 },
                ],
            },
        }),
        'utf8',
    );
    return dir;
}

const BASE = {
    controlAfter: [
        { controller: 'RS', count: 373 },
        { controller: 'RBiH', count: 250 },
        { controller: 'HRHB', count: 89 },
    ],
    flips: [
        { settlement_id: 'op:alpha:one', from: 'RBiH', to: 'RS' },
        { settlement_id: 'op:bravo:two', from: 'RS', to: 'RBiH' },
    ],
    anchors: [
        { anchor_id: 'op:b:b', passed: true },
        { anchor_id: 'op:a:a', passed: true },
    ],
    benchmark: { evaluated: 6, passed: 6, failed: 0, not_reached: 0 },
};

describe('structural_fingerprint', () => {
    it('is deterministic for identical structural inputs', () => {
        const a = makeRunDir(BASE);
        const b = makeRunDir(BASE);
        try {
            expect(fp.buildFingerprint(a).fingerprint).toBe(fp.buildFingerprint(b).fingerprint);
        } finally {
            rmSync(a, { recursive: true, force: true });
            rmSync(b, { recursive: true, force: true });
        }
    });

    it('is order-independent for control rows and anchor rows', () => {
        const a = makeRunDir(BASE);
        const b = makeRunDir({
            ...BASE,
            controlAfter: [...BASE.controlAfter].reverse(),
            flips: [...BASE.flips].reverse(),
            anchors: [...BASE.anchors].reverse(),
        });
        try {
            expect(fp.buildFingerprint(a).fingerprint).toBe(fp.buildFingerprint(b).fingerprint);
        } finally {
            rmSync(a, { recursive: true, force: true });
            rmSync(b, { recursive: true, force: true });
        }
    });

    it('IGNORES formation/brigade counts (run-snapshot artifact, not territory truth)', () => {
        const a = makeRunDir({ ...BASE, formationsActive: 80 });
        const b = makeRunDir({ ...BASE, formationsActive: 66 });
        try {
            // Two runs that differ ONLY in brigades_active must fingerprint identically —
            // this is the regression we found empirically (same territory hash, different
            // brigade tallies). Including formations would make the gate flap.
            expect(fp.buildFingerprint(a).fingerprint).toBe(fp.buildFingerprint(b).fingerprint);
            expect((fp.buildStructuralFields(a) as Record<string, unknown>).formations).toBeUndefined();
        } finally {
            rmSync(a, { recursive: true, force: true });
            rmSync(b, { recursive: true, force: true });
        }
    });

    it('CHANGES when the control map changes', () => {
        const a = makeRunDir(BASE);
        const b = makeRunDir({
            ...BASE,
            controlAfter: [
                { controller: 'RS', count: 374 },
                { controller: 'RBiH', count: 249 },
                { controller: 'HRHB', count: 89 },
            ],
        });
        try {
            expect(fp.buildFingerprint(a).fingerprint).not.toBe(fp.buildFingerprint(b).fingerprint);
        } finally {
            rmSync(a, { recursive: true, force: true });
            rmSync(b, { recursive: true, force: true });
        }
    });

    it('CHANGES when OSID control flips change even if per-faction counts stay equal', () => {
        const a = makeRunDir(BASE);
        const b = makeRunDir({
            ...BASE,
            flips: [
                { settlement_id: 'op:charlie:three', from: 'RBiH', to: 'RS' },
                { settlement_id: 'op:delta:four', from: 'RS', to: 'RBiH' },
            ],
        });
        try {
            expect(fp.buildStructuralFields(a).control_counts).toEqual(fp.buildStructuralFields(b).control_counts);
            expect(fp.buildFingerprint(a).fingerprint).not.toBe(fp.buildFingerprint(b).fingerprint);
        } finally {
            rmSync(a, { recursive: true, force: true });
            rmSync(b, { recursive: true, force: true });
        }
    });

    it('CHANGES when an anchor flips pass->fail', () => {
        const a = makeRunDir(BASE);
        const b = makeRunDir({
            ...BASE,
            anchors: [
                { anchor_id: 'op:b:b', passed: false },
                { anchor_id: 'op:a:a', passed: true },
            ],
        });
        try {
            expect(fp.buildFingerprint(a).fingerprint).not.toBe(fp.buildFingerprint(b).fingerprint);
        } finally {
            rmSync(a, { recursive: true, force: true });
            rmSync(b, { recursive: true, force: true });
        }
    });

    it('CHANGES when benchmark tallies change', () => {
        const a = makeRunDir(BASE);
        const b = makeRunDir({
            ...BASE,
            benchmark: { evaluated: 6, passed: 5, failed: 1, not_reached: 0 },
        });
        try {
            expect(fp.buildFingerprint(a).fingerprint).not.toBe(fp.buildFingerprint(b).fingerprint);
        } finally {
            rmSync(a, { recursive: true, force: true });
            rmSync(b, { recursive: true, force: true });
        }
    });

    it('throws when a required artifact is missing (missing artifact IS a regression)', () => {
        const dir = mkdtempSync(join(tmpdir(), 'fp-empty-'));
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/Missing run_summary\.json/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
