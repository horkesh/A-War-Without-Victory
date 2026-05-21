import { describe, expect, it } from 'vitest';

import { buildReplayFrameSummary } from '../src/sim/replay/replay_frame_summary.js';

// BATCH C §3.10 schema-boundary coverage for replay_frame_summary.ts.
// Replay frames are diagnostic-only; the summary widens `military` and
// `displacement` to free-form Record reads. Pre-Batch-C the `as unknown as`
// casts propagated `undefined` for missing sub-objects but crashed on
// non-object payloads. The helper-backed reads now return `undefined` in
// both cases (looser-downstream) and the summary fields zero out.

function makeFrame(overrides: Record<string, unknown> = {}): unknown {
    return {
        turn: 4,
        metadata: { turn: 4, date: '1992-04-15' },
        political: { political_controllers: { 'op:foo:1': 'RBiH' } },
        military: {},
        ...overrides,
    };
}

describe('replay_frame_summary schema boundary', () => {
    it('returns a zeroed summary for null/undefined frames', () => {
        for (const empty of [null, undefined]) {
            const summary = buildReplayFrameSummary(empty);
            expect(summary).toEqual({
                turn: null,
                date: null,
                activeFormations: 0,
                totalCasualties: 0,
                totalDisplaced: 0,
                controlByFaction: [],
            });
        }
    });

    it('reads casualty totals from a valid military sub-object', () => {
        const frame = makeFrame({
            military: {
                casualty_totals_by_faction: { RBiH: 100, RS: 75, HRHB: 25 },
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary = buildReplayFrameSummary(frame as any);
        expect(summary.totalCasualties).toBe(200);
    });

    it('propagates 0 casualties when military sub-object is missing', () => {
        const frame = makeFrame({ military: undefined });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary = buildReplayFrameSummary(frame as any);
        expect(summary.totalCasualties).toBe(0);
    });

    it('propagates 0 casualties when military sub-object is malformed (non-object)', () => {
        // Pre-Batch-C this would TypeError downstream; helper now returns undefined
        // and the summary surfaces 0 without crashing.
        const frame = makeFrame({ military: 'not-an-object' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary = buildReplayFrameSummary(frame as any);
        expect(summary.totalCasualties).toBe(0);
    });

    it('reads total_displaced from displacement aggregates', () => {
        const frame = makeFrame({
            displacement: {
                displacement_humanitarian_aggregates: { total_displaced: 1234 },
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary = buildReplayFrameSummary(frame as any);
        expect(summary.totalDisplaced).toBe(1234);
    });

    it('falls back to top-level total_displaced when aggregates are missing', () => {
        const frame = makeFrame({
            displacement: { total_displaced: 50 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const summary = buildReplayFrameSummary(frame as any);
        expect(summary.totalDisplaced).toBe(50);
    });

    it('propagates 0 displaced when displacement is missing or malformed', () => {
        for (const bad of [undefined, 'string-instead-of-object', 42, []]) {
            const frame = makeFrame({ displacement: bad });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const summary = buildReplayFrameSummary(frame as any);
            expect(summary.totalDisplaced).toBe(0);
        }
    });
});
