/**
 * A receipt for a paramilitary action carried out without a request to the player must tell the truth (Codex finding on #740):
 * only an action that TOOK its target books civilian harm and the war-crime count (src/sim/combat/paramilitary_sweep.ts:
 * the control flip, then `recordWarCrime`), so only that one may say "counts against your side". An action that dissolved
 * without taking its target (target already friendly, combat blocked, organized defence, the fade cutoff) books nothing and
 * gets a true outcome line. Each case here runs the real engine and then the real adapter and ledger.
 */

import { describe, expect, it } from 'vitest';

import { advanceParamilitaries } from '../../src/sim/combat/paramilitary_sweep.js';
import { initializeCasualtyLedger } from '../../src/state/casualty_ledger.js';
import { createEmptyCapital } from '../../src/state/negotiation_types.js';
import type { FormationState, GameState } from '../../src/state/game_state.js';
import type { EdgeRecord } from '../../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../../src/data/operational_data.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { buildDecisionConsequenceLedger } from '../../src/ui/map/data/decisionConsequenceLedger.js';

function reverseMap(osids: string[]): OperationalToCanonicalReverseMap {
    return new Map(osids.map((osid) => [osid, [osid]]));
}

function edges(pairs: Array<[string, string]>): EdgeRecord[] {
    return pairs.map(([a, b]) => ({ a, b }) as EdgeRecord);
}

function paraFormation(faction: 'RS' | 'RBiH', created: number, target: string, eta = 1): FormationState {
    return {
        id: `para_${faction.toLowerCase()}_t${created}_0`, faction, name: 'Para', created_turn: created, status: 'active',
        assignment: null, kind: 'paramilitary', readiness: 'active', paramilitary_target: target, paramilitary_eta: eta, personnel: 150,
    } as FormationState;
}

function engineState(turn: number, controllers: Record<string, string>, formations: Record<string, FormationState>, political: Record<string, unknown> = {}): GameState {
    const municipalities: Record<string, unknown> = {};
    for (const osid of Object.keys(controllers)) {
        municipalities[osid.split(':')[1] ?? osid] = { organizational_penetration: { sda_penetration: 40, sds_penetration: 85, hdz_penetration: 20, patriotska_liga: 25, paramilitary_rs: 60, paramilitary_hrhb: 5 } };
    }
    return {
        meta: { turn, phase: 'war', schema_version: 1, seed: 'test' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: {
            formations,
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            negotiation: { capital: { RS: createEmptyCapital(), RBiH: createEmptyCapital(), HRHB: createEmptyCapital() } },
        },
        political: { political_controllers: controllers, municipalities, ...political },
        displacement: { civilian_casualties: { RS: { killed: 0, fled_abroad: 0 }, RBiH: { killed: 0, fled_abroad: 0 }, HRHB: { killed: 0, fled_abroad: 0 } } },
    } as unknown as GameState;
}

/** Run the engine, then read the receipt the player would see for `faction`. */
function receiptAfter(state: GameState, faction: 'RS' | 'RBiH', edgeList: EdgeRecord[], map: OperationalToCanonicalReverseMap) {
    advanceParamilitaries(state, edgeList, map);
    const warCrimes = (state.military.negotiation as any).capital[faction].war_crimes_events_emergent ?? 0;
    const controlEvents = ((state.political as any).control_events ?? []).filter((event: any) => event.mechanism === 'paramilitary');
    (state.meta as any).player_faction = faction;
    const parsed = parseGameState(JSON.parse(JSON.stringify(state)));
    const ledger = buildDecisionConsequenceLedger({ ...parsed, player_faction: faction, rawGameState: { meta: { player_faction: faction } } } as any, 100)
        .filter((record) => record.familyId === 'paramilitary-receipt');
    return { warCrimes, controlEvents, view: parsed.paramilitaryUnrequested ?? [], ledger };
}

describe('receipt for a paramilitary action carried out without a request tells the truth about harm', () => {
    it('an action that TOOK its target: harm and the war-crime count are booked, and the receipt says it counts against the side', () => {
        const state = engineState(3, { A: 'RS', D: 'RBiH' }, { para_rs_t3_0: paraFormation('RS', 3, 'D') });
        const { warCrimes, controlEvents, view, ledger } = receiptAfter(state, 'RS', [], reverseMap(['A', 'D']));
        expect(warCrimes).toBe(1);
        expect(controlEvents).toHaveLength(1);
        expect(view).toEqual([expect.objectContaining({ id: 'para_rs_t3_0', captured: true })]);
        expect(ledger).toHaveLength(1);
        expect(ledger[0]!.detail).toContain('It counts against your side.');
        expect(ledger[0]!.outcome).toBe('Carried out');
    });

    const dissolvedCases: Array<{ cause: string; build: () => { state: GameState; faction: 'RS' | 'RBiH'; edges: EdgeRecord[]; map: OperationalToCanonicalReverseMap } }> = [
        {
            cause: 'the target is already friendly when it arrives',
            build: () => ({ state: engineState(3, { A: 'RS', D: 'RS' }, { para_rs_t3_0: paraFormation('RS', 3, 'D') }), faction: 'RS', edges: [], map: reverseMap(['A', 'D']) }),
        },
        {
            cause: 'combat between the two sides is blocked (RBiH and HRHB alliance)',
            build: () => ({
                state: engineState(5, { 'op:test:hub': 'RBiH', 'op:test:target': 'HRHB' }, { para_rbih_t4_0: paraFormation('RBiH', 4, 'op:test:target') }, { war_alliance_rbih_hrhb: 0.75 }),
                faction: 'RBiH', edges: edges([['op:test:hub', 'op:test:target']]), map: reverseMap(['op:test:hub', 'op:test:target']),
            }),
        },
        {
            cause: 'organized defenders are adjacent at arrival',
            build: () => ({
                state: engineState(3, { A: 'RS', B: 'RBiH', D: 'RBiH' }, {
                    para_rs_t3_0: paraFormation('RS', 3, 'D'),
                    rbih_adjacent: { id: 'rbih_adjacent', faction: 'RBiH', name: 'Adjacent Brigade', created_turn: 0, status: 'active', assignment: null, kind: 'brigade', location_osid: 'B', personnel: 1200 } as FormationState,
                }),
                faction: 'RS', edges: edges([['A', 'D'], ['B', 'D']]), map: reverseMap(['A', 'B', 'D']),
            }),
        },
        {
            cause: 'the fade cutoff (week 20) expires it before it can act',
            build: () => ({ state: engineState(21, { A: 'RS', D: 'RBiH' }, { para_rs_t20_0: paraFormation('RS', 20, 'D') }), faction: 'RS', edges: [], map: reverseMap(['A', 'D']) }),
        },
    ];

    for (const { cause, build } of dissolvedCases) {
        it(`an action that dissolved because ${cause}: the engine books nothing, and the receipt says so`, () => {
            const { state, faction, edges: edgeList, map } = build();
            const { warCrimes, controlEvents, view, ledger } = receiptAfter(state, faction, edgeList, map);
            // The engine side of the finding: no war crime, no control flip, no civilian harm.
            expect(warCrimes).toBe(0);
            expect(controlEvents).toHaveLength(0);
            expect(Object.values((state.displacement as any).civilian_casualties).every((row: any) => row.killed === 0)).toBe(true);
            // The receipt side: a dissolved outcome, never "counts against your side".
            expect(view).toHaveLength(1);
            expect(view[0]!.captured).toBe(false);
            expect(ledger).toHaveLength(1);
            expect(ledger[0]!.outcome).toBe('Dissolved');
            expect(ledger[0]!.title).toBe('Paramilitary action dissolved without taking its target');
            expect(ledger[0]!.detail).toContain('dissolved without taking its target');
            expect(ledger[0]!.detail).toContain('No harm to civilians was recorded and it does not count against your side.');
            expect(ledger[0]!.detail).not.toMatch(/It counts against your side/);
        });
    }
});
