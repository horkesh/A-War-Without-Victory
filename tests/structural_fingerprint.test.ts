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
    omitAnchorContractEvaluation?: boolean;
    anchorContractEvaluation?: unknown;
    legacyAnchorChecks?: unknown;
}): string {
    const dir = mkdtempSync(join(tmpdir(), 'fp-'));
    writeFileSync(
        join(dir, 'control_delta.json'),
        JSON.stringify({ net_control_counts_after: opts.controlAfter, flips: opts.flips ?? [] }),
        'utf8',
    );
    const runSummary: Record<string, unknown> = {
            scenario_id: 'fixture',
            weeks: opts.weeks ?? 40,
            summary: { final_turn: opts.weeks ?? 40 },
            bot_benchmark_evaluation: opts.benchmark,
            // formations are DELIBERATELY excluded from the fingerprint; include a
            // varying value to prove it does NOT affect the result.
            historical_alignment: {
                final: [
                    { faction: 'RS', brigades_total: 80, brigades_active: opts.formationsActive ?? 80 },
                ],
            },
        };
    const defaultAnchors = opts.anchors.map((a) => ({
        anchor_id: a.anchor_id,
        anchor_type: 'osid',
        expected_controller: 'RS',
        actual_controller: 'RS',
        passed: a.passed,
    }));
    if (!opts.omitAnchorContractEvaluation) {
        runSummary.anchor_contract_evaluation = opts.anchorContractEvaluation ?? {
            schema_version: 1,
            epoch: 'jan1993',
            source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
            anchors_passed: defaultAnchors.filter((anchor) => anchor.passed).length,
            anchors_total: defaultAnchors.length,
            anchor_checks: defaultAnchors,
        };
    }
    if (opts.legacyAnchorChecks !== undefined) {
        runSummary.anchor_checks = opts.legacyAnchorChecks;
    }
    writeFileSync(
        join(dir, 'run_summary.json'),
        JSON.stringify(runSummary),
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

    it('throws when anchor contract evaluation is missing', () => {
        const dir = makeRunDir({ ...BASE, omitAnchorContractEvaluation: true });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*missing/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('throws when anchor contract evaluation is empty', () => {
        const dir = makeRunDir({
            ...BASE,
            anchorContractEvaluation: {
                schema_version: 1,
                epoch: 'jan1993',
                source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
                anchors_passed: 0,
                anchors_total: 0,
                anchor_checks: [],
            },
        });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*empty/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('throws when an anchor contract entry is malformed', () => {
        const dir = makeRunDir({
            ...BASE,
            anchorContractEvaluation: {
                schema_version: 1,
                epoch: 'jan1993',
                source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
                anchors_passed: 0,
                anchors_total: 1,
                anchor_checks: [{ anchor_id: 'op:a:a', passed: 'yes' }],
            },
        });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*malformed/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('throws when an anchor contract entry has no ID', () => {
        const dir = makeRunDir({
            ...BASE,
            anchorContractEvaluation: {
                schema_version: 1,
                epoch: 'jan1993',
                source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
                anchors_passed: 1,
                anchors_total: 1,
                anchor_checks: [{ passed: true }],
            },
        });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*missing.*id/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('throws when anchor contract IDs are duplicated', () => {
        const dir = makeRunDir({
            ...BASE,
            anchorContractEvaluation: {
                schema_version: 1,
                epoch: 'jan1993',
                source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
                anchors_passed: 1,
                anchors_total: 2,
                anchor_checks: [
                    { anchor_id: 'op:a:a', passed: true },
                    { anchor_id: 'op:a:a', passed: false },
                ],
            },
        });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*duplicate/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('throws when anchor contract metadata is malformed', () => {
        const dir = makeRunDir({
            ...BASE,
            anchorContractEvaluation: {
                schema_version: 2,
                epoch: 'jan1993',
                source: 'wrong-source',
                anchors_passed: 2,
                anchors_total: 2,
                anchor_checks: [
                    { anchor_id: 'op:a:a', passed: true },
                    { anchor_id: 'op:b:b', passed: true },
                ],
            },
        });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*metadata.*malformed/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('throws when anchor contract totals disagree with its checks', () => {
        const dir = makeRunDir({
            ...BASE,
            anchorContractEvaluation: {
                schema_version: 1,
                epoch: 'jan1993',
                source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
                anchors_passed: 0,
                anchors_total: 99,
                anchor_checks: [
                    { anchor_id: 'op:a:a', passed: true },
                    { anchor_id: 'op:b:b', passed: true },
                ],
            },
        });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*totals.*inconsistent/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('uses explicit well-formed legacy anchor_checks only when the new field is absent', () => {
        const dir = makeRunDir({
            ...BASE,
            omitAnchorContractEvaluation: true,
            legacyAnchorChecks: [
                { anchor_id: 'op:a:a', passed: true },
                { anchor_id: 'op:b:b', passed: false },
            ],
        });
        try {
            expect(fp.buildStructuralFields(dir)).toMatchObject({
                anchors_passed: 1,
                anchors_total: 2,
            });
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('does not fall back to legacy anchor_checks when the new field is invalid', () => {
        const dir = makeRunDir({
            ...BASE,
            anchorContractEvaluation: {
                schema_version: 1,
                epoch: 'jan1993',
                source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
                anchors_passed: 0,
                anchors_total: 0,
                anchor_checks: [],
            },
            legacyAnchorChecks: [{ anchor_id: 'op:a:a', passed: true }],
        });
        try {
            expect(() => fp.buildStructuralFields(dir)).toThrow(/anchor contract.*empty/i);
        } finally {
            rmSync(dir, { recursive: true, force: true });
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
