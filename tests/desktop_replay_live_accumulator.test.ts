/**
 * TIER1-REPLAY-LIVE: unit proof that buildReplayFrameSummary + buildReplaySaveManifest
 * produce a valid, deterministic manifest from accumulated live-play frames.
 *
 * These are the same functions re-exported by desktop_sim.ts for electron-main.cjs
 * to call as sim.buildReplayFrameSummary / sim.buildReplaySaveManifest.
 * Testing them directly here confirms the pure-function contract without requiring
 * the Electron bundle to be built.
 *
 * Calibration-inert: no sim code, no scenario_runner, no GameState mutation.
 */

import { describe, expect, it } from 'vitest';
import { buildReplayFrameSummary } from '../src/sim/replay/replay_frame_summary.js';
import { buildReplaySaveManifest } from '../src/sim/replay/replay_manifest.js';
import type { GameState } from '../src/state/game_state.js';

// ── Minimal fake GameState factory ─────────────────────────────────────────

function makeMinimalState(turn: number, date: string, rsOsids: number, rbihOsids: number): GameState {
    const controllers: Record<string, string> = {};
    for (let i = 0; i < rsOsids; i++) controllers[`rs_osid_${i}`] = 'RS';
    for (let i = 0; i < rbihOsids; i++) controllers[`rbih_osid_${i}`] = 'RBiH';

    return {
        meta: { turn, phase: 'war', seed: 'test', game_over: false },
        // `metadata` (date) is read by buildReplayFrameSummary via its internal
        // ReplayFrameLike widening; it is not a field on the base GameState type,
        // so the whole literal is cast through `unknown`.
        metadata: { turn, date },
        military: {
            formations: {
                brigade_a: { status: 'active', kind: 'brigade', faction: 'RS' },
                brigade_b: { status: 'active', kind: 'brigade', faction: 'RBiH' },
                brigade_c: { status: 'destroyed', kind: 'brigade', faction: 'RS' },
            },
            casualty_totals_by_faction: { RS: 1200, RBiH: 800 },
        },
        political: {
            political_controllers: controllers,
        },
        displacement: {},
    } as unknown as GameState;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('desktop_replay_live_accumulator — frame accumulation', () => {
    it('builds a valid frame from a minimal GameState', () => {
        const state = makeMinimalState(1, '1992-04-06', 10, 5);
        const frame = buildReplayFrameSummary(state);
        expect(frame.turn).toBe(1);
        expect(frame.date).toBe('1992-04-06');
        expect(typeof frame.activeFormations).toBe('number');
        expect(typeof frame.totalCasualties).toBe('number');
        expect(Array.isArray(frame.controlByFaction)).toBe(true);
    });

    it('counts only active formations', () => {
        const state = makeMinimalState(1, '1992-04-06', 10, 5);
        const frame = buildReplayFrameSummary(state);
        // makeMinimalState creates brigade_a (active), brigade_b (active), brigade_c (destroyed)
        expect(frame.activeFormations).toBe(2);
    });

    it('accumulates 3 frames and builds a valid manifest', () => {
        const states = [
            makeMinimalState(1, '1992-04-06', 10, 5),
            makeMinimalState(2, '1992-04-13', 11, 5),
            makeMinimalState(3, '1992-04-20', 12, 4),
        ];
        const frames = states.map(buildReplayFrameSummary);
        const manifest = buildReplaySaveManifest(frames);

        expect(manifest.schema_version).toBe(1);
        expect(manifest.frame_count).toBe(3);
        expect(manifest.frames.length).toBe(3);
    });

    it('each frame carries turn, date, and controlByFaction', () => {
        const states = [
            makeMinimalState(1, '1992-04-06', 10, 5),
            makeMinimalState(10, '1992-06-08', 8, 7),
        ];
        const frames = states.map(buildReplayFrameSummary);
        const manifest = buildReplaySaveManifest(frames);

        expect(manifest.frames[0].turn).toBe(1);
        expect(manifest.frames[0].date).toBe('1992-04-06');
        expect(manifest.frames[0].controlByFaction.length).toBeGreaterThan(0);

        expect(manifest.frames[1].turn).toBe(10);
        expect(manifest.frames[1].date).toBe('1992-06-08');
    });

    it('manifest is deterministic — two identical inputs produce identical JSON', () => {
        const stateA = makeMinimalState(5, '1992-05-11', 20, 15);
        const stateB = makeMinimalState(5, '1992-05-11', 20, 15);

        const frameA = buildReplayFrameSummary(stateA);
        const frameB = buildReplayFrameSummary(stateB);
        const manifestA = buildReplaySaveManifest([frameA]);
        const manifestB = buildReplaySaveManifest([frameB]);

        expect(JSON.stringify(manifestA)).toBe(JSON.stringify(manifestB));
    });

    it('handles null/undefined state gracefully (returns empty frame, not a throw)', () => {
        const frame = buildReplayFrameSummary(null);
        expect(frame.turn).toBeNull();
        expect(frame.date).toBeNull();
        expect(frame.activeFormations).toBe(0);
        expect(frame.totalCasualties).toBe(0);
        expect(frame.controlByFaction).toEqual([]);
    });

    it('controlByFaction entries are sorted deterministically', () => {
        const state = makeMinimalState(1, '1992-04-06', 10, 5);
        const frame = buildReplayFrameSummary(state);
        const factions = frame.controlByFaction.map((c) => c.faction);
        const sorted = [...factions].sort();
        expect(factions).toEqual(sorted);
    });

    it('buildReplaySaveManifest with empty frames array returns frame_count 0', () => {
        const manifest = buildReplaySaveManifest([]);
        expect(manifest.schema_version).toBe(1);
        expect(manifest.frame_count).toBe(0);
        expect(manifest.frames).toEqual([]);
    });
});
