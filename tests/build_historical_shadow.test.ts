/**
 * Ghost War extractor contract — tools/build_historical_shadow.cjs.
 *
 * Guards the seed of the Ghost War capability (docs/plans/2026-07-06-ghost-war-design.md):
 * flip derivation from weekly frames, week attribution, granularity honesty
 * (weekly / sparse / endpoint), null-not-zero aggregate discipline, and
 * byte-identical determinism.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const {
    buildHistoricalShadow,
    stableStringify,
} = require_('../tools/build_historical_shadow.cjs') as {
    buildHistoricalShadow: (runDir: string) => {
        schema_version: number;
        kind: string;
        source: { scenario_id: string | null; weeks: number | null; final_state_hash: string | null; run_dir: string };
        granularity: 'weekly' | 'sparse' | 'endpoint';
        start: { controllers: Record<string, string | null> };
        flips: Array<{ week: number; osid: string; from: string | null; to: string | null }>;
        weekly: Array<{ week: number; control_counts: Record<string, number> | null; displaced_total: number | null; battle_count: number | null }>;
    };
    stableStringify: (v: unknown) => string;
};

const cleanups: string[] = [];
afterEach(() => {
    while (cleanups.length > 0) {
        const dir = cleanups.pop()!;
        rmSync(dir, { recursive: true, force: true });
    }
});

function save(controllers: Record<string, string | null>): string {
    return JSON.stringify({ schema_version: 1, political: { political_controllers: controllers } });
}

interface FixtureOptions {
    initial: Record<string, string | null>;
    frames?: Array<{ week: number; controllers: Record<string, string | null> }>;
    final: Record<string, string | null>;
    weeks?: number;
    weeklyRows?: Array<Record<string, unknown>>;
}

function makeRunDir(opts: FixtureOptions): string {
    const dir = mkdtempSync(join(tmpdir(), 'awwv-shadow-'));
    cleanups.push(dir);
    writeFileSync(join(dir, 'initial_save.json'), save(opts.initial), 'utf8');
    writeFileSync(join(dir, 'final_save.json'), save(opts.final), 'utf8');
    for (const frame of opts.frames ?? []) {
        writeFileSync(join(dir, `save_w${frame.week}.json`), save(frame.controllers), 'utf8');
    }
    writeFileSync(
        join(dir, 'run_summary.json'),
        JSON.stringify({ scenario_id: 'test_scenario', weeks: opts.weeks ?? (opts.frames?.length ?? 1), final_state_hash: 'abc123' }),
        'utf8',
    );
    if (opts.weeklyRows) {
        writeFileSync(join(dir, 'weekly_report.jsonl'), opts.weeklyRows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    }
    return dir;
}

describe('buildHistoricalShadow', () => {
    it('derives flips per week from complete frames and reports weekly granularity', () => {
        const dir = makeRunDir({
            initial: { 'op:a:a': 'RBiH', 'op:b:b': 'RS', 'op:c:c': 'HRHB' },
            frames: [
                { week: 1, controllers: { 'op:a:a': 'RBiH', 'op:b:b': 'RBiH', 'op:c:c': 'HRHB' } },
                { week: 2, controllers: { 'op:a:a': 'RS', 'op:b:b': 'RBiH', 'op:c:c': 'HRHB' } },
            ],
            final: { 'op:a:a': 'RS', 'op:b:b': 'RBiH', 'op:c:c': 'HRHB' },
            weeks: 2,
        });
        const artifact = buildHistoricalShadow(dir);
        expect(artifact.granularity).toBe('weekly');
        expect(artifact.flips).toEqual([
            { week: 1, osid: 'op:b:b', from: 'RS', to: 'RBiH' },
            { week: 2, osid: 'op:a:a', from: 'RBiH', to: 'RS' },
        ]);
        expect(artifact.source).toEqual({
            scenario_id: 'test_scenario',
            weeks: 2,
            final_state_hash: 'abc123',
            run_dir: artifact.source.run_dir,
        });
        expect(Object.keys(artifact.start.controllers)).toHaveLength(3);
    });

    it('falls back to a single endpoint diff at the final week when no frames exist', () => {
        const dir = makeRunDir({
            initial: { 'op:a:a': 'RBiH', 'op:b:b': 'RS' },
            final: { 'op:a:a': 'RS', 'op:b:b': 'RS' },
            weeks: 40,
        });
        const artifact = buildHistoricalShadow(dir);
        expect(artifact.granularity).toBe('endpoint');
        expect(artifact.flips).toEqual([{ week: 40, osid: 'op:a:a', from: 'RBiH', to: 'RS' }]);
    });

    it('reports sparse granularity when frames do not cover every week', () => {
        const dir = makeRunDir({
            initial: { 'op:a:a': 'RBiH' },
            frames: [{ week: 2, controllers: { 'op:a:a': 'RS' } }],
            final: { 'op:a:a': 'RS' },
            weeks: 4,
        });
        const artifact = buildHistoricalShadow(dir);
        expect(artifact.granularity).toBe('sparse');
        expect(artifact.flips).toEqual([{ week: 2, osid: 'op:a:a', from: 'RBiH', to: 'RS' }]);
    });

    it('reads weekly aggregates and preserves missing fields as null, never zero', () => {
        const dir = makeRunDir({
            initial: { 'op:a:a': 'RBiH' },
            frames: [{ week: 1, controllers: { 'op:a:a': 'RBiH' } }],
            final: { 'op:a:a': 'RBiH' },
            weeks: 1,
            weeklyRows: [
                {
                    // week_index is 1-based in weekly_report.jsonl, aligned with save_w<N>.
                    week_index: 1,
                    control_counts: { RBiH: 1 },
                    settlement_displacement_total: 12,
                    battles: [{ id: 'b1' }, { id: 'b2' }],
                },
                { week_index: 2 }, // sparse row: no battles / displacement / counts reported
            ],
        });
        const artifact = buildHistoricalShadow(dir);
        expect(artifact.weekly).toEqual([
            { week: 1, control_counts: { RBiH: 1 }, displaced_total: 12, battle_count: 2 },
            { week: 2, control_counts: null, displaced_total: null, battle_count: null },
        ]);
    });

    it('is deterministic: two builds of the same run dir serialize byte-identically', () => {
        const dir = makeRunDir({
            initial: { 'op:b:b': 'RS', 'op:a:a': 'RBiH' },
            frames: [{ week: 1, controllers: { 'op:a:a': 'RS', 'op:b:b': 'RS' } }],
            final: { 'op:a:a': 'RS', 'op:b:b': 'RS' },
            weeks: 1,
        });
        const first = stableStringify(buildHistoricalShadow(dir));
        const second = stableStringify(buildHistoricalShadow(dir));
        expect(second).toBe(first);
        // Key order in serialization is sorted regardless of insertion order.
        expect(first.indexOf('"op:a:a"')).toBeLessThan(first.indexOf('"op:b:b"'));
    });

    it('throws a clear error when a save lacks canonical political_controllers', () => {
        const dir = mkdtempSync(join(tmpdir(), 'awwv-shadow-'));
        cleanups.push(dir);
        writeFileSync(join(dir, 'initial_save.json'), JSON.stringify({ political: {} }), 'utf8');
        writeFileSync(join(dir, 'final_save.json'), save({ 'op:a:a': 'RS' }), 'utf8');
        writeFileSync(join(dir, 'run_summary.json'), JSON.stringify({ weeks: 1 }), 'utf8');
        expect(() => buildHistoricalShadow(dir)).toThrow(/political_controllers/);
    });
});
