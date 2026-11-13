import { describe, expect, it } from 'vitest';

import { buildReplayFrameSummary } from '../src/sim/replay/replay_frame_summary.js';
import {
    buildReplaySaveManifest,
    isReadableReplaySaveManifest,
    readReplayManifestFrames,
} from '../src/sim/replay/replay_manifest.js';
import { replaySummaryPlayer } from '../src/sim/replay/replay_summary_player.js';

// Replay frame summaries read the engine's own records (SC6, 2026-11-13):
//   totalCasualties        = Σ casualty_ledger[side].killed + wounded + missing_captured
//   totalDisplacedOrKilled = Σ displacement_humanitarian_aggregates[causer][people].refugees_created
// The pre-fix reader looked at `military.casualty_totals_by_faction` /
// `casualties_by_faction` / `casualties` and
// `displacement_humanitarian_aggregates.total_displaced`. No production code
// writes any of those, so every frame of every war reported 0. The first two
// tests below use frames shaped exactly as the engine writes them; the old
// reader returns 0 for both and fails them.
//
// A figure the frame does not record is `null` (hidden in the UI), never 0
// (SENSITIVE_HISTORY_DESIGN_GATE §4, "False zero").

function makeFrame(overrides: Record<string, unknown> = {}): unknown {
    return {
        turn: 4,
        metadata: { turn: 4, date: '1992-04-15' },
        political: { political_controllers: { 'op:foo:1': 'RBiH' } },
        military: {},
        displacement: { displacement_humanitarian_aggregates: {} },
        ...overrides,
    };
}

function ledgerRow(killed: number, wounded: number, missing_captured: number) {
    return {
        killed,
        wounded,
        missing_captured,
        equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 },
        per_formation: {},
        per_militia_pool: {},
    };
}

function aggregate(refugees_created: number, civilian_casualties_caused: number, refugees_received = 0) {
    return { refugees_created, refugees_received, civilian_casualties_caused };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summarize = (frame: unknown) => buildReplayFrameSummary(frame as any);

describe('replay_frame_summary reads the fields the engine writes', () => {
    it('military casualties = killed + wounded + missing/captured from military.casualty_ledger, all sides', () => {
        const summary = summarize(makeFrame({
            military: {
                casualty_ledger: {
                    RBiH: ledgerRow(100, 300, 20),
                    RS: ledgerRow(80, 250, 10),
                    HRHB: ledgerRow(5, 15, 1),
                },
            },
        }));
        expect(summary.totalCasualties).toBe(100 + 300 + 20 + 80 + 250 + 10 + 5 + 15 + 1);
    });

    it('displaced or killed = Σ refugees_created over every caused-by and people key', () => {
        const summary = summarize(makeFrame({
            displacement: {
                displacement_humanitarian_aggregates: {
                    RS: { RBiH: aggregate(5000, 90), HRHB: aggregate(300, 4) },
                    RBiH: { RS: aggregate(1200, 12) },
                    _unknown: { RBiH: aggregate(7, 0) },
                    // refugees_received is a separate measure and must not be counted.
                    HRHB: { HRHB: aggregate(0, 0, 999_999) },
                },
            },
        }));
        expect(summary.totalDisplacedOrKilled).toBe(5000 + 300 + 1200 + 7);
    });

    it('ignores the never-written fields the old reader looked at', () => {
        const summary = summarize(makeFrame({
            military: { casualty_totals_by_faction: { RBiH: 100 }, casualties_by_faction: { RS: 5 }, casualties: 9 },
            displacement: { total_displaced: 50, displacement_humanitarian_aggregates: { total_displaced: 1234 } },
        }));
        expect(summary.totalCasualties).toBe(0);
        expect(summary.totalDisplacedOrKilled).toBe(0);
    });

    it('a military record with no ledger yet is a true 0: the engine creates the ledger on its first casualty', () => {
        expect(summarize(makeFrame({ military: { formations: {} } })).totalCasualties).toBe(0);
    });

    it('returns null, not 0, for frames that do not record the figure', () => {
        for (const military of [undefined, 'not-an-object', 42]) {
            expect(summarize(makeFrame({ military })).totalCasualties).toBeNull();
        }
        expect(summarize(makeFrame({ military: { casualty_ledger: 'broken' } })).totalCasualties).toBeNull();
        for (const displacement of [undefined, 'string-instead-of-object', 42, [], {}]) {
            expect(summarize(makeFrame({ displacement })).totalDisplacedOrKilled).toBeNull();
        }
    });

    it('returns a summary with no figures for null/undefined frames', () => {
        for (const empty of [null, undefined]) {
            expect(buildReplayFrameSummary(empty)).toEqual({
                turn: null,
                date: null,
                activeFormations: 0,
                totalCasualties: null,
                totalDisplacedOrKilled: null,
                controlByFaction: [],
            });
        }
    });

    it('skips malformed rows and negative or non-finite counts', () => {
        const summary = summarize(makeFrame({
            military: { casualty_ledger: { RBiH: ledgerRow(10, -5, Number.NaN), RS: 'x' } },
            displacement: { displacement_humanitarian_aggregates: { RS: { RBiH: aggregate(Number.POSITIVE_INFINITY, 0), RS: null } } },
        }));
        expect(summary.totalCasualties).toBe(10);
        expect(summary.totalDisplacedOrKilled).toBe(0);
    });

    it('does not depend on key insertion order', () => {
        const a = summarize(makeFrame({
            military: { casualty_ledger: { RS: ledgerRow(1, 2, 3), RBiH: ledgerRow(4, 5, 6) } },
            displacement: { displacement_humanitarian_aggregates: { RS: { RBiH: aggregate(10, 1) }, RBiH: { RS: aggregate(20, 2) } } },
        }));
        const b = summarize(makeFrame({
            military: { casualty_ledger: { RBiH: ledgerRow(4, 5, 6), RS: ledgerRow(1, 2, 3) } },
            displacement: { displacement_humanitarian_aggregates: { RBiH: { RS: aggregate(20, 2) }, RS: { RBiH: aggregate(10, 1) } } },
        }));
        expect(a).toEqual(b);
    });
});

describe('replay manifest schema v2', () => {
    const frame = {
        turn: 3,
        date: '1992-04-29',
        activeFormations: 12,
        totalCasualties: 4321,
        totalDisplacedOrKilled: 98765,
        controlByFaction: [{ faction: 'RS', osids: 10 }],
    };

    it('writes schema_version 2 and keeps the figures', () => {
        const manifest = buildReplaySaveManifest([frame]);
        expect(manifest.schema_version).toBe(2);
        expect(readReplayManifestFrames(manifest)).toEqual([frame]);
        expect(replaySummaryPlayer(manifest).getTurn(0)?.summary.totalCasualties).toBe(4321);
    });

    it('still reads v1 manifests but drops their never-recorded figures to null', () => {
        const v1 = {
            schema_version: 1 as const,
            frame_count: 1,
            frames: [{ turn: 3, date: '1992-04-29', activeFormations: 12, totalCasualties: 0, totalDisplaced: 0, controlByFaction: [{ faction: 'RS', osids: 10 }] }],
        };
        expect(isReadableReplaySaveManifest(v1)).toBe(true);
        const [read] = readReplayManifestFrames(v1);
        expect(read).toEqual({ ...frame, totalCasualties: null, totalDisplacedOrKilled: null });
        expect(replaySummaryPlayer(v1).getTurn(0)?.summary.totalDisplacedOrKilled).toBeNull();
    });

    it('rejects unknown schema versions', () => {
        expect(isReadableReplaySaveManifest({ schema_version: 3, frames: [] })).toBe(false);
        expect(readReplayManifestFrames({ schema_version: 3, frames: [frame] } as never)).toEqual([]);
    });
});
