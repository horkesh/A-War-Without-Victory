/**
 * Council fix 3 / B10 (docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md):
 * accepting Holbrooke's October 1995 ceasefire must close the operation channel, call off
 * running offensives and hold corps stances, for as long as the ceasefire holds.
 *
 * Mechanics under test (src/sim/combat/oct1995_ceasefire.ts and its consumers):
 *  - `accept_ceasefire` records `ceasefire_oct1995_in_force`; `continue_offensive` does not.
 *  - the ceasefire binds every party (COHA precedent), offensives planning or executing enter
 *    recovery with reason `ceasefire`, strategic defence is kept, and the call is idempotent;
 *  - corps stances and the combat-effective stance are held at Defensive or below;
 *  - a declined Dayton reopens the war and lifts the ceasefire.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CorpsOperation, CorpsStance, GameState } from '../../../src/state/game_state.js';
import type { EventDefinition } from '../../../src/sim/events/event_types.js';
import { applyDefinitionFlags } from '../../../src/sim/events/evaluate_events.js';
import {
    OCT1995_CEASEFIRE_DEMAND_EVENT,
    OCT1995_CEASEFIRE_FLAG,
    capStanceForOct1995Ceasefire,
    clampCorpsStancesForOct1995Ceasefire,
    isFactionBoundByOct1995Ceasefire,
    isOct1995CeasefireInForce,
    isOct1995CeasefireStandDownAttackOrder,
    isOct1995CeasefireStandDownComplete,
} from '../../../src/sim/combat/oct1995_ceasefire.js';
import { cancelOffensivesForOct1995Ceasefire } from '../../../src/sim/combat/sector_offensive.js';
import { getEffectiveCorpsStance } from '../../../src/sim/combat/corps_command.js';
import { reopenWarAfterDaytonDecline } from '../../../src/sim/negotiation/dayton_negotiation.js';
import { injectQueuedOperation } from '../../../src/sim/combat/pre_planned_operations.js';
import {
    OPERATION_OPPORTUNITY_CATALOG,
    generateOpportunityProposalReviews,
} from '../../../src/sim/combat/operation_opportunities.js';
import { setArmyStandingOrder } from '../../../src/sim/combat/bot_corps_stance.js';
import { warPhases } from '../../../src/sim/turn_phases/war_phases.js';

const WAR_1995 = join(process.cwd(), 'data', 'scenarios', 'events', 'war_1995.json');
const DEMAND = (JSON.parse(readFileSync(WAR_1995, 'utf8')) as EventDefinition[])
    .find((e) => e.id === 'holbrooke_ceasefire_demand_oct95')!;

function op(name: string, type: CorpsOperation['type'], phase: CorpsOperation['phase'], startedTurn = 180): CorpsOperation {
    return {
        name,
        type,
        phase,
        started_turn: startedTurn,
        phase_started_turn: startedTurn,
        participating_brigades: [],
        objectives: [],
    } as unknown as CorpsOperation;
}

function corps(stance: CorpsStance, operations: CorpsOperation[] = []) {
    return {
        command_span: 10, subordinate_count: 0, og_slots: 0, active_ogs: [], corps_exhaustion: 0,
        stance, active_operations: operations,
    };
}

function makeState(flag?: boolean): GameState {
    return {
        meta: { turn: 183, phase: 'war', seed: 'b10' },
        political: {},
        military: {
            formations: {
                arbih_2nd_corps: { id: 'arbih_2nd_corps', faction: 'RBiH', kind: 'corps' },
                vrs_1st_krajina: { id: 'vrs_1st_krajina', faction: 'RS', kind: 'corps' },
                hvo_tomislavgrad: { id: 'hvo_tomislavgrad', faction: 'HRHB', kind: 'corps' },
            },
            corps_command: {
                arbih_2nd_corps: corps('offensive', [
                    op('Uragan 95', 'sector_attack', 'execution', 178),
                    op('Probe Ozren', 'probe', 'planning', 182),
                    op('Emergency Defense', 'strategic_defense', 'planning', 182),
                ]),
                vrs_1st_krajina: corps('balanced', [op('Counterstroke', 'sector_attack', 'planning', 182)]),
                hvo_tomislavgrad: corps('reorganize', [op('Old Op', 'sector_attack', 'recovery', 179)]),
            },
            event_flags: flag === undefined ? {} : { [OCT1995_CEASEFIRE_FLAG]: flag },
        },
    } as unknown as GameState;
}

describe('B10: the response records the ceasefire', () => {
    it('accept_ceasefire sets ceasefire_oct1995_in_force; continue_offensive does not', () => {
        const accept = DEMAND.response_options!.find((o) => o.id === 'accept_ceasefire')!;
        const refuse = DEMAND.response_options!.find((o) => o.id === 'continue_offensive')!;
        const accepted = makeState();
        applyDefinitionFlags(accepted, accept.sets_flags);
        expect(isOct1995CeasefireInForce(accepted)).toBe(true);
        const refused = makeState();
        applyDefinitionFlags(refused, refuse.sets_flags);
        expect(isOct1995CeasefireInForce(refused)).toBe(false);
    });

    it('binds every party while in force and none otherwise', () => {
        const on = makeState(true);
        for (const faction of ['RBiH', 'RS', 'HRHB']) expect(isFactionBoundByOct1995Ceasefire(on, faction)).toBe(true);
        for (const s of [makeState(), makeState(false)]) {
            for (const faction of ['RBiH', 'RS', 'HRHB']) expect(isFactionBoundByOct1995Ceasefire(s, faction)).toBe(false);
        }
    });
});

describe('B10: running offensives are called off', () => {
    it('offensives planning or executing enter recovery with reason ceasefire, for every party', () => {
        const state = makeState(true);
        const cancelled = cancelOffensivesForOct1995Ceasefire(state, 183);
        expect(cancelled).toEqual([
            'arbih_2nd_corps:Uragan 95:t178',
            'arbih_2nd_corps:Probe Ozren:t182',
            'vrs_1st_krajina:Counterstroke:t182',
        ]);
        const arbih = state.military.corps_command!.arbih_2nd_corps.active_operations;
        expect(arbih.find((o) => o.name === 'Uragan 95')).toMatchObject({ phase: 'recovery', recovery_reason: 'ceasefire', phase_started_turn: 183 });
        expect(arbih.find((o) => o.name === 'Probe Ozren')).toMatchObject({ phase: 'recovery', recovery_reason: 'ceasefire' });
        // Defensive reactions stay: the emergency strategic-defence operation is untouched.
        expect(arbih.find((o) => o.name === 'Emergency Defense')).toMatchObject({ phase: 'planning' });
        expect(state.military.corps_command!.vrs_1st_krajina.active_operations[0]).toMatchObject({ phase: 'recovery', recovery_reason: 'ceasefire' });
        // An operation already recovering keeps its own reason and clock.
        expect(state.military.corps_command!.hvo_tomislavgrad.active_operations[0]).toMatchObject({ phase: 'recovery', phase_started_turn: 179 });
    });

    it('is idempotent and inert without the ceasefire', () => {
        const state = makeState(true);
        cancelOffensivesForOct1995Ceasefire(state, 183);
        const snapshot = JSON.stringify(state);
        expect(cancelOffensivesForOct1995Ceasefire(state, 184)).toEqual([]);
        expect(JSON.stringify(state)).toBe(snapshot);
        for (const off of [makeState(), makeState(false)]) {
            const before = JSON.stringify(off);
            expect(cancelOffensivesForOct1995Ceasefire(off, 183)).toEqual([]);
            expect(JSON.stringify(off)).toBe(before);
        }
    });
});

describe('B10: corps stances hold', () => {
    it('lowers Offensive and Balanced to Defensive and keeps Reorganize', () => {
        const state = makeState(true);
        expect(clampCorpsStancesForOct1995Ceasefire(state)).toEqual(['arbih_2nd_corps', 'vrs_1st_krajina']);
        expect(state.military.corps_command!.arbih_2nd_corps.stance).toBe('defensive');
        expect(state.military.corps_command!.vrs_1st_krajina.stance).toBe('defensive');
        expect(state.military.corps_command!.hvo_tomislavgrad.stance).toBe('reorganize');
        for (const s of ['offensive', 'balanced', 'defensive', 'reorganize'] as CorpsStance[]) {
            expect(capStanceForOct1995Ceasefire(makeState(), 'RBiH', s)).toBe(s);
        }
    });

    it('an army general offensive cannot lift the combat-effective stance above Defensive', () => {
        const state = makeState(true);
        (state.military as { army_stance?: Record<string, string> }).army_stance = { RBiH: 'general_offensive' };
        expect(getEffectiveCorpsStance(state, 'arbih_2nd_corps')).toBe('defensive');
        const free = makeState();
        (free.military as { army_stance?: Record<string, string> }).army_stance = { RBiH: 'general_offensive' };
        expect(getEffectiveCorpsStance(free, 'arbih_2nd_corps')).toBe('offensive');
    });
});

function axisOp(
    name: string,
    objectives: string[],
    currentIndex: number,
    attacks: number,
    brigades: string[],
): CorpsOperation {
    return {
        name,
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 180,
        phase_started_turn: 181,
        participating_brigades: brigades,
        objectives,
        axes: [{
            axis_id: 'main',
            name: 'Main',
            objectives,
            assigned_brigades: brigades,
            current_objective_index: currentIndex,
            status: 'executing',
            attack_attempt_count: attacks,
            objective_capture_count: currentIndex,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }],
    } as unknown as CorpsOperation;
}

function onlyArbihOperations(state: GameState, operations: CorpsOperation[]): void {
    const commands = state.military.corps_command!;
    commands.arbih_2nd_corps.active_operations = operations;
    commands.vrs_1st_krajina.active_operations = [];
    commands.hvo_tomislavgrad.active_operations = [];
}

describe('B10: an offensive already executing concludes only the fight it was in', () => {
    it('records the cap on the objective under attack and permits only that attack', () => {
        const state = makeState(true);
        const farz = axisOp('Farz', ['a', 'b', 'c', 'd'], 3, 6, ['bde_1', 'bde_2']);
        onlyArbihOperations(state, [farz]);
        expect(cancelOffensivesForOct1995Ceasefire(state, 184)).toEqual([]);
        expect(farz.phase).toBe('execution');
        expect(farz.ceasefire_stand_down).toEqual({ from_turn: 184, objective_cap_by_axis: { main: 3 } });
        expect(isOct1995CeasefireStandDownAttackOrder(state, 'bde_1', 'd')).toBe(true);
        expect(isOct1995CeasefireStandDownAttackOrder(state, 'bde_1', 'c')).toBe(false);
        // A counter-attack (no stand-down operation behind it) is never permitted.
        expect(isOct1995CeasefireStandDownAttackOrder(state, 'bde_9', 'd')).toBe(false);
    });

    it('stands the offensive down once the axis moves past its cap', () => {
        const state = makeState(true);
        const op = axisOp('Sana', ['a', 'b', 'c'], 1, 3, ['bde_1']);
        onlyArbihOperations(state, [op]);
        cancelOffensivesForOct1995Ceasefire(state, 184);
        expect(op.phase).toBe('execution');
        op.axes![0].current_objective_index = 2; // objective b captured (or failed out)
        expect(isOct1995CeasefireStandDownAttackOrder(state, 'bde_1', 'c')).toBe(false);
        expect(cancelOffensivesForOct1995Ceasefire(state, 185)).toEqual(['arbih_2nd_corps:Sana:t180']);
        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'ceasefire' });
    });

    it('an axis that had not yet attacked stands down at once', () => {
        const state = makeState(true);
        const op = axisOp('Fresh', ['a', 'b'], 0, 0, ['bde_1']);
        onlyArbihOperations(state, [op]);
        expect(cancelOffensivesForOct1995Ceasefire(state, 184)).toEqual(['arbih_2nd_corps:Fresh:t180']);
        expect(op.ceasefire_stand_down?.objective_cap_by_axis).toEqual({ main: -1 });
        expect(isOct1995CeasefireStandDownComplete(op)).toBe(true);
    });
});

describe('B10: the ceasefire binds from the turn after the demand card fired', () => {
    it('a bot answer inside turn 183 binds from turn 184, like the president answering after 183', () => {
        const state = makeState(true);
        (state.military as { event_last_fired_turn?: Record<string, number> }).event_last_fired_turn = {
            [OCT1995_CEASEFIRE_DEMAND_EVENT]: 183,
        };
        state.meta.turn = 183;
        expect(isOct1995CeasefireInForce(state)).toBe(false);
        expect(cancelOffensivesForOct1995Ceasefire(state, 183)).toEqual([]);
        state.meta.turn = 184;
        expect(isOct1995CeasefireInForce(state)).toBe(true);
    });

    it('the enforcement step sits directly after evaluate-events', () => {
        const names = warPhases.map((phase) => phase.name);
        expect(names.indexOf('enforce-oct1995-ceasefire')).toBe(names.indexOf('evaluate-events') + 1);
    });
});

describe('B10: the operation channel is closed', () => {
    it('the queued follow-on operation is held, not consumed', () => {
        const state = makeState(true);
        state.military.corps_command!.arbih_2nd_corps.active_operations = [];
        (state.military.corps_command!.arbih_2nd_corps as { queued_operations?: string[] }).queued_operations = ['Operation Next'];
        expect(injectQueuedOperation(state, 'arbih_2nd_corps')).toBe(false);
        expect((state.military.corps_command!.arbih_2nd_corps as { queued_operations?: string[] }).queued_operations).toEqual(['Operation Next']);
    });

    it('the staff puts no catalog offensive to the president', () => {
        const state = makeState(true);
        state.meta.autonomy_level = 1;
        state.meta.player_faction = 'RBiH';
        (state.military as { operation_opportunities?: unknown[] }).operation_opportunities = [{
            opportunity_id: OPERATION_OPPORTUNITY_CATALOG[0]!.opportunity_id,
            proposal_id: 'p1',
            eligibility_turn: 183,
            expires_turn: 190,
            status: 'eligible_pending_review',
            approver_faction: 'RBiH',
            last_axis_evaluation: [],
        }];
        expect(generateOpportunityProposalReviews(state, 'RBiH')).toEqual([]);
    });

    it('no army-wide offensive is ordered while the ceasefire binds', () => {
        const state = makeState(true);
        (state.military as { war_timeline?: unknown }).war_timeline = {
            standing_orders: { RBiH: [{ name: 'Late Offensive', start_week: 0, end_week: 999, army_stance: 'general_offensive' }] },
        };
        setArmyStandingOrder(state, 'RBiH');
        const free = makeState();
        (free.military as { war_timeline?: unknown }).war_timeline = (state.military as { war_timeline?: unknown }).war_timeline;
        setArmyStandingOrder(free, 'RBiH');
        expect((free.military as { army_stance?: Record<string, string> }).army_stance?.RBiH).toBe('general_offensive');
        expect((state.military as { army_stance?: Record<string, string> }).army_stance?.RBiH).toBe('balanced');
    });
});

describe('B10: a declined Dayton reopens the war', () => {
    it('reopenWarAfterDaytonDecline lifts the ceasefire', () => {
        const state = makeState(true);
        reopenWarAfterDaytonDecline(state);
        expect(isOct1995CeasefireInForce(state)).toBe(false);
        expect(state.military.event_flags[OCT1995_CEASEFIRE_FLAG]).toBe(false);
    });
});
