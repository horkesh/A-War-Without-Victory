/**
 * v0.4.1 Phase 2: Event Decision tests.
 * - Decision event adds to pending list for player faction
 * - Bot auto-responds with accept_first / reject_all
 * - resolveEventDecision applies effects and removes pending
 * Tests pass event definitions via the registry parameter (no global mutation).
 */

import { afterEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { GameState } from '../src/state/game_state';
import type { EventDefinition } from '../src/sim/events/event_types';
import { resolveEventDecision } from '../src/sim/events/resolve_decision';
import { evaluateEvents } from '../src/sim/events/evaluate_events';
import { updateEventReadiness } from '../src/sim/events/pressure_system';

const ORIGINAL_TWO_LEVEL_FLAG = process.env.AWWV_TWO_LEVEL_NOTIFICATIONS;

afterEach(() => {
    if (ORIGINAL_TWO_LEVEL_FLAG === undefined) delete process.env.AWWV_TWO_LEVEL_NOTIFICATIONS;
    else process.env.AWWV_TWO_LEVEL_NOTIFICATIONS = ORIGINAL_TWO_LEVEL_FLAG;
});

function makeMinimalState(playerFaction?: string): GameState {
    return {
        schema_version: 1,
        factions: { RBiH: {} as any, RS: {} as any, HRHB: {} as any },
        meta: { turn: 5, phase: 'war', player_faction: playerFaction } as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {} as any,
            front_posture_regions: {} as any,
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 },
        },
        political: {} as any,
        displacement: {} as any,
        economic: {} as any,
    } as unknown as GameState;
}

function loadLukavacEvent(): EventDefinition {
    const events = JSON.parse(readFileSync('data/scenarios/events/war_1993.json', 'utf8')) as EventDefinition[];
    const lukavac = events.find((event) => event.id === 'operation_lukavac_93');
    if (!lukavac) throw new Error('operation_lukavac_93 fixture not found');
    return lukavac;
}

function loadEventFromFile(file: string, eventId: string): EventDefinition {
    const events = JSON.parse(readFileSync(file, 'utf8')) as EventDefinition[];
    const event = events.find((entry) => entry.id === eventId);
    if (!event) throw new Error(`${eventId} fixture not found`);
    return event;
}

function makeLukavacReadyState(): GameState {
    const state = makeMinimalState('RS');
    state.meta.turn = 65;
    state.military.event_flags = { sarajevo_siege_active: true };
    state.military.event_readiness = {};
    state.political = {
        political_controllers: {
            'op:trnovo:trnovo_2': 'RS',
            'op:trnovo:dejcici': 'RBiH',
            'op:hadzici:lokve': 'RS',
            'op:hadzici:pazaric': 'RS',
            'op:hadzici:tarcin_2': 'RS',
        },
    } as any;
    return state;
}

const DECISION_EVENT: EventDefinition = {
    id: 'test_decision_event',
    trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
    effect: { kind: 'narrative', text: 'A diplomatic proposal arrives.' },
    once: true,
    responding_faction: 'RBiH',
    requires_player_response: true,
    bot_response_logic: 'accept_first',
    response_options: [
        {
            id: 'accept',
            label: 'Accept the proposal',
            description: 'Improves supply situation.',
            effects: [{ kind: 'supply_delta', faction: 'RBiH', delta: 10 }],
        },
        {
            id: 'reject',
            label: 'Reject the proposal',
            description: 'Maintains current position.',
            effects: [{ kind: 'morale_change', faction: 'RBiH', delta: -5 }],
        },
    ],
};

const EXPLICIT_HISTORICAL_EVENT: EventDefinition = {
    id: 'test_explicit_historical_event',
    title: 'Explicit historical default test',
    trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
    effect: { kind: 'narrative', text: 'A choice with a non-first historical default fires.' },
    once: true,
    responding_faction: 'RBiH',
    requires_player_response: true,
    bot_response_logic: 'historical',
    historical_default_response_id: 'historical_path',
    response_options: [
        {
            id: 'counterfactual_path',
            label: 'Counterfactual path',
            historical_marker: 'counterfactual',
            effects: [{ kind: 'supply_delta', faction: 'RBiH', delta: -7 }],
        },
        {
            id: 'historical_path',
            label: 'Historical path',
            historical_marker: 'historical_default',
            effects: [{ kind: 'supply_delta', faction: 'RBiH', delta: 13 }],
        },
    ],
};

const REJECT_ALL_EVENT: EventDefinition = {
    id: 'test_reject_event',
    trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
    effect: { kind: 'narrative', text: 'A ceasefire is proposed.' },
    once: true,
    bot_response_logic: 'reject_all',
    response_options: [
        {
            id: 'accept',
            label: 'Accept ceasefire',
            effects: [{ kind: 'supply_delta', faction: 'RS', delta: 5 }],
        },
        {
            id: 'reject',
            label: 'Reject ceasefire',
            effects: [{ kind: 'supply_delta', faction: 'RS', delta: -5 }],
        },
    ],
};

const RS_REQUIRED_EVENT: EventDefinition = {
    id: 'test_rs_required_event',
    trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
    effect: { kind: 'narrative', text: 'Pale receives an ultimatum.' },
    once: true,
    responding_faction: 'RS',
    requires_player_response: true,
    bot_response_logic: 'accept_first',
    response_options: [
        {
            id: 'comply',
            label: 'Comply',
            effects: [{ kind: 'supply_delta', faction: 'RS', delta: 5 }],
        },
        {
            id: 'defy',
            label: 'Defy',
            effects: [{ kind: 'supply_delta', faction: 'RS', delta: -5 }],
        },
    ],
};

describe('Event Decisions', () => {
    it('decision event adds to pending list for player faction', () => {
        const state = makeMinimalState('RBiH');
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [DECISION_EVENT]);

        expect(state.military.pending_event_decisions).toBeDefined();
        expect(state.military.pending_event_decisions!.length).toBe(1);
        const pending = state.military.pending_event_decisions![0];
        expect(pending.event_id).toBe('test_decision_event');
        expect(pending.faction).toBe('RBiH');
        expect(pending.response_options.length).toBe(2);
        expect(pending.turn_fired).toBe(5);
    });

    it('bot auto-responds once with accept_first (no player faction)', () => {
        // No player faction — bot auto-responds once (not per-faction)
        const state = makeMinimalState(undefined);
        const initialSupply = state.military.general_supply_reserve!['RBiH'];
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [DECISION_EVENT]);

        // Bot responds once → +10 supply to RBiH (not ×3)
        expect(state.military.general_supply_reserve!['RBiH']).toBe(initialSupply + 10);
        // No pending decisions (no player faction)
        expect(state.military.pending_event_decisions ?? []).toHaveLength(0);
    });

    it('bot historical logic chooses explicit historical_default_response_id instead of option 0', () => {
        const state = makeMinimalState(undefined);
        const initialSupply = state.military.general_supply_reserve!['RBiH'];
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [EXPLICIT_HISTORICAL_EVENT]);

        expect(state.military.general_supply_reserve!['RBiH']).toBe(initialSupply + 13);
        expect(state.military.event_decision_log).toEqual([
            {
                event_id: 'test_explicit_historical_event',
                response_id: 'historical_path',
                decision_source: 'bot_v1',
                faction: 'RBiH',
                turn: 5,
            },
        ]);
    });

    it('accept_first preserves option 0 even when an explicit historical default points elsewhere', () => {
        const state = makeMinimalState(undefined);
        const initialSupply = state.military.general_supply_reserve!['RBiH'];
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [
            {
                ...EXPLICIT_HISTORICAL_EVENT,
                id: 'test_accept_first_conflict_event',
                bot_response_logic: 'accept_first',
            },
        ]);

        expect(state.military.general_supply_reserve!['RBiH']).toBe(initialSupply - 7);
        expect(state.military.event_decision_log?.[0]?.response_id).toBe('counterfactual_path');
    });

    it('two-level bot default keeps accept_first on option 0 when explicit historical default points to option 2', () => {
        process.env.AWWV_TWO_LEVEL_NOTIFICATIONS = 'true';
        const state = makeMinimalState(undefined);
        const initialSupply = state.military.general_supply_reserve!['RBiH'];
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [
            {
                ...EXPLICIT_HISTORICAL_EVENT,
                id: 'test_two_level_accept_first_conflict_event',
                bot_response_logic: 'accept_first',
                historical_default_response_id: 'historical_option_2',
                response_options: [
                    {
                        id: 'option_0',
                        label: 'Option 0',
                        historical_marker: 'counterfactual',
                        effects: [{ kind: 'supply_delta', faction: 'RBiH', delta: -7 }],
                    },
                    {
                        id: 'option_1',
                        label: 'Option 1',
                        historical_marker: 'counterfactual',
                        effects: [{ kind: 'supply_delta', faction: 'RBiH', delta: 3 }],
                    },
                    {
                        id: 'historical_option_2',
                        label: 'Historical option 2',
                        historical_marker: 'historical_default',
                        effects: [{ kind: 'supply_delta', faction: 'RBiH', delta: 13 }],
                    },
                ],
            },
        ]);

        expect(state.military.general_supply_reserve!['RBiH']).toBe(initialSupply - 7);
        expect(state.military.event_decision_log).toEqual([
            {
                event_id: 'test_two_level_accept_first_conflict_event',
                response_id: 'option_0',
                decision_source: 'bot_ai_default',
                faction: 'RBiH',
                turn: 5,
            },
        ]);
    });

    it('bot auto-responds once with reject_all (picks last option)', () => {
        const state = makeMinimalState(undefined);
        const initialSupply = state.military.general_supply_reserve!['RS'];
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [REJECT_ALL_EVENT]);

        // Bot responds once → -5 supply to RS (not ×3)
        expect(state.military.general_supply_reserve!['RS']).toBe(initialSupply - 5);
    });

    it('queues required decisions only for the responding faction', () => {
        const rbihState = makeMinimalState('RBiH');
        const rsState = makeMinimalState('RS');
        const rng = () => 0.5;

        evaluateEvents(rbihState, rng, 5, [RS_REQUIRED_EVENT]);
        evaluateEvents(rsState, rng, 5, [RS_REQUIRED_EVENT]);

        expect(rbihState.military.pending_event_decisions ?? []).toHaveLength(0);
        expect(rsState.military.pending_event_decisions).toHaveLength(1);
        expect(rsState.military.pending_event_decisions![0]).toMatchObject({
            event_id: 'test_rs_required_event',
            faction: 'RS',
            requires_player_response: true,
        });
    });

    it('queues Lukavac for the RS player when readiness and runtime gates are open', () => {
        const lukavac = loadLukavacEvent();
        const state = makeLukavacReadyState();

        updateEventReadiness(state, [lukavac]);
        expect(state.military.event_readiness?.operation_lukavac_93).toBeGreaterThan(lukavac.pressure!.threshold);

        const report = evaluateEvents(state, () => 0, 65, [lukavac]);

        expect(report.fired).toEqual([{ id: 'operation_lukavac_93', text: lukavac.title }]);
        expect(state.military.pending_event_decisions).toHaveLength(1);
        expect(state.military.pending_event_decisions![0]).toMatchObject({
            event_id: 'operation_lukavac_93',
            event_title: lukavac.title,
            faction: 'RS',
            requires_player_response: true,
        });
        expect(state.military.fired_event_ids).toContain('operation_lukavac_93');
        expect(state.military.event_readiness?.operation_lukavac_93).toBe(0);
    });

    it('does not queue Lukavac when the Sarajevo siege gate closes after readiness crosses threshold', () => {
        const lukavac = loadLukavacEvent();
        const state = makeLukavacReadyState();

        updateEventReadiness(state, [lukavac]);
        expect(state.military.event_readiness?.operation_lukavac_93).toBe(4);

        state.military.event_flags = { sarajevo_siege_active: false };
        updateEventReadiness(state, [lukavac]);
        expect(state.military.event_readiness?.operation_lukavac_93).toBe(3);

        const report = evaluateEvents(state, () => 0, 65, [lukavac]);

        expect(report.fired.map((event) => event.id)).not.toContain('operation_lukavac_93');
        expect(state.military.pending_event_decisions ?? []).toHaveLength(0);
        expect(state.military.fired_event_ids ?? []).not.toContain('operation_lukavac_93');
    });

    it('does not queue Lukavac when the Trnovo gate closes after readiness crosses threshold', () => {
        const lukavac = loadLukavacEvent();
        const state = makeLukavacReadyState();

        updateEventReadiness(state, [lukavac]);
        expect(state.military.event_readiness?.operation_lukavac_93).toBe(4);

        state.political.political_controllers = {
            ...state.political.political_controllers,
            'op:trnovo:trnovo_2': 'RBiH',
        };
        updateEventReadiness(state, [lukavac]);
        expect(state.military.event_readiness?.operation_lukavac_93).toBe(3);

        const report = evaluateEvents(state, () => 0, 65, [lukavac]);

        expect(report.fired.map((event) => event.id)).not.toContain('operation_lukavac_93');
        expect(state.military.pending_event_decisions ?? []).toHaveLength(0);
        expect(state.military.fired_event_ids ?? []).not.toContain('operation_lukavac_93');
    });

    it('pending event decisions carry historical and staff recommendation metadata for modal marking', () => {
        const state = makeMinimalState('RBiH');
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [{
            ...EXPLICIT_HISTORICAL_EVENT,
            staff_recommended_response_id: 'counterfactual_path',
        }]);

        const pending = state.military.pending_event_decisions![0];
        expect(pending.historical_default_response_id).toBe('historical_path');
        expect(pending.staff_recommended_response_id).toBe('counterfactual_path');
        expect(pending.response_options.map((option) => [option.id, option.historical_marker])).toEqual([
            ['counterfactual_path', 'counterfactual'],
            ['historical_path', 'historical_default'],
        ]);
    });

    it('real RBiH visit-to-front row queues with staff recommendation but no historical default', () => {
        const event = {
            ...loadEventFromFile('data/scenarios/events/war_1993.json', 'visit_to_front_rbih'),
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' as const },
            pressure: undefined,
        };
        const state = makeMinimalState('RBiH');

        evaluateEvents(state, () => 0, 5, [event]);

        const pending = state.military.pending_event_decisions![0];
        expect(pending.event_id).toBe('visit_to_front_rbih');
        expect(pending.staff_recommended_response_id).toBe('stay_capital_rbih');
        expect(pending.historical_default_response_id).toBeUndefined();
        expect(pending.response_options.map((option) => option.id)).toContain('stay_capital_rbih');
    });

    it('pending event decisions carry authored dossier fields from real evaluation output', () => {
        const state = makeMinimalState('RBiH');
        const rng = () => 0.5;

        evaluateEvents(state, rng, 5, [
            {
                ...DECISION_EVENT,
                id: 'test_authored_dossier_event',
                title: 'Authored Dossier Event',
                narrative: 'Authored player-facing narrative for the modal dossier.',
                category: 'diplomatic',
                historical_source: 'Synthetic historical packet',
                source_note: 'Synthetic source note',
                source: 'Synthetic source field',
                staff_assessment: 'Staff assesses this as a player-facing policy choice.',
                trigger_evidence: ['Ceasefire talks opened', 'Cabinet requested a response'],
            },
        ]);

        const pending = state.military.pending_event_decisions![0];
        expect(pending).toMatchObject({
            event_id: 'test_authored_dossier_event',
            event_title: 'Authored Dossier Event',
            narrative: 'Authored player-facing narrative for the modal dossier.',
            category: 'diplomatic',
            historical_source: 'Synthetic historical packet',
            source_note: 'Synthetic source note',
            source: 'Synthetic source field',
            staff_assessment: 'Staff assesses this as a player-facing policy choice.',
            trigger_evidence: ['Ceasefire talks opened', 'Cabinet requested a response'],
        });
        expect('rationale' in pending).toBe(false);
    });

    it('packet 3 authored rows expose historical defaults and dossier fields for modal decisions', () => {
        const fixtures = [
            loadEventFromFile('data/scenarios/events/war_1993.json', 'operation_lukavac_93'),
            loadEventFromFile('data/scenarios/events/war_1993.json', 'os_rbih_tactical_acceptance_1993'),
            loadEventFromFile('data/scenarios/events/consequences.json', 'csq_patron_recovery_offer'),
        ];

        expect(fixtures.map((event) => [event.id, event.bot_response_logic, event.historical_default_response_id])).toEqual([
            ['operation_lukavac_93', 'historical', 'comply'],
            ['os_rbih_tactical_acceptance_1993', 'historical', 'reject_via_assembly'],
            ['csq_patron_recovery_offer', 'historical', 'accept_recovery'],
        ]);

        for (const event of fixtures) {
            const options = event.response_options ?? [];
            expect(typeof event.source_note, event.id).toBe('string');
            expect(typeof event.staff_assessment, event.id).toBe('string');
            expect(event.trigger_evidence, event.id).toEqual(expect.arrayContaining([expect.any(String)]));
            expect(options.filter((option) => option.historical_marker === 'historical_default').map((option) => option.id), event.id)
                .toEqual([event.historical_default_response_id]);
            expect(options.every((option) => typeof option.description === 'string'), event.id).toBe(true);
            expect(options.every((option) => typeof option.risk_level === 'number' || typeof option.aggression_affinity === 'number'), event.id).toBe(true);
        }
    });

    it('diplomatic packet rows expose historical defaults and dossier fields for modal decisions', () => {
        const fixtures = [
            loadEventFromFile('data/scenarios/events/war_1994.json', 'hrhb_washington_agreement_1994'),
            loadEventFromFile('data/scenarios/events/war_1994.json', 'contact_group_plan_1994'),
            loadEventFromFile('data/scenarios/events/war_1995.json', 'dayton_talks_begin_1995'),
        ];

        expect(fixtures.map((event) => [event.id, event.bot_response_logic, event.historical_default_response_id])).toEqual([
            ['hrhb_washington_agreement_1994', 'historical', 'accept'],
            ['contact_group_plan_1994', 'historical', 'accept'],
            ['dayton_talks_begin_1995', 'historical', 'accept'],
        ]);

        for (const event of fixtures) {
            const options = event.response_options ?? [];
            expect(typeof event.historical_source, event.id).toBe('string');
            expect(typeof event.source_note, event.id).toBe('string');
            expect(typeof event.staff_assessment, event.id).toBe('string');
            expect(event.trigger_evidence, event.id).toEqual(expect.arrayContaining([expect.any(String)]));
            expect(options[0]?.id, event.id).toBe(event.historical_default_response_id);
            expect(options.filter((option) => option.historical_marker === 'historical_default').map((option) => option.id), event.id)
                .toEqual([event.historical_default_response_id]);
            expect(options.every((option) => typeof option.description === 'string'), event.id).toBe(true);
            expect(options.every((option) => typeof option.risk_level === 'number' || typeof option.aggression_affinity === 'number'), event.id).toBe(true);
        }
    });

    it('1993 required-response packet rows expose historical defaults and dossier fields for modal decisions', () => {
        const fixtures = [
            loadEventFromFile('data/scenarios/events/war_1993.json', 'gornji_vakuf_clashes_1993'),
            loadEventFromFile('data/scenarios/events/war_1993.json', 'ic_pressure_vopp_engagement'),
            loadEventFromFile('data/scenarios/events/war_1993.json', 'vance_owen_plan_1993'),
            loadEventFromFile('data/scenarios/events/war_1993.json', 'strategic_posture_review_hrhb'),
        ];

        expect(fixtures.map((event) => [event.id, event.bot_response_logic, event.historical_default_response_id])).toEqual([
            ['gornji_vakuf_clashes_1993', 'historical', 'escalate'],
            ['ic_pressure_vopp_engagement', 'historical', 'acknowledge_pressure'],
            ['vance_owen_plan_1993', 'historical', 'accept'],
            ['strategic_posture_review_hrhb', 'historical', 'press_croat_objectives'],
        ]);

        for (const event of fixtures) {
            const options = event.response_options ?? [];
            expect(typeof event.historical_source, event.id).toBe('string');
            expect(typeof event.source_note, event.id).toBe('string');
            expect(typeof event.staff_assessment, event.id).toBe('string');
            expect(event.trigger_evidence, event.id).toEqual(expect.arrayContaining([expect.any(String)]));
            expect(options[0]?.id, event.id).toBe(event.historical_default_response_id);
            expect(options.filter((option) => option.historical_marker === 'historical_default').map((option) => option.id), event.id)
                .toEqual([event.historical_default_response_id]);
            expect(options.every((option) => typeof option.description === 'string'), event.id).toBe(true);
            expect(options.every((option) => typeof option.risk_level === 'number' && typeof option.aggression_affinity === 'number'), event.id).toBe(true);
        }
    });

    it('resolveEventDecision applies effects and removes pending', () => {
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'test_decision_event',
                event_title: 'A diplomatic proposal arrives.',
                turn_fired: 5,
                faction: 'RBiH',
                response_options: DECISION_EVENT.response_options!,
            },
        ];
        const initialSupply = state.military.general_supply_reserve!['RBiH'];

        resolveEventDecision(state, 'test_decision_event', 'accept');

        expect(state.military.general_supply_reserve!['RBiH']).toBe(initialSupply + 10);
        expect(state.military.pending_event_decisions!.length).toBe(0);
    });

    it('resolveEventDecision throws on unknown event_id', () => {
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [];

        expect(() => resolveEventDecision(state, 'nonexistent', 'accept')).toThrow('No pending decision');
    });

    it('resolveEventDecision applies sets_flags from chosen response', () => {
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'test_flag_event',
                event_title: 'Strategic Goals',
                turn_fired: 5,
                faction: 'RS',
                response_options: [
                    {
                        id: 'maximalist',
                        label: 'Full territorial goals',
                        effects: [{ kind: 'narrative', text: 'Maximalist path chosen.' }],
                        sets_flags: { rs_strategic_goals: 'maximalist', test_flag: true },
                    },
                    {
                        id: 'selective',
                        label: 'Selective goals',
                        effects: [{ kind: 'narrative', text: 'Selective path chosen.' }],
                        sets_flags: { rs_strategic_goals: 'selective' },
                    },
                ],
            },
        ];

        resolveEventDecision(state, 'test_flag_event', 'selective');

        expect(state.military.event_flags).toBeDefined();
        expect(state.military.event_flags!['rs_strategic_goals']).toBe('selective');
        // 'test_flag' should NOT be set (it's on the other option)
        expect(state.military.event_flags!['test_flag']).toBeUndefined();
    });

    it.each([
        ['RS', 'rs_paramilitary_policy', 'always_allow'],
        ['RBiH', 'rbih_paramilitary_policy', 'always_deny'],
    ] as const)(
        'resolveEventDecision synchronizes the %s player paramilitary policy carrier',
        (faction, flag, policy) => {
            const state = makeMinimalState(faction);
            state.paramilitary_policy = 'ask';
            state.military.pending_event_decisions = [
                {
                    event_id: `${faction}_paramilitary_policy_test`,
                    event_title: 'Paramilitary Authorization Policy',
                    turn_fired: 5,
                    faction,
                    response_options: [
                        {
                            id: policy,
                            label: policy,
                            effects: [],
                            sets_flags: { [flag]: policy },
                        },
                    ],
                },
            ];

            resolveEventDecision(state, `${faction}_paramilitary_policy_test`, policy);

            expect(state.military.event_flags?.[flag]).toBe(policy);
            expect(state.paramilitary_policy).toBe(policy);
        },
    );

    it('does not let another faction paramilitary policy overwrite the loaded player policy', () => {
        const state = makeMinimalState('RBiH');
        state.paramilitary_policy = 'ask';
        state.military.pending_event_decisions = [
            {
                event_id: 'rs_paramilitary_policy_test',
                event_title: 'Paramilitary Authorization Policy',
                turn_fired: 5,
                faction: 'RS',
                response_options: [
                    {
                        id: 'always_allow',
                        label: 'Always allow',
                        effects: [],
                        sets_flags: { rs_paramilitary_policy: 'always_allow' },
                    },
                ],
            },
        ];

        resolveEventDecision(state, 'rs_paramilitary_policy_test', 'always_allow');

        expect(state.military.event_flags?.rs_paramilitary_policy).toBe('always_allow');
        expect(state.paramilitary_policy).toBe('ask');
    });

    it('resolveEventDecision applies dimension_shifts from chosen response', () => {
        const state = makeMinimalState('RBiH');
        // Set up minimal negotiation/dimension state
        state.military.negotiation = {
            strategic_dimensions: {
                RBiH: { military_credibility: { base_value: 50, event_modifier: 0 } },
                RS: { military_credibility: { base_value: 50, event_modifier: 0 } },
                HRHB: { military_credibility: { base_value: 50, event_modifier: 0 } },
            },
        } as any;
        state.military.pending_event_decisions = [
            {
                event_id: 'test_dim_event',
                event_title: 'Dimension Test',
                turn_fired: 5,
                faction: 'RBiH',
                response_options: [
                    {
                        id: 'bold',
                        label: 'Bold move',
                        effects: [],
                        dimension_shifts: [{ faction: 'RBiH', dimension: 'military_credibility', delta: 10 }],
                    },
                ],
            },
        ];

        resolveEventDecision(state, 'test_dim_event', 'bold');

        const dims = state.military.negotiation!.strategic_dimensions as any;
        expect(dims.RBiH.military_credibility.event_modifier).toBe(10);
    });

    it('resolveEventDecision throws on unknown response_id', () => {
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'test_decision_event',
                event_title: 'Test',
                turn_fired: 5,
                faction: 'RBiH',
                response_options: DECISION_EVENT.response_options!,
            },
        ];

        expect(() => resolveEventDecision(state, 'test_decision_event', 'nonexistent')).toThrow('No response option');
    });

    // ── A3 dead-bridge pin ────────────────────────────────────────────────
    // The peace-plan acceptances must SET the codex/ghost flags
    // (`vance_owen_accepted` / `owen_stoltenberg_accepted`) that the
    // early_peace_accepted / negotiation_capital_exhausted ghost predicates read.
    // Before this fix the accept branches carried `effects` but no `sets_flags`,
    // so the codex ghost layer could never see the acceptance (the "dead bridge"
    // in docs/40_reports/playtest/20260609_INSTRUMENTED_CAMPAIGN_AUDIT.md §A3).
    // These flags feed ONLY the codex read-model — no sim/calibration consumer.
    it('A3: vance_owen_plan_1993 accept sets vance_owen_accepted flag', () => {
        const event = loadEventFromFile('data/scenarios/events/war_1993.json', 'vance_owen_plan_1993');
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'vance_owen_plan_1993',
                event_title: event.title ?? 'Vance-Owen',
                turn_fired: 39,
                faction: 'RBiH',
                response_options: event.response_options!,
            },
        ];

        resolveEventDecision(state, 'vance_owen_plan_1993', 'accept');

        expect(state.military.event_flags).toBeDefined();
        expect(state.military.event_flags!['vance_owen_accepted']).toBe(true);
    });

    it('A3: owen_stoltenberg_plan_1993 accept sets owen_stoltenberg_accepted flag', () => {
        const event = loadEventFromFile('data/scenarios/events/war_1993.json', 'owen_stoltenberg_plan_1993');
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'owen_stoltenberg_plan_1993',
                event_title: event.title ?? 'Owen-Stoltenberg',
                turn_fired: 70,
                faction: 'RBiH',
                response_options: event.response_options!,
            },
        ];

        resolveEventDecision(state, 'owen_stoltenberg_plan_1993', 'accept');

        expect(state.military.event_flags).toBeDefined();
        expect(state.military.event_flags!['owen_stoltenberg_accepted']).toBe(true);
    });

    it('models Owen-Stoltenberg as conditional Presidency acceptance followed by an Assembly vote', () => {
        const presidency = loadEventFromFile('data/scenarios/events/war_1993.json', 'owen_stoltenberg_plan_1993');
        const assembly = loadEventFromFile('data/scenarios/events/war_1993.json', 'os_rbih_tactical_acceptance_1993');
        const presidencyAccept = presidency.response_options?.find((option) => option.id === 'accept');
        const presidencyReject = presidency.response_options?.find((option) => option.id === 'reject');
        const assemblyCondition = assembly.trigger.condition as {
            type?: string;
            conditions?: Array<{ type?: string; flag?: string; value?: unknown }>;
        };

        expect(presidency.historical_default_response_id).toBe('accept');
        expect(presidencyAccept?.historical_marker).toBe('historical_default');
        expect(presidencyReject?.historical_marker).toBe('counterfactual');
        expect(presidency.source_note).toContain('Presidency');
        expect(assemblyCondition.type).toBe('and');
        expect(assemblyCondition.conditions).toContainEqual(expect.objectContaining({
            type: 'flag_equals',
            flag: 'owen_stoltenberg_accepted',
            value: true,
        }));
    });

    it('A3: reject branches do NOT set the acceptance flag (bridge is acceptance-only)', () => {
        const event = loadEventFromFile('data/scenarios/events/war_1993.json', 'vance_owen_plan_1993');
        const state = makeMinimalState('RBiH');
        state.military.pending_event_decisions = [
            {
                event_id: 'vance_owen_plan_1993',
                event_title: event.title ?? 'Vance-Owen',
                turn_fired: 39,
                faction: 'RBiH',
                response_options: event.response_options!,
            },
        ];

        resolveEventDecision(state, 'vance_owen_plan_1993', 'reject');

        expect(state.military.event_flags?.['vance_owen_accepted']).toBeUndefined();
    });
});
