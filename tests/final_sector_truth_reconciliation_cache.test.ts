/**
 * Compatibility filename retained for the focused sector pack. The old
 * per-GameState WeakMap cache is gone; these tests pin the replacement:
 * explicit, deterministic, turn-local reconciliation receipts.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EdgeRecord } from '../src/map/settlements.js';
import * as corpsFrontSectorsModule from '../src/sim/combat/corps_front_sectors.js';
import {
    createFinalSectorReconciliationSession,
    recordFinalSectorReconciliationMutation,
    reconcileFinalSectorTruth,
} from '../src/sim/combat/final_sector_truth_reconciliation.js';
import {
    CURRENT_SCHEMA_VERSION,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';

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
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'final-sector-turn-session',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        },
        factions: [
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ],
        military: {
            formations: {
                corps_a: makeFormation('corps_a', { kind: 'corps', location_osid: 'op:test:rear', personnel: 50 }),
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
        },
        political: {
            political_controllers: {
                'op:test:rear': 'RS',
                'op:test:front': 'RS',
                'op:test:enemy': 'RBiH',
            },
        },
        displacement: {},
    } as unknown as GameState;
    return {
        state,
        edges: [
            { a: 'op:test:rear', b: 'op:test:front' } as EdgeRecord,
            { a: 'op:test:front', b: 'op:test:enemy' } as EdgeRecord,
        ],
    };
}

describe('reconcileFinalSectorTruth turn-local session', () => {
    afterEach(() => vi.restoreAllMocks());

    it('makes a clean second pass a no-op and returns the prior report', () => {
        const { state, edges } = makeState();
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');
        const first = reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false, { session });
        const spy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');
        const second = reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false, { session });
        expect(spy).not.toHaveBeenCalled();
        expect(second).toBe(first);
        expect(session.geometry_builds).toBe(1);
    });

    it('keeps the dirty worklist in fixed dependency order', () => {
        const { state, edges } = makeState();
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');
        expect(session.dirty_worklist).toEqual(['geometry', 'territory', 'roster', 'ratings']);
        reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false, { session });
        recordFinalSectorReconciliationMutation(session, 'operation-roster', 'operation-truth');
        expect(session.dirty_worklist).toEqual(['roster', 'ratings']);
        reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false, { session });
        expect(session.dirty_worklist).toEqual([]);
    });

    it('runs one new full build only when the owner records a geometry mutation', () => {
        const { state, edges } = makeState();
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');
        reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false, { session });
        state.political.political_controllers!['op:test:rear'] = 'RBiH';
        recordFinalSectorReconciliationMutation(session, 'geometry', 'test-controller-change');
        const spy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');
        reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false, { session });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(session.geometry_builds).toBe(2);
        expect(session.stage_epochs).toEqual({ geometry: 2, territory: 2, roster: 2, ratings: 2 });
    });

    it('recomputes rating-only receipts without a topology build', () => {
        const { state, edges } = makeState();
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');
        reconcileFinalSectorTruth(state, edges, null, undefined, undefined, null, false, { session });
        recordFinalSectorReconciliationMutation(session, 'ratings', 'supply-rating-refresh');
        const spy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');
        reconcileFinalSectorTruth(state, edges, null, undefined, undefined, {
            schema: 1,
            turn: 10,
            factions: [{ faction_id: 'RS', by_osid: [{ osid: 'op:test:front', state: 'critical' }] }],
        }, false, { session });
        expect(spy).not.toHaveBeenCalled();
        expect(session.stage_epochs).toEqual({ geometry: 1, territory: 1, roster: 1, ratings: 2 });
    });

    it('keeps distinct GameState instances in distinct caller-owned sessions', () => {
        const a = makeState();
        const b = makeState();
        const sessionA = createFinalSectorReconciliationSession(a.state.meta.turn, 'a');
        const sessionB = createFinalSectorReconciliationSession(b.state.meta.turn, 'b');
        reconcileFinalSectorTruth(a.state, a.edges, null, undefined, undefined, null, false, { session: sessionA });
        reconcileFinalSectorTruth(b.state, b.edges, null, undefined, undefined, null, false, { session: sessionB });
        expect(sessionA).not.toBe(sessionB);
        expect(sessionA.receipts[0]?.source).toBe('a');
        expect(sessionB.receipts[0]?.source).toBe('b');
    });

    it('rejects accidental cross-turn reuse', () => {
        const { state, edges } = makeState();
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');
        state.meta.turn += 1;
        expect(() => reconcileFinalSectorTruth(
            state,
            edges,
            null,
            undefined,
            undefined,
            null,
            false,
            { session },
        )).toThrow(/turn-local/);
    });

    it('records monotonic epochs and stable receipt payloads', () => {
        const session = createFinalSectorReconciliationSession(10, 'geometry-owner');
        recordFinalSectorReconciliationMutation(session, 'operation-roster', 'operation-owner');
        recordFinalSectorReconciliationMutation(session, 'distribution-roster', 'distribution-owner');
        expect(session.receipts).toEqual([
            { epoch: 1, mutation: 'geometry', source: 'geometry-owner', dirty_stages: ['geometry', 'territory', 'roster', 'ratings'] },
            { epoch: 2, mutation: 'operation-roster', source: 'operation-owner', dirty_stages: ['roster', 'ratings'] },
            { epoch: 3, mutation: 'distribution-roster', source: 'distribution-owner', dirty_stages: ['roster', 'ratings'] },
        ]);
    });

    it('contains no module-level per-GameState reconciliation cache', () => {
        const raw = readFileSync('src/sim/combat/final_sector_truth_reconciliation.ts', 'utf8');
        expect(raw).not.toContain('WeakMap<GameState');
        expect(raw).not.toContain('computeReconcileFingerprint');
        expect(raw).toContain('assertSessionTurn');
    });
});
