/**
 * Posture model option 2, follow-ups to findings S1 and S4 (2026-11-12).
 *
 * S1: a presidential stance hold survives the REAL bot pass. generateAllCorpsOrders runs the
 *     formula stance pass, the corridor pass and the commander loop with spatial context
 *     (applyCommanderOutput rewrites every OG stance); the corps and OG holds must still be in
 *     force at the end of the faction pass.
 * S4: CorpsCommandState.player_ordered_stance is cleared at turn end by the
 *     `clear-player-ordered-stances` war step, so a corps once rejected at level 1 is not frozen
 *     and can raise stance matters again at level 2.
 *
 * Fixture adapted from tests/commander_creation_observer.test.ts (caller pass markers).
 */

import { describe, expect, it, vi } from 'vitest';
import { generateAllCorpsOrders } from '../../src/sim/combat/bot_corps_ai.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';
import { generateStanceMatters } from '../../src/sim/combat/stance_matters.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import type { GameState, PresidentialStanceHold, StanceMatterState } from '../../src/state/game_state.js';

const CORPS = 'vrs_c0';
const SECTOR = `sector:${CORPS}:0`;

function makeState(): GameState {
    const brigade = (id: string) => ({
        id, name: id, faction: 'RS', kind: 'brigade', status: 'active', corps_id: CORPS, created_turn: 0, assignment: null,
        personnel: 1200, cohesion: 70, morale: 65, location_osid: 'op:test:approach',
    });
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, phase: 'war', seed: 'stance-integration', player_faction: 'RS', headless_scenario_auto_control: false, autonomy_level: 2 },
        factions: [{ id: 'RS' }],
        political: { political_controllers: { 'op:test:approach': 'RS', 'op:test:objective': 'RBiH' }, control_events: [] },
        displacement: {},
        military: {
            formations: {
                [CORPS]: { id: CORPS, name: CORPS, faction: 'RS', kind: 'corps', status: 'active', created_turn: 0, assignment: null, personnel: 0 },
                b1: brigade('b1'),
                b2: brigade('b2'),
            },
            corps_command: {
                [CORPS]: { command_span: 3, subordinate_count: 2, og_slots: 0, active_ogs: [], active_operations: [], corps_exhaustion: 0, stance: 'balanced' },
            },
            corps_front_sectors: {
                [SECTOR]: {
                    sector_id: SECTOR, corps_id: CORPS, faction: 'RS', opposing_factions: ['RBiH'], edge_ids: ['e1'],
                    sub_segments: [{ sub_segment_id: `subseg:${CORPS}:0`, edge_ids: ['e1'], friendly_osids: ['op:test:approach'], enemy_osids: ['op:test:objective'], primary_brigade_ids: ['b1', 'b2'], length_edges: 1 }],
                    length_edges: 1, territory_osids: ['op:test:approach'], assigned_brigade_ids: ['b1', 'b2'], reserve_brigade_ids: [],
                    density: 2, threat_ratio: 0.2, defensive_power: 100, sector_stance: 'active_defense', stance_source: 'bot',
                },
            },
            brigade_attack_orders: {}, brigade_movement_orders: {}, brigade_posture_orders: [],
        },
    } as unknown as GameState;
}

function runPass(state: GameState): void {
    const adjacency = new Map<string, readonly string[]>([['op:test:approach', ['op:test:objective']], ['op:test:objective', ['op:test:approach']]]);
    const spatial = {
        adjacency, sharedBoundaryAdjacency: adjacency,
        friendlyOsidsByFaction: new Map([['RS', new Set(['op:test:approach'])], ['RBiH', new Set(['op:test:objective'])], ['HRHB', new Set()]]),
        componentsByFaction: new Map(), frontEdgesOsid: undefined, computedAtTurn: state.meta.turn, phase: 'pre-combat',
    };
    const edge = [{ a: 'op:test:approach', b: 'op:test:objective' }];
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
        // Same argument shape as the generate-bot-corps-orders step, with spatial context so the
        // commander loop (runCommanderForCorps + applyCommanderOutput) runs.
        generateAllCorpsOrders(state, 'RS', edge as never, new Map(), null, edge as never, null, null, adjacency as never, spatial as never);
    } finally {
        spy.mockRestore();
    }
}

function withHolds(state: GameState, holds: PresidentialStanceHold[]): void {
    const ms: StanceMatterState = { last_corps_stance: {}, last_og: [], cooldown_until_by_corps: {}, last_overrule_turn_by_corps: {}, holds };
    state.military.stance_matter_state = ms;
}

describe('S1: a presidential hold survives the real bot pass (commander loop included)', () => {
    it('control: without a hold the commander pass decides the corps and OG stances itself', () => {
        const state = makeState();
        runPass(state);
        expect(state.military.corps_command![CORPS]!.stance).toBeDefined();
        expect(state.military.corps_front_sectors![SECTOR]!.sector_stance).toBeDefined();
    });

    it('a corps ceiling (Constrain: hold the line) is in force at the end of the faction pass', async () => {
        const { sectorFingerprint } = await import('../../src/sim/combat/stance_matters.js');
        const state = makeState();
        state.military.army_stance = { RS: 'general_offensive' } as never;
        withHolds(state, [
            { matter_id: 'STANCE_4_vrs_c0', faction: 'RS', scope: 'corps', corps_id: CORPS, mode: 'ceiling', stance: 'defensive', effective_from_turn: 5, until_turn: 8 },
            { matter_id: 'STANCE_4_vrs_c0_og0', faction: 'RS', scope: 'og', corps_id: CORPS, mode: 'fixed', stance: 'fortify', sector_fingerprint: sectorFingerprint(state.military.corps_front_sectors![SECTOR]!), effective_from_turn: 5, until_turn: 8 },
        ]);
        runPass(state);
        const cmd = state.military.corps_command![CORPS]!;
        expect(['defensive', 'reorganize']).toContain(cmd.stance);
        expect(state.military.corps_front_sectors![SECTOR]!.sector_stance).toBe('fortify');
        // No new offensive launched under the hold (corridor guard + defensive stance).
        expect(cmd.active_operations.some((op) => op.started_turn === 5 && (op.name ?? '').startsWith('Corridor Breach'))).toBe(false);
    });

    it('a countermand (fixed previous stance) survives the pass', () => {
        const state = makeState();
        withHolds(state, [
            { matter_id: 'STANCE_4_vrs_c0', faction: 'RS', scope: 'corps', corps_id: CORPS, mode: 'fixed', stance: 'defensive', effective_from_turn: 5, until_turn: 8 },
        ]);
        runPass(state);
        expect(['defensive', 'reorganize']).toContain(state.military.corps_command![CORPS]!.stance);
    });
});

describe('S4: player_ordered_stance is cleared at turn end', () => {
    const clearStep = warPhases.find((step) => step.name === 'clear-player-ordered-stances')!;

    it('is the last war step and deletes the field only where it is set', async () => {
        expect(warPhases[warPhases.length - 1]!.name).toBe('clear-player-ordered-stances');
        const state = makeState();
        state.military.corps_command![CORPS]!.player_ordered_stance = 'balanced';
        await clearStep.run({ state } as never);
        expect('player_ordered_stance' in state.military.corps_command![CORPS]!).toBe(false);
        const untouched = makeState();
        const before = JSON.stringify(untouched);
        await clearStep.run({ state: untouched } as never);
        expect(JSON.stringify(untouched)).toBe(before);
    });

    it('a corps rejected at level 1 is frozen for one turn only, then the formula stance applies and a stance matter can be raised', async () => {
        const state = makeState();
        state.military.army_stance = { RS: 'balanced' } as never;
        const cmd = state.military.corps_command![CORPS]!;
        // Turn 5: the level-1 reject wrote a one-turn hold on 'reorganize' (an extreme stance the
        // formula will not pick for these healthy brigades).
        cmd.stance = 'reorganize';
        cmd.player_ordered_stance = 'reorganize';
        runPass(state);
        expect(cmd.stance).toBe('reorganize');                    // held this turn
        generateStanceMatters(state, 'RS', new Map());              // records the baseline
        expect(state.meta.stance_matters).toBeUndefined();          // skipped while ordered
        expect(state.meta.stance_matter_history).toBeUndefined();   // not even a not_put line
        await clearStep.run({ state } as never);                     // turn end
        expect(cmd.player_ordered_stance).toBeUndefined();
        // Turn 6: the formula takes over.
        state.meta.turn = 6;
        runPass(state);
        expect(cmd.stance).not.toBe('reorganize');
        // The pass sets the RS early-war standing order (general_offensive), so the change is
        // recorded as not_put(army_stance): the corps is no longer skipped.
        const probe = JSON.parse(JSON.stringify(state)) as GameState;
        generateStanceMatters(probe, 'RS', new Map());
        expect(probe.meta.stance_matter_history?.map((r) => [r.corps_id, r.outcome, r.not_put_reason])).toEqual([[CORPS, 'not_put', 'army_stance']]);
        // With a neutral army stance the change is put to the president as a matter.
        state.military.army_stance = { RS: 'balanced' } as never;
        generateStanceMatters(state, 'RS', new Map());
        expect(state.meta.stance_matters?.map((m) => [m.corps_id, m.from_stance, m.to_stance])).toEqual([[CORPS, 'reorganize', cmd.stance]]);
    });
});


describe('Codex #580: a defensive hold stops a concentrating commander plan from launching (real bot pass)', () => {
    const concentratingPlan = {
        plan_id: 'plan:vrs_c0:t3', objective_description: 'Test objective', target_osids: ['op:test:objective'],
        required_brigades: 2, assigned_brigades: ['b1', 'b2'], staging_zone: 'zone:vrs_c0:op:test:approach',
        status: 'concentrating', created_turn: 3, target_ready_turn: 5, concentration_progress: 0.5, viability_score: 1,
        source: 'opportunity',
    };
    const runningOp = {
        name: 'Running Op', type: 'sector_attack', phase: 'execution', started_turn: 3, phase_started_turn: 4,
        target_settlements: [], participating_brigades: ['b1'],
    };
    type Cmd = { commander_state: Record<string, unknown> & { current_plan?: { status: string; suspension_reason?: string } | null }; active_operations: Array<{ name: string; started_turn: number }> };
    const prepared = (hold: boolean): GameState => {
        const state = makeState();
        // A real commander state from a pass at turn 4, then a plan due to become ready at turn 5
        // and an operation that was already running when the hold took effect.
        state.meta.turn = 4;
        runPass(state);
        state.meta.turn = 5;
        const cmd = state.military.corps_command![CORPS] as unknown as Cmd;
        cmd.commander_state = { ...cmd.commander_state, current_plan: concentratingPlan as never };
        cmd.active_operations = [runningOp as never];
        if (hold) {
            withHolds(state, [{ matter_id: 'STANCE_4_vrs_c0', faction: 'RS', scope: 'corps', corps_id: CORPS, mode: 'ceiling', stance: 'defensive', effective_from_turn: 5, until_turn: 8 }]);
        }
        return state;
    };

    it('the held plan is suspended, no new operation starts, and the running operation continues', () => {
        const state = prepared(true);
        runPass(state);
        const cmd = state.military.corps_command![CORPS] as unknown as Cmd;
        expect(cmd.commander_state.current_plan?.status).toBe('suspended');
        expect(cmd.commander_state.current_plan?.suspension_reason).toBe('presidential hold forbids new offensives');
        expect(cmd.active_operations.filter((op) => op.started_turn === 5)).toEqual([]);
        // The hold does not touch the operation already running: same outcome as without a hold.
        const control = prepared(false);
        runPass(control);
        const names = (s: GameState) => (s.military.corps_command![CORPS] as unknown as Cmd).active_operations.filter((op) => op.started_turn < 5).map((op) => op.name);
        expect(names(state)).toEqual(names(control));
        expect(names(state)).toContain('Running Op');
    });
});
