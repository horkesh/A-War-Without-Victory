/**
 * RF-F1g (2026-11-15): the corps threat ratio reads the OSID contact graph.
 *
 * WHY. `computeSectorThreat` expands a corps' positions to their neighbours with
 * `buildOsidAdjacency(edges)`, but the war step passed the canonical settlement edges (`S…` ids)
 * while brigade locations are OSIDs (`op:…`). No neighbour was ever found, so on main's 188-week
 * run the threat was 0 in 3,292 of 3,292 corps-turns: no corps ever went defensive because of a
 * threat, and no emergency defensive operation was ever created. The fix passes the OSID contact
 * edges (`od.edges`, the graph preCombat spatial adjacency is built from) at all three call sites,
 * and stops counting allied brigades (RBiH-HRHB while allied) as enemy.
 */

import { describe, expect, it, vi } from 'vitest';
import { computeSectorThreat } from '../../src/sim/combat/bot_corps_helpers.js';
import { generateCorpsStanceOrders, type CorpsStanceTrace } from '../../src/sim/combat/bot_corps_stance.js';
import { generateEmergencyDefensiveOperations } from '../../src/sim/combat/bot_corps_operations.js';
import { generateAllCorpsOrders } from '../../src/sim/combat/bot_corps_ai.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';
import type { FactionId, FormationState, GameState } from '../../src/state/game_state.js';

const CORPS = 'vrs_threat_corps';
const OSID_EDGES = [{ a: 'op:t:home', b: 'op:t:front' }];
const S_EDGES = [{ a: 'S100001', b: 'S100002' }];

function brigade(id: string, faction: FactionId, osid: string, personnel: number, corps?: string): FormationState {
    return {
        id, name: id, faction, kind: 'brigade', status: 'active', created_turn: 0, assignment: null,
        corps_id: corps ?? null, location_osid: osid, personnel, cohesion: 70, morale: 65,
    } as unknown as FormationState;
}

/** An RS corps of two brigades at op:t:home; an RBiH brigade on the adjacent op:t:front and one far away. */
function makeState(opts: { enemyFaction?: FactionId; corpsFaction?: FactionId; alliance?: number } = {}): GameState {
    const corpsFaction = opts.corpsFaction ?? 'RS';
    const enemyFaction = opts.enemyFaction ?? 'RBiH';
    return {
        meta: { turn: 30, phase: 'war', seed: 'f1g' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        political: {
            political_controllers: { 'op:t:home': corpsFaction, 'op:t:front': enemyFaction, 'op:t:far': enemyFaction },
            ...(opts.alliance !== undefined ? { war_alliance_rbih_hrhb: opts.alliance } : {}),
        },
        military: {
            formations: {
                [CORPS]: { id: CORPS, name: CORPS, faction: corpsFaction, kind: 'corps', status: 'active', created_turn: 0, assignment: null, personnel: 0 },
                b1: brigade('b1', corpsFaction, 'op:t:home', 2400, CORPS),
                b2: brigade('b2', corpsFaction, 'op:t:home', 2400, CORPS),
                e1: brigade('e1', enemyFaction, 'op:t:front', 12000),
                e2: brigade('e2', enemyFaction, 'op:t:far', 9000),
            },
            corps_command: {
                [CORPS]: { command_span: 3, subordinate_count: 2, og_slots: 0, active_ogs: [], active_operations: [], corps_exhaustion: 0, stance: 'balanced' },
            },
        },
    } as unknown as GameState;
}

const subs = (state: GameState) => ['b1', 'b2'].map(id => state.military.formations![id]!);

describe('RF-F1g: computeSectorThreat reads the OSID graph', () => {
    it('counts the adjacent enemy and not the far one with OSID edges (12000 / 4800 = 2.5)', () => {
        const state = makeState();
        expect(computeSectorThreat(state, subs(state), OSID_EDGES as never)).toBeCloseTo(2.5, 6);
    });

    it('the S-id edges the war step used to pass find no neighbour: threat 0 (the defect)', () => {
        const state = makeState();
        expect(computeSectorThreat(state, subs(state), S_EDGES as never)).toBe(0);
    });

    it('allied brigades are no threat; the same brigade counts at war', () => {
        const allied = makeState({ corpsFaction: 'RBiH', enemyFaction: 'HRHB', alliance: 0.8 });
        expect(computeSectorThreat(allied, subs(allied), OSID_EDGES as never)).toBe(0);
        const atWar = makeState({ corpsFaction: 'RBiH', enemyFaction: 'HRHB', alliance: -0.5 });
        expect(computeSectorThreat(atWar, subs(atWar), OSID_EDGES as never)).toBeCloseTo(2.5, 6);
    });

    it('a state without a political block reads the alliance as absent (allied) and does not throw', () => {
        const state = makeState({ corpsFaction: 'RBiH', enemyFaction: 'HRHB' });
        delete (state as { political?: unknown }).political;
        expect(computeSectorThreat(state, subs(state), OSID_EDGES as never)).toBe(0);
    });
});

describe('RF-F1g: the stance formula sees the threat', () => {
    it('with OSID edges the formula reads the real threat (2.5, above the 1.5 defensive line)', () => {
        const state = makeState();
        const trace = new Map<string, CorpsStanceTrace>();
        generateCorpsStanceOrders(state, 'RS', OSID_EDGES as never, new Map(), trace);
        expect(trace.get(CORPS)?.sector_threat).toBeCloseTo(2.5, 6);
        // Later layers may change the final stance; the formula's own read is what F1g fixes.
        expect(trace.get(CORPS)?.sector_threat).toBeGreaterThan(1.5);
    });

    it('control: with S-id edges the formula reads threat 0, as on main', () => {
        const state = makeState();
        const trace = new Map<string, CorpsStanceTrace>();
        generateCorpsStanceOrders(state, 'RS', S_EDGES as never, new Map(), trace);
        expect(trace.get(CORPS)?.sector_threat).toBe(0);
        expect(trace.get(CORPS)?.driver).not.toBe('threat_high');
    });
});

describe('RF-F1g: generateAllCorpsOrders passes the OSID edges to the threat', () => {
    it('with osidEdges the formula threat is real; without them it falls back to the given edges', () => {
        const run = (osidEdges: unknown[] | undefined) => {
            const state = makeState();
            const trace = new Map<string, CorpsStanceTrace>();
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
            try {
                generateAllCorpsOrders(state, 'RS', S_EDGES as never, new Map(), null, osidEdges as never,
                    null, null, undefined, null, undefined, null, trace);
            } finally {
                spy.mockRestore();
            }
            return trace.get(CORPS)?.sector_threat;
        };
        expect(run(OSID_EDGES)).toBeCloseTo(2.5, 6);
        expect(run(undefined)).toBe(0);
    });

    it('the emergency call site also gets the OSID edges: the same threat drives it inside the bot pass', () => {
        // generateAllCorpsOrders passes `effectiveOsidEdges` to generateEmergencyDefensiveOperations.
        // With the OSID graph the formula sees threat 2.5 > 1.5, the corps goes defensive, and at
        // threat >= 2.0 with two healthy brigades it opens one emergency op. With S-id edges it never does.
        // (Reverting the emergency call site to `edges` fails this test.)
        const run = (osidEdges: unknown[] | undefined) => {
            const state = makeState();
            const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
            try {
                generateAllCorpsOrders(state, 'RS', S_EDGES as never, new Map(), null, osidEdges as never);
            } finally {
                spy.mockRestore();
            }
            const cmd = state.military.corps_command![CORPS]!;
            return { stance: cmd.stance, emergency: cmd.active_operations.filter(op => op.is_emergency).length };
        };
        const withGraph = run(OSID_EDGES);
        const without = run(undefined);
        expect(withGraph).toEqual({ stance: 'defensive', emergency: 1 });
        expect(without.emergency).toBe(0);
    });
});

describe('RF-F1g: emergency defensive operations can fire', () => {
    it('a defensive corps under threat >= 2.0 gets exactly one emergency op on the adjacent enemy OSID', () => {
        const state = makeState();
        state.military.corps_command![CORPS]!.stance = 'defensive';
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            generateEmergencyDefensiveOperations(state, 'RS', OSID_EDGES as never, new Map());
            generateEmergencyDefensiveOperations(state, 'RS', OSID_EDGES as never, new Map());
        } finally {
            spy.mockRestore();
        }
        const ops = state.military.corps_command![CORPS]!.active_operations;
        expect(ops.filter(op => op.is_emergency)).toHaveLength(1);
        expect(ops[0]!.target_settlements).toEqual(['op:t:front']);
        expect(ops[0]!.participating_brigades.length).toBeLessThanOrEqual(4);
        expect(ops[0]!.participating_brigades).toEqual(expect.arrayContaining(['b1', 'b2']));
    });

    it('control: with S-id edges no emergency op is ever created (threat 0)', () => {
        const state = makeState();
        state.military.corps_command![CORPS]!.stance = 'defensive';
        generateEmergencyDefensiveOperations(state, 'RS', S_EDGES as never, new Map());
        expect(state.military.corps_command![CORPS]!.active_operations).toEqual([]);
    });
});

describe('RF-F1g: the player-faction stance recommendation step reads the OSID graph', () => {
    it('generate-player-stance-recommendations uses the operational OSID edges, not the settlement edges', async () => {
        const step = warPhases.find(s => s.name === 'generate-player-stance-recommendations')!;
        const run = async (withOsid: boolean) => {
            const state = makeState();
            state.meta.player_faction = 'RS';
            state.meta.autonomy_level = 1;
            const context = {
                state,
                input: {
                    settlementGraph: { settlements: new Map(), edges: S_EDGES },
                    settlementEdges: S_EDGES,
                    ...(withOsid ? { operationalData: { edges: OSID_EDGES } } : {}),
                },
            };
            await step.run(context as never);
            return state.military.corps_command![CORPS]!.ai_recommended_stance;
        };
        const withGraph = await run(true);
        const without = await run(false);
        expect(withGraph).not.toBe(without);
    });
});
