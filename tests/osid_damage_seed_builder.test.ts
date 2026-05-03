/**
 * osid_damage_seed_builder.test.ts
 *
 * Validates tools/build_osid_damage_seed.cjs:
 *   T1: builder is deterministic — same run dir → byte-identical seed across
 *       two invocations.
 *   T2: damage_score is monotonic non-negative; OSIDs with no events have
 *       no record (and a synthetic empty-events run produces no entries),
 *       and every emitted record has damage_score >= 0.
 *
 * Part of LANE-NIGHTSHIFT-ROUND2-OSID-DAMAGE-SEED.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const TOOL_PATH = path.resolve(__dirname, '..', 'tools', 'build_osid_damage_seed.cjs');

const FIXTURE_RUN_DIR = path.resolve(
    __dirname,
    '..',
    'runs',
    'apr1992_definitive_40w__3649b3861a87e6ea__w40_n1624',
);

function sha256(buf: Buffer | string): string {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function runBuilder(runDir: string, outPath: string): string {
    return execFileSync(process.execPath, [TOOL_PATH, runDir, '--out', outPath], {
        encoding: 'utf8',
    });
}

function makeEmptyRunDir(): string {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'osid-damage-empty-'));
    // final_save.json with no displacement events.
    fs.writeFileSync(
        path.join(tmp, 'final_save.json'),
        JSON.stringify({ displacement: { displacement_event_log: [] } }),
        'utf8',
    );
    // control_delta.json with no flips.
    fs.writeFileSync(
        path.join(tmp, 'control_delta.json'),
        JSON.stringify({ flips: [] }),
        'utf8',
    );
    // weekly_report.jsonl with one empty-battles week.
    fs.writeFileSync(
        path.join(tmp, 'weekly_report.jsonl'),
        JSON.stringify({ week_index: 1, battles: [] }) + '\n',
        'utf8',
    );
    return tmp;
}

describe('build_osid_damage_seed.cjs', () => {
    it('T1: deterministic — two invocations produce byte-identical seed JSON', () => {
        if (!fs.existsSync(FIXTURE_RUN_DIR)) {
            // Fixture not present in this checkout; skip.
            return;
        }
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'osid-damage-det-'));
        const outA = path.join(tmp, 'a.json');
        const outB = path.join(tmp, 'b.json');
        runBuilder(FIXTURE_RUN_DIR, outA);
        runBuilder(FIXTURE_RUN_DIR, outB);
        const a = fs.readFileSync(outA);
        const b = fs.readFileSync(outB);
        expect(sha256(a)).toBe(sha256(b));
    });

    it('T2: damage_score is non-negative for every emitted OSID; empty-events run produces no entries', () => {
        // Empty-events synthetic run → no entries.
        const emptyDir = makeEmptyRunDir();
        const emptyOut = path.join(emptyDir, 'seed.json');
        runBuilder(emptyDir, emptyOut);
        const emptySeed = JSON.parse(fs.readFileSync(emptyOut, 'utf8'));
        expect(Object.keys(emptySeed).length).toBe(0);

        // Real fixture (if present) → all damage_scores non-negative + monotonic in components.
        if (fs.existsSync(FIXTURE_RUN_DIR)) {
            const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'osid-damage-mono-'));
            const out = path.join(tmp, 'seed.json');
            runBuilder(FIXTURE_RUN_DIR, out);
            const seed = JSON.parse(fs.readFileSync(out, 'utf8'));
            for (const osid of Object.keys(seed)) {
                const r = seed[osid];
                expect(r.damage_score).toBeGreaterThanOrEqual(0);
                expect(r.battles).toBeGreaterThanOrEqual(0);
                expect(r.casualties_total).toBeGreaterThanOrEqual(0);
                expect(r.flips).toBeGreaterThanOrEqual(0);
                expect(Array.isArray(r.displacement_spike_turns)).toBe(true);
                // Score must be at least the weighted sum of its components — i.e.
                // every component contributes monotonically and non-negatively.
                const lowerBound =
                    1.0 * r.battles +
                    0.01 * r.casualties_total +
                    2.0 * r.flips +
                    1.5 * r.displacement_spike_turns.length;
                // Allow tiny rounding tolerance (builder rounds to 4 decimals).
                expect(r.damage_score).toBeGreaterThanOrEqual(lowerBound - 1e-3);
                expect(r.damage_score).toBeLessThanOrEqual(lowerBound + 1e-3);
                // Spike turns sorted ascending, all non-negative integers.
                for (let i = 1; i < r.displacement_spike_turns.length; i += 1) {
                    expect(r.displacement_spike_turns[i]).toBeGreaterThan(
                        r.displacement_spike_turns[i - 1],
                    );
                }
            }
        }
    });
});
