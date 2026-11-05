/**
 * Causally-owed no-choice records at war termination ([025], Red-team B).
 *
 * Operation Neretva '93 fires at t76; its Grabovica/Uzdol record is owed at t77. A peace
 * acceptance at t76 ends play, and no later turn evaluates events (the desktop stops and the
 * pipeline's game_over branch is report-only). The owed record must still be written once, at
 * its t77 date, through the same path the desktop uses before persisting the terminal state.
 */
import { describe, expect, it } from 'vitest';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { fireOwedFollowUpsAtTermination } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import {
    deserializeState,
    serializeState,
    writeOwedTerminationRecords,
} from '../src/desktop/desktop_sim.js';
import { createDefaultPatronRelationship, createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import type { FactionId, GameState } from '../src/state/game_state.js';
import type { CostLedger } from '../src/sim/endgame/cost_ledger.js';

const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];
const PRIOR_FIRED = ['croat_bosniak_war_begins_1993', 'owen_stoltenberg_plan_1993'];

function terminalCandidateState(neretvaFiredTurn: number | null): GameState {
    const capital: Record<string, ReturnType<typeof createEmptyCapital>> = {};
    const patron: Record<string, ReturnType<typeof createDefaultPatronRelationship>> = {};
    for (const faction of FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron[faction] = createDefaultPatronRelationship(faction);
    }
    const fired = neretvaFiredTurn === null ? [...PRIOR_FIRED] : [...PRIOR_FIRED, 'operation_neretva_93_1993'];
    return {
        meta: { turn: 76, phase: 'war', seed: 1, war_start_turn: 0, player_faction: 'RBiH' },
        factions: FACTIONS.map((id) => ({ id })),
        military: {
            formations: {},
            fired_event_ids: fired,
            event_fire_counts: Object.fromEntries(fired.map((id) => [id, 1])),
            event_last_fired_turn: {
                croat_bosniak_war_begins_1993: 49,
                owen_stoltenberg_plan_1993: 70,
                ...(neretvaFiredTurn === null ? {} : { operation_neretva_93_1993: neretvaFiredTurn }),
            },
            negotiation: {
                capital,
                patron_relationships: patron,
                peace_plan_history: [],
                strategic_dimensions: initializeStrategicDimensions(),
            },
            pending_event_decisions: [{
                event_id: 'os_rbih_tactical_acceptance_1993',
                event_title: 'Owen-Stoltenberg Assembly Vote',
                turn_fired: 76,
                faction: 'RBiH',
                response_options: [
                    { id: 'reject_via_assembly', label: 'Assembly rejects', effects: [] },
                    { id: 'accept_for_optics', label: 'Assembly ratifies', effects: [] },
                ],
            }],
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

/** The desktop IPC sequence: resolve the decision, then the save choke point writes owed records. */
function acceptPeaceAtT76(state: GameState): string[] {
    resolveEventDecision(state, 'os_rbih_tactical_acceptance_1993', 'accept_for_optics');
    return writeOwedTerminationRecords(state, process.cwd());
}

describe('owed follow-up records at war termination', () => {
    it('t76 peace acceptance after Neretva writes Grabovica/Uzdol once at t77, and it survives the save', () => {
        const state = terminalCandidateState(76);
        const written = acceptPeaceAtT76(state);

        expect(state.meta.game_over).toBe(true);
        expect(state.meta.turn).toBe(76);
        expect(written).toEqual(['grabovica_uzdol_massacres_1993']);
        expect(state.military.fired_event_ids).toEqual([
            ...PRIOR_FIRED,
            'operation_neretva_93_1993',
            'grabovica_uzdol_massacres_1993',
        ]);
        expect(state.military.event_last_fired_turn?.grabovica_uzdol_massacres_1993).toBe(77);
        expect(state.military.event_fire_counts?.grabovica_uzdol_massacres_1993).toBe(1);
        expect(state.military.negotiation?.capital?.RBiH?.war_crimes_events ?? 0).toBeGreaterThan(0);

        // Actual persistence path: the terminal state is serialized and reloaded.
        const saved = deserializeState(serializeState(state));
        expect(saved.meta.game_over).toBe(true);
        expect(saved.military.fired_event_ids).toContain('grabovica_uzdol_massacres_1993');
        expect(saved.military.event_last_fired_turn?.grabovica_uzdol_massacres_1993).toBe(77);

        // The endgame snapshot frozen by the peace resolution is rebuilt, so the verdict's
        // cost ledger carries the record's war-crimes effect.
        const snapshot = saved.meta.endgame_snapshot;
        expect(snapshot).toBeDefined();
        const ledger = snapshot?.cost_ledger as CostLedger | undefined;
        expect(ledger?.findings.some((finding) => finding.id === 'war_crimes_record_RBiH')).toBe(true);

        // Once only: a repeated write (every later save passes the choke point) owes nothing.
        expect(writeOwedTerminationRecords(state, process.cwd())).toEqual([]);
        expect(state.military.event_fire_counts?.grabovica_uzdol_massacres_1993).toBe(1);
    });

    it('writes nothing when the parent never fired (no attack, no Neretva row)', () => {
        const state = terminalCandidateState(null);
        expect(acceptPeaceAtT76(state)).toEqual([]);
        expect(state.meta.game_over).toBe(true);
        expect(state.military.fired_event_ids).not.toContain('grabovica_uzdol_massacres_1993');
    });

    it('writes nothing while the war continues', () => {
        const live = terminalCandidateState(76);
        expect(fireOwedFollowUpsAtTermination(live, loadEventDefinitions(0), 76)).toEqual([]);
        expect(writeOwedTerminationRecords(live, process.cwd())).toEqual([]);
        expect(live.military.fired_event_ids).not.toContain('grabovica_uzdol_massacres_1993');
    });

    it('never writes open-ended future consequences (Trusina/Sovici-shaped rows)', () => {
        const registry = loadEventDefinitions(0);
        for (const id of ['trusina_killings_1993', 'sovici_doljani_attack_1993']) {
            const row = registry.find((def) => def.id === id);
            expect(row, id).toBeDefined();
            const terminalTurn = (row!.trigger.turn_min ?? 0) - 1;
            const parents = row!.trigger.requires_events ?? [];
            const state = terminalCandidateState(null);
            state.meta.turn = terminalTurn;
            state.meta.game_over = true;
            state.military.fired_event_ids = [...new Set([...(state.military.fired_event_ids ?? []), ...parents])];
            state.military.event_last_fired_turn = Object.fromEntries(parents.map((parent) => [parent, terminalTurn]));
            const fired = fireOwedFollowUpsAtTermination(state, registry, terminalTurn);
            expect(fired.map((event) => event.id)).not.toContain(id);
        }
    });

    it('owes only rows whose prerequisite fired on the terminal turn and whose window opens next turn', () => {
        // Parent fired a turn earlier: the record would have had its own turn; nothing is owed.
        const stale = terminalCandidateState(75);
        stale.meta.game_over = true;
        expect(fireOwedFollowUpsAtTermination(stale, loadEventDefinitions(0), 76)).toEqual([]);

        // Against the full catalog, the terminal t76 state owes exactly the one record.
        const state = terminalCandidateState(76);
        state.meta.game_over = true;
        const before = [...(state.military.fired_event_ids ?? [])];
        const fired = fireOwedFollowUpsAtTermination(state, loadEventDefinitions(0), 76);
        expect(fired.map((event) => event.id)).toEqual(['grabovica_uzdol_massacres_1993']);
        expect(state.military.fired_event_ids).toEqual([...before, 'grabovica_uzdol_massacres_1993']);
        expect(state.military.pending_event_decisions?.map((decision) => decision.event_id))
            .toEqual(['os_rbih_tactical_acceptance_1993']);
    });
});
