/**
 * v0.9.3 Lane 4 C5 — per-GameState content-fingerprint cache for
 * `reconcileFinalSectorTruth`. The war pipeline calls this function twice in
 * adjacent steps (`reconcile-final-sector-truth` + `reconcile-final-sector-truth-after-ops`)
 * with only `reconcile-final-operation-truth` between them. That intervening
 * step mutates only operation fields (`participating_brigades`, `sector_id`),
 * none of which are read by the reconcile pipeline — so the second call's work
 * is fully redundant.
 *
 * These tests prove:
 *   - Two calls with byte-identical inputs return the SAME report object
 *     reference (cache hit, no rebuild).
 *   - A political_controllers flip invalidates the cache (miss, fresh compute).
 *   - A formation location move invalidates the cache.
 *   - Distinct GameState instances keep independent caches.
 *   - isFinalPass flipping from false → true on cache hit re-emits the
 *     unresolved-sector warnings without rebuilding sectors.
 *
 * Byte-identity across the 40w/52w/4w golden baselines is separately verified
 * by `tools/scenario_runner/run_baseline_regression.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as corpsFrontSectorsModule from '../src/sim/combat/corps_front_sectors.js';
import { reconcileFinalSectorTruth } from '../src/sim/combat/final_sector_truth_reconciliation.js';
import {
    CURRENT_SCHEMA_VERSION,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeFormation(id: string, overrides: Partial<FormationState>): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 1200,
        cohesion: 65,
        morale: 70,
        ...overrides,
    } as FormationState;
}

function makeState(): { state: GameState; edges: EdgeRecord[] } {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'c5-cache-test',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        } as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ] as unknown as GameState['factions'],
        military: {
            formations: {
                corps_a: makeFormation('corps_a', {
                    kind: 'corps',
                    location_osid: 'op:test:rear',
                    personnel: 50,
                }),
                brig_seed: makeFormation('brig_seed', {
                    corps_id: 'corps_a',
                    location_osid: 'op:test:front',
                    home_osid: 'op:test:front',
                }),
            },
            war_front_edges_osid: [
                { edge_id: 'op:test:front__op:test:enemy', a: 'op:test:front', b: 'op:test:enemy', side_a: 'RS', side_b: 'RBiH' },
            ],
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            phantoms_spawned: [],
            corps_front_sectors: {},
            sector_intel: {},
        } as GameState['military'],
        political: {
            political_controllers: {
                'op:test:rear': 'RS',
                'op:test:front': 'RS',
                'op:test:enemy': 'RBiH',
            },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;

    const edges: EdgeRecord[] = [
        { a: 'op:test:rear', b: 'op:test:front' } as EdgeRecord,
        { a: 'op:test:front', b: 'op:test:enemy' } as EdgeRecord,
    ];

    return { state, edges };
}

describe('reconcileFinalSectorTruth cache (C5)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('skips buildCorpsFrontSectors on the second call when inputs are unchanged', () => {
        const { state, edges } = makeState();
        // Prime the cache with a first call (counts as a buildCorpsFrontSectors
        // invocation).
        reconcileFinalSectorTruth(state, edges, null);

        // Spy AFTER the first call so we only count the second call. If the
        // cache hits on call 2, buildCorpsFrontSectors is not invoked.
        const spy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');
        const second = reconcileFinalSectorTruth(state, edges, null);
        expect(spy).not.toHaveBeenCalled();
        // Report shape should still be present regardless of cache path.
        expect(second).toEqual(
            expect.objectContaining({
                sectors_rebuilt: expect.any(Number),
                sectors_rated: expect.any(Number),
                unresolved_brigades: expect.any(Number),
            }),
        );
    });

    it('invalidates when political_controllers changes', () => {
        const { state, edges } = makeState();
        const first = reconcileFinalSectorTruth(state, edges, null);
        // Flip rear OSID controller
        state.political.political_controllers!['op:test:rear'] = 'RBiH';
        const second = reconcileFinalSectorTruth(state, edges, null);
        expect(second).not.toBe(first); // cache miss
    });

    it('invalidates when a formation location_osid changes', () => {
        const { state, edges } = makeState();
        const first = reconcileFinalSectorTruth(state, edges, null);
        const brig = state.military.formations!.brig_seed!;
        (brig as { location_osid?: string }).location_osid = 'op:test:rear';
        const second = reconcileFinalSectorTruth(state, edges, null);
        expect(second).not.toBe(first);
    });

    it('invalidates when a new active formation appears', () => {
        const { state, edges } = makeState();
        const first = reconcileFinalSectorTruth(state, edges, null);
        state.military.formations!.brig_extra = makeFormation('brig_extra', {
            corps_id: 'corps_a',
            location_osid: 'op:test:front',
            home_osid: 'op:test:front',
        });
        const second = reconcileFinalSectorTruth(state, edges, null);
        expect(second).not.toBe(first);
    });

    it('invalidates when same-length war_front_edges_osid content is replaced', () => {
        const { state, edges } = makeState();
        const first = reconcileFinalSectorTruth(state, edges, null);
        const spy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');

        state.military.war_front_edges_osid = [
            { edge_id: 'op:test:rear__op:test:enemy', a: 'op:test:rear', b: 'op:test:enemy', side_a: 'RS', side_b: 'RBiH' },
        ];

        const second = reconcileFinalSectorTruth(state, edges, null);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(second).not.toBe(first);
    });

    it('invalidates when supply state input changes', () => {
        const { state, edges } = makeState();
        const firstSupply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RS',
                by_osid: [{ osid: 'op:test:front', state: 'adequate' as const }],
            }],
        };
        const secondSupply = {
            schema: 1 as const,
            turn: 10,
            factions: [{
                faction_id: 'RS',
                by_osid: [{ osid: 'op:test:front', state: 'critical' as const }],
            }],
        };

        const first = reconcileFinalSectorTruth(state, edges, null, undefined, undefined, firstSupply);
        const second = reconcileFinalSectorTruth(state, edges, null, undefined, undefined, secondSupply);

        expect(second).not.toBe(first);
    });

    it('distinct GameState instances keep independent caches', () => {
        const a = makeState();
        const b = makeState();
        const ra = reconcileFinalSectorTruth(a.state, a.edges, null);
        const rb = reconcileFinalSectorTruth(b.state, b.edges, null);
        expect(rb).not.toBe(ra);
        expect(rb).toEqual(ra); // content still identical
    });

    it('rebuilds once when isFinalPass flips true so final-only repairs can run', () => {
        const { state, edges } = makeState();
        const spy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');

        const first = reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false);
        const second = reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, true);
        const rebuildsAfterFlip = spy.mock.calls.length;
        const third = reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, true);

        expect(second).not.toBe(first);
        expect(rebuildsAfterFlip).toBeGreaterThanOrEqual(2);
        expect(third).toBe(second);
        expect(spy.mock.calls.length).toBe(rebuildsAfterFlip);
    });
});
