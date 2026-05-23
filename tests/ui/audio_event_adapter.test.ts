import { describe, expect, it } from 'vitest';
import { buildAudioCueEventsForState } from '../../src/ui/map/audio/audio_event_adapter.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
    return {
        turn: 12,
        battles: [],
        territory_net: {},
        notable_flips: [],
        displacement_total: 0,
        displacement_by_ethnicity: {},
        decoration_awards: [],
        arc_transitions: [],
        formation_spawns: [],
        formation_destructions: [],
        supply_deltas: {},
        heavy_munitions_deltas: {},
        movements: [],
        supply_transitions: [],
        events_fired: [],
        notable_events: [],
        ...overrides,
    };
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    const latestTurnSummary = overrides.latestTurnSummary === undefined
        ? null
        : overrides.latestTurnSummary;
    return {
        label: 'Turn 12',
        turn: 12,
        phase: 'war',
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary,
        turnSummaries: latestTurnSummary ? [latestTurnSummary] : [],
        player_faction: 'RBiH',
        ...overrides,
    } as LoadedGameState;
}

describe('audio event adapter', () => {
    it('emits stable cue requests for a newly observed completed turn', () => {
        const previous = makeState({ latestTurnSummary: makeSummary({ turn: 11 }) });
        const next = makeState({
            latestTurnSummary: makeSummary({
                turn: 12,
                battles: [{
                    osid: 'brcko',
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH',
                    primary_attacker_id: 'rs_1',
                    primary_defender_id: 'rbih_1',
                    all_attacker_ids: ['rs_1'],
                    outcome: 'victory',
                    attacker_casualties: 12,
                    defender_casualties: 30,
                    territory_flipped: true,
                    was_concentrated: false,
                }],
                events_fired: [{ id: 'washington_agreement', text: 'Washington Agreement signed.' }],
            }),
            operationHistory: [{
                operation_id: 'op_12',
                operation_name: 'Operation Example',
                corps_id: 'arbih_1st_corps',
                faction: 'RBiH',
                started_turn: 10,
                ended_turn: 12,
                outcome: 'partial_success',
                objectives_targeted: ['brcko'],
                objectives_captured: ['brcko'],
                total_attacks: 3,
                casualties_suffered: { killed: 1, wounded: 2 },
                casualties_inflicted: { killed: 3, wounded: 4 },
                equipment_lost: { tanks: 0, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 0 },
                equipment_captured: { tanks: 0, artillery: 0 },
                grade: { stars: 2, verdict: 'partial', factors: {} },
                duration_turns: 2,
                weekly_log: [],
            }],
        });

        expect(buildAudioCueEventsForState(previous, next)).toEqual([
            { key: 'turn:12:complete', cueId: 'turn_complete', reason: 'turn_completed' },
            { key: 'turn:12:battle:decisive', cueId: 'battle_decisive', reason: 'battle_territory_flipped' },
            { key: 'turn:12:event:washington_agreement', cueId: 'event_notification', reason: 'historical_event_fired' },
            { key: 'turn:12:operation:op_12', cueId: 'operation_complete', reason: 'operation_completed' },
        ]);
    });

    it('does not re-emit cues for the same observed turn', () => {
        const summary = makeSummary({ turn: 12, events_fired: [{ id: 'event_alpha', text: 'Alpha.' }] });
        const state = makeState({ latestTurnSummary: summary });

        expect(buildAudioCueEventsForState(state, state)).toEqual([]);
    });
});
