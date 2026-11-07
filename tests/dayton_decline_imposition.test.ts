/**
 * Dayton decline and imposition (owner, 2026-11-07): a player who declines Dayton gets
 * four more weeks of war; then the faction's coercion event fires and the historical
 * settlement is imposed (RBiH: United States; RS: Belgrade; HRHB: Zagreb).
 */
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import {
    DAYTON_COERCING_POWER,
    DAYTON_DECLINE_GRACE_WEEKS,
    DAYTON_IMPOSITION_DUE_FLAG,
    declineDaytonNegotiation,
    enforceDaytonImposition,
    initiateDaytonNegotiation,
} from '../src/sim/negotiation/dayton_negotiation.js';
import { warPhaseNegotiationSteps } from '../src/sim/turn_phases/war_phase_negotiation_steps.js';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';

function makeState(player: 'RBiH' | 'RS' | 'HRHB', turn = 188): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        capital[faction] = { ...createEmptyCapital(), territory_controlled_pct: 30 };
        patron_relationships[faction] = {
            patron_id: 'international_community', support_level: 50, override_authority: 10,
            sanctions_active: false, relationship_events: [],
        };
    }
    const state = {
        meta: { turn, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-09', game_over: false, player_faction: player },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() },
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
    state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state) as never;
    return state;
}

const runStep = (name: string, state: GameState) => {
    const step = warPhaseNegotiationSteps.find((s) => s.name === name);
    if (!step) throw new Error(`missing step ${name}`);
    return step.run({ state } as never);
};

describe('declineDaytonNegotiation', () => {
    it('withdraws the menu and schedules imposition four weeks out', () => {
        const state = makeState('RBiH');
        const r = declineDaytonNegotiation(state);
        expect(DAYTON_DECLINE_GRACE_WEEKS).toBe(4);
        expect(r).toEqual({ ok: true, imposition_turn: 192 });
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
        expect(state.military.negotiation!.dayton_decline).toEqual({ faction: 'RBiH', declined_turn: 188, imposition_turn: 192 });
        expect(state.meta.game_over).toBe(false);
    });

    it('refuses when there is nothing to decline', () => {
        const state = makeState('RBiH');
        delete state.military.negotiation!.pending_dayton;
        expect(declineDaytonNegotiation(state).ok).toBe(false);
        const over = makeState('RBiH');
        over.meta.game_over = true;
        expect(declineDaytonNegotiation(over).ok).toBe(false);
    });

    it('is not re-offered while the decline stands', async () => {
        const state = makeState('RBiH');
        declineDaytonNegotiation(state);
        state.meta.turn = 189;
        await runStep('evaluate-dayton-trigger', state);
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
    });
});

describe('enforceDaytonImposition', () => {
    for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
        it(`${faction}: war continues four weeks, then ${DAYTON_COERCING_POWER[faction]} imposes the settlement`, () => {
            const state = makeState(faction);
            declineDaytonNegotiation(state);
            for (const turn of [189, 190]) {
                state.meta.turn = turn;
                expect(enforceDaytonImposition(state)).toBeNull();
                expect(state.military.event_flags?.[DAYTON_IMPOSITION_DUE_FLAG]).toBeUndefined();
            }
            state.meta.turn = 191; // the turn before imposition raises the event flag
            expect(enforceDaytonImposition(state)).toBeNull();
            expect(state.military.event_flags?.[DAYTON_IMPOSITION_DUE_FLAG]).toBe(faction);
            expect(state.meta.game_over).toBe(false);
            state.meta.turn = 192;
            const result = enforceDaytonImposition(state);
            expect(result?.imposed).toEqual({ on_faction: faction, by: DAYTON_COERCING_POWER[faction], turn: 192 });
            expect(state.military.negotiation!.dayton_result?.imposed?.by).toBe(DAYTON_COERCING_POWER[faction]);
            expect(state.meta.game_over).toBe(true);
            expect(state.meta.outcome).toBe('dayton');
        });
    }

    it('is a no-op without a decline (headless and signed games)', () => {
        const state = makeState('RBiH');
        state.meta.turn = 200;
        expect(enforceDaytonImposition(state)).toBeNull();
        expect(state.meta.game_over).toBe(false);
        expect(state.military.event_flags).toBeUndefined();
    });
});

describe('coercion events', () => {
    const defs = loadEventDefinitionsFromDir(0, resolve(process.cwd(), 'data/scenarios/events'));
    const ids = {
        RBiH: 'us_forces_dayton_rbih_1995',
        RS: 'belgrade_signs_dayton_for_rs_1995',
        HRHB: 'zagreb_signs_dayton_for_hrhb_1995',
    } as const;

    it('load through the event loader and are marked counterfactual', () => {
        for (const id of Object.values(ids)) {
            const def = defs.find((d) => d.id === id);
            expect(def, id).toBeDefined();
            expect(def!.source_tier).toBe('design_counterfactual');
            expect(def!.once).toBe(true);
        }
    });

    it('fire only for the declining faction once the imposition flag is raised', () => {
        for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
            const state = makeState(faction, 192);
            const without = Object.values(ids).map((id) => evaluateCondition(defs.find((d) => d.id === id)!.trigger.condition!, state));
            expect(without).toEqual([false, false, false]);
            state.military.event_flags = { [DAYTON_IMPOSITION_DUE_FLAG]: faction };
            for (const [f, id] of Object.entries(ids)) {
                expect(evaluateCondition(defs.find((d) => d.id === id)!.trigger.condition!, state), `${faction} -> ${id}`).toBe(f === faction);
            }
        }
    });
});
