import { describe, expect, it } from 'vitest';

import { evaluateArmyHQGathering } from '../src/sim/combat/army_hq_gathering.js';
import { getCorpsArmyPriorities } from '../src/sim/combat/bot_strategy.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

const TURN = 40;
const FACTION = 'RBiH' as const;

function brigade(id: string, corpsId: string): FormationState {
    return {
        id,
        faction: FACTION,
        name: id,
        kind: 'brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1800,
        max_personnel: 2000,
        cohesion: 70,
        morale: 70,
        fatigue: 10,
        corps_id: corpsId,
        home_mun: corpsId === 'arbih_1st_corps' ? 'centar_sarajevo' : 'zenica',
        home_osid: corpsId === 'arbih_1st_corps'
            ? 'op:centar_sarajevo:centar_sarajevo_1'
            : 'op:zenica:zenica_1',
    } as unknown as FormationState;
}

function makeEligibleState(options: {
    playerFaction: 'RBiH' | null;
    autonomy: 0 | 1 | 2 | 3;
    headless: boolean;
}): GameState {
    const formations: Record<string, FormationState> = {};
    for (const corpsId of ['arbih_1st_corps', 'arbih_2nd_corps']) {
        for (let i = 1; i <= 4; i += 1) {
            const id = `${corpsId}_bde_${i}`;
            formations[id] = brigade(id, corpsId);
        }
    }
    return {
        meta: {
            turn: TURN,
            phase: 'war',
            decision_mode: 'emergent',
            autonomy_level: options.autonomy,
            ...(options.playerFaction ? { player_faction: options.playerFaction } : {}),
            ...(options.headless ? { headless_scenario_auto_control: true } : {}),
        },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            corps_command: {
                arbih_1st_corps: { stance: 'balanced', corps_exhaustion: 0, active_operations: [] },
                arbih_2nd_corps: { stance: 'balanced', corps_exhaustion: 0, active_operations: [] },
            },
            sector_intel: {},
            opsec_sectors: [],
            sector_combat_ratings: {},
            general_supply_reserve: { RBiH: 5000 },
            last_gathering_turn: {},
            fired_event_ids: [],
        },
        political: { control_events: [], political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

function gatheringStep() {
    const step = warPhases.find(candidate => candidate.name === 'evaluate-army-hq-gathering');
    expect(step).toBeDefined();
    return step!;
}

describe('production Army HQ gathering faction routing', () => {
    const rows = [
        { name: 'absent player, interactive', playerFaction: null, autonomy: 0, headless: false, expectedPlan: true },
        { name: 'absent player, headless', playerFaction: null, autonomy: 0, headless: true, expectedPlan: true },
        { name: 'selected player, headless', playerFaction: FACTION, autonomy: 0, headless: true, expectedPlan: true },
        { name: 'selected player, autonomy 0', playerFaction: FACTION, autonomy: 0, headless: false, expectedPlan: false },
        { name: 'selected player, autonomy 1', playerFaction: FACTION, autonomy: 1, headless: false, expectedPlan: true },
        { name: 'selected player, autonomy 2', playerFaction: FACTION, autonomy: 2, headless: false, expectedPlan: true },
        { name: 'selected player, autonomy 3', playerFaction: FACTION, autonomy: 3, headless: false, expectedPlan: true },
    ] as const;

    for (const row of rows) {
        it(`${row.name} ${row.expectedPlan ? 'receives' : 'retains manual control of'} the campaign plan`, async () => {
            const state = makeEligibleState(row);

            await gatheringStep().run({ state } as never);

            expect(Boolean(state.military.campaign_plans?.[FACTION])).toBe(row.expectedPlan);
            expect(state.military.last_gathering_turn?.[FACTION] ?? null)
                .toBe(row.expectedPlan ? TURN : null);
        });
    }

    it('keeps the established RS, RBiH, HRHB evaluation order for an absent player', async () => {
        const state = makeEligibleState({ playerFaction: null, autonomy: 0, headless: false });

        await gatheringStep().run({ state } as never);

        expect(Object.keys(state.military.campaign_plans ?? {})).toEqual(['RS', 'RBiH', 'HRHB']);
        expect(Object.keys(state.military.last_gathering_turn ?? {})).toEqual(['RS', 'RBiH', 'HRHB']);
    });

    it('makes a delegated plan visible to the real strategy consumer without authorizing a launch', async () => {
        const state = makeEligibleState({ playerFaction: FACTION, autonomy: 1, headless: false });
        const before = structuredClone(state);
        const beforePriorities = getCorpsArmyPriorities(FACTION, 'arbih_1st_corps', TURN, before);

        await gatheringStep().run({ state } as never);

        const afterPriorities = getCorpsArmyPriorities(FACTION, 'arbih_1st_corps', TURN, state);
        expect(afterPriorities).not.toEqual(beforePriorities);
        expect(state.military.corps_command?.arbih_1st_corps?.active_operations).toEqual([]);
        expect(state.military.corps_command?.arbih_2nd_corps?.active_operations).toEqual([]);
        expect(state.military.corps_command?.arbih_1st_corps?.pending_authored_op).toBeUndefined();
        expect(state.military.corps_command?.arbih_1st_corps?.player_op_response).toBeUndefined();
        expect(state.military.corps_command?.arbih_2nd_corps?.pending_authored_op).toBeUndefined();
        expect(state.military.corps_command?.arbih_2nd_corps?.player_op_response).toBeUndefined();
    });

    it('uses a fixture eligible for the real gathering producer', () => {
        const state = makeEligibleState({ playerFaction: FACTION, autonomy: 0, headless: false });

        evaluateArmyHQGathering(state, FACTION, TURN);

        expect(state.military.campaign_plans?.[FACTION]).toBeDefined();
    });
});
