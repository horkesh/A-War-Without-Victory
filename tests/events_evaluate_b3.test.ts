/**
 * Phase B Sub-slice B3 — Evaluator wiring + helpers + diagnostics.
 *
 * Test plan gates covered:
 *   22-27 Evaluator (closed/requires_enabled gate, pressure non-accumulation,
 *         queued re-eval, mutex/overflow unaffected, no-op + causality-log)
 *   28-30 Decision (player/bot response-runtime parity, event_decision_log parity)
 *   40    Determinism re-run (two evaluator calls → byte-identical state)
 *   43    40w byte-identity smoke (engine does not author new runtime causality)
 *   45-46 Sort discipline (recordEnabledEvents / recordClosedEvents)
 *   47-48 Taxonomy diagnostic runtime-causality inventory + alignment finding
 *   49    Cost Ledger / Stari Most forbidden-language scan
 *
 * References:
 *   docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md §3.2-§3.7
 *   docs/40_reports/research/20260527_EVENT_FAMILY_PHASE_B_TEST_PLAN.md gates 22-30, 40-49
 *
 * Scope: engine + diagnostic surfaces only. No new JSON authored. The 40w
 * baseline is expected byte-identical because no row uses the new fields
 * (`requires_enabled` defaults false; `enables_events_runtime` /
 * `closes_events_runtime` are absent in every event JSON).
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

import { evaluateEvents, recordEnabledEvents, recordClosedEvents, recordCausality, applyResponseRuntimeCausality } from '../src/sim/events/evaluate_events.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import type { GameState, CausalityLogEntry } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { buildEventTaxonomyReport, collectCatalogFindings, loadCatalogRows } from '../tools/diagnostics/event_taxonomy_report.js';

/** Deterministic stub RNG — always returns 0.5. */
const RNG: Rng = () => 0.5;

function makeMinimalState(playerFaction?: string, turn = 5): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        factions: { RBiH: {} as any, RS: {} as any, HRHB: {} as any },
        meta: { turn, seed: 'b3-test', phase: 'war', player_faction: playerFaction } as any,
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

function cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state)) as GameState;
}

// ─── Gate 22 — Closed candidates never become eligible ────────────────────

describe('B3 Gate 22 — closed candidates short-circuit', () => {
    it('does not fire an event whose id is in closed_event_ids', () => {
        const def: EventDefinition = {
            id: 'gate22_evt',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'should not fire' },
            once: true,
        };
        const state = makeMinimalState();
        state.military.closed_event_ids = ['gate22_evt'];

        const report = evaluateEvents(state, RNG, 5, [def]);

        expect(report.fired).toEqual([]);
        expect(state.military.fired_event_ids ?? []).not.toContain('gate22_evt');
    });

    it('short-circuits BEFORE probability roll (probability would otherwise fail too — no rng() consumption)', () => {
        // Construct an event whose probability is impossible (would never fire),
        // verify rng was never even called by counting rng() invocations.
        let rngCalls = 0;
        const rng: Rng = () => { rngCalls += 1; return 0.99; };
        const def: EventDefinition = {
            id: 'gate22_closed_prob_evt',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'should never roll' },
            probability: 1.0, // would have fired if not closed
            once: true,
        };
        const state = makeMinimalState();
        state.military.closed_event_ids = ['gate22_closed_prob_evt'];

        evaluateEvents(state, rng, 5, [def]);

        expect(rngCalls).toBe(0);
    });
});

// ─── Gate 23 — requires_enabled gate ───────────────────────────────────────

describe('B3 Gate 23 — requires_enabled gate', () => {
    it('does not fire when requires_enabled=true and id is not in enabled_event_ids', () => {
        const def: EventDefinition = {
            id: 'gate23_evt',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'gated' },
            once: true,
            requires_enabled: true,
        };
        const state = makeMinimalState();

        const report = evaluateEvents(state, RNG, 5, [def]);

        expect(report.fired).toEqual([]);
    });

    it('fires when requires_enabled=true and id is in enabled_event_ids', () => {
        const def: EventDefinition = {
            id: 'gate23_evt_ok',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'gated open' },
            once: true,
            requires_enabled: true,
        };
        const state = makeMinimalState();
        state.military.enabled_event_ids = ['gate23_evt_ok'];

        const report = evaluateEvents(state, RNG, 5, [def]);

        expect(report.fired.map((f) => f.id)).toEqual(['gate23_evt_ok']);
    });

    it('defaults to false — events without requires_enabled fire normally even with empty enabled_event_ids', () => {
        const def: EventDefinition = {
            id: 'gate23_default',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'default' },
            once: true,
        };
        const state = makeMinimalState();

        const report = evaluateEvents(state, RNG, 5, [def]);

        expect(report.fired.map((f) => f.id)).toEqual(['gate23_default']);
    });
});

// ─── Gate 24 — Pressure non-accumulation while closed ─────────────────────

describe('B3 Gate 24 — pressure non-accumulation while closed', () => {
    it('preserves event_readiness when the event is closed (no zeroing, no advance)', () => {
        const def: EventDefinition = {
            id: 'gate24_pressure_evt',
            trigger: { turn_min: 0, phase: 'war' },
            effect: { kind: 'narrative', text: 'pressure event' },
            once: true,
            pressure: { base_rate: 1, threshold: 5, decay_rate: 0 },
        };
        const state = makeMinimalState();
        state.military.event_readiness = { gate24_pressure_evt: 3 };
        state.military.closed_event_ids = ['gate24_pressure_evt'];

        evaluateEvents(state, RNG, 5, [def]);

        // Closed events short-circuit before pressure path. Readiness must
        // remain exactly what it was — not advanced, not zeroed.
        expect(state.military.event_readiness!['gate24_pressure_evt']).toBe(3);
    });
});

// ─── Gate 25 — Queued (overflow) candidate re-evaluated against closure ───

describe('B3 Gate 25 — overflow queue re-eval against closure', () => {
    it('removes a queued candidate from overflow once it becomes closed', () => {
        const def: EventDefinition = {
            id: 'gate25_queued_evt',
            trigger: { turn_min: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'queued' },
            once: true,
        };
        const state = makeMinimalState();
        state.military.event_overflow_queue = ['gate25_queued_evt'];
        state.military.closed_event_ids = ['gate25_queued_evt'];

        const report = evaluateEvents(state, RNG, 5, [def]);

        expect(report.fired).toEqual([]);
        // Queue is recomputed from eligibility every turn; closed candidate
        // does not survive the eligibility pass.
        expect(state.military.event_overflow_queue).toEqual([]);
    });
});

// ─── Gate 26 — Mutex/overflow ordering unaffected ─────────────────────────

describe('B3 Gate 26 — mutex/overflow unaffected when no rows use new fields', () => {
    it('preserves canonical (priority, turn_min, id) ordering and mutex behavior', () => {
        const evtA: EventDefinition = {
            id: 'mutex_a',
            trigger: { turn_min: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'a' },
            once: true,
            priority: 1,
            mutex_group: 'g1',
        };
        const evtB: EventDefinition = {
            id: 'mutex_b',
            trigger: { turn_min: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'b' },
            once: true,
            priority: 2,
            mutex_group: 'g1',
        };
        const state = makeMinimalState();

        const report = evaluateEvents(state, RNG, 5, [evtA, evtB]);

        expect(report.fired.map((f) => f.id)).toEqual(['mutex_a']);
        expect(report.mutex_suppressed_ids).toEqual(['mutex_b']);
    });

    it('records mutex-suppressed causality entries', () => {
        const evtA: EventDefinition = {
            id: 'mutex_a',
            trigger: { turn_min: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'a' },
            once: true,
            priority: 1,
            mutex_group: 'g1',
        };
        const evtB: EventDefinition = {
            id: 'mutex_b',
            trigger: { turn_min: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'b' },
            once: true,
            priority: 2,
            mutex_group: 'g1',
        };
        const state = makeMinimalState();

        evaluateEvents(state, RNG, 5, [evtA, evtB]);

        const log = state.military.event_causality_log ?? [];
        const suppressedEntries = log.filter((e) => e.kind === 'mutex_suppressed');
        expect(suppressedEntries.length).toBe(1);
        expect(suppressedEntries[0].from_event).toBe('mutex_b');
        expect(suppressedEntries[0].to_event).toBeNull();
    });
});

// ─── Gate 27 — No-op + causality-log entry on already-fired targets ───────

describe('B3 Gate 27 — no-op on already-fired close target', () => {
    it('records a closes causality entry but does NOT append to closed_event_ids when target already fired', () => {
        const state = makeMinimalState();
        state.military.fired_event_ids = ['already_fired_target'];

        applyResponseRuntimeCausality(
            state,
            'driver_event',
            'driver_response',
            { closes_events_runtime: ['already_fired_target'] },
            5,
        );

        // closed_event_ids: empty/absent — close is a no-op since target fired.
        expect(state.military.closed_event_ids ?? []).toEqual([]);
        // Causality entry recorded — audit trail captures authoring intent.
        const log = state.military.event_causality_log ?? [];
        const closesEntry = log.find((e) => e.kind === 'closes' && e.to_event === 'already_fired_target');
        expect(closesEntry).toBeDefined();
        expect(closesEntry?.source_response_id).toBe('driver_response');
    });

    it('records an enables causality entry but does NOT append when target already fired (once)', () => {
        const state = makeMinimalState();
        state.military.fired_event_ids = ['once_fired_target'];

        applyResponseRuntimeCausality(
            state,
            'driver_event',
            'driver_response',
            { enables_events_runtime: ['once_fired_target'] },
            5,
        );

        expect(state.military.enabled_event_ids ?? []).toEqual([]);
        const log = state.military.event_causality_log ?? [];
        const enablesEntry = log.find((e) => e.kind === 'enables' && e.to_event === 'once_fired_target');
        expect(enablesEntry).toBeDefined();
    });
});

// ─── Gate 28 — Player path response-level runtime causality ───────────────

describe('B3 Gate 28 — player path writes enables/closes runtime + causality', () => {
    it('resolveEventDecision applies enables_events_runtime and closes_events_runtime', () => {
        const decisionEvent: EventDefinition = {
            id: 'gate28_evt',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'choice' },
            once: true,
            responding_faction: 'RBiH',
            requires_player_response: true,
            bot_response_logic: 'accept_first',
            response_options: [
                {
                    id: 'opt_a',
                    label: 'Choose A',
                    effects: [],
                    enables_events_runtime: ['enabled_downstream'],
                    closes_events_runtime: ['closed_downstream'],
                },
                {
                    id: 'opt_b',
                    label: 'Choose B',
                    effects: [],
                },
            ],
        };
        const state = makeMinimalState('RBiH', 5);
        evaluateEvents(state, RNG, 5, [decisionEvent]);

        // Decision is now pending — resolve as player.
        expect(state.military.pending_event_decisions?.length).toBe(1);

        resolveEventDecision(state, 'gate28_evt', 'opt_a');

        expect(state.military.enabled_event_ids).toEqual(['enabled_downstream']);
        expect(state.military.closed_event_ids).toEqual(['closed_downstream']);

        // Causality entries
        const log = state.military.event_causality_log ?? [];
        const enablesEntry = log.find((e) => e.kind === 'enables' && e.to_event === 'enabled_downstream');
        const closesEntry = log.find((e) => e.kind === 'closes' && e.to_event === 'closed_downstream');
        expect(enablesEntry).toBeDefined();
        expect(enablesEntry?.source_response_id).toBe('opt_a');
        expect(closesEntry).toBeDefined();
        expect(closesEntry?.source_response_id).toBe('opt_a');
    });
});

// ─── Gate 29 — Bot path response-level runtime causality ──────────────────

describe('B3 Gate 29 — bot path writes enables/closes runtime + causality', () => {
    it('bot historical pick produces identical deltas to player pick of the same option', () => {
        const decisionEvent: EventDefinition = {
            id: 'gate29_evt',
            title: 'gate 29',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'choice' },
            once: true,
            responding_faction: 'RBiH',
            bot_response_logic: 'historical',
            historical_default_response_id: 'opt_h',
            response_options: [
                {
                    id: 'opt_h',
                    label: 'Historical',
                    historical_marker: 'historical_default',
                    effects: [],
                    enables_events_runtime: ['target_enabled'],
                    closes_events_runtime: ['target_closed'],
                },
                {
                    id: 'opt_c',
                    label: 'Counter',
                    historical_marker: 'counterfactual',
                    effects: [],
                },
            ],
        };
        // No player_faction → bot auto-resolves.
        const state = makeMinimalState(undefined, 5);
        evaluateEvents(state, RNG, 5, [decisionEvent]);

        expect(state.military.enabled_event_ids).toEqual(['target_enabled']);
        expect(state.military.closed_event_ids).toEqual(['target_closed']);

        const log = state.military.event_causality_log ?? [];
        expect(log.some((e) => e.kind === 'enables' && e.to_event === 'target_enabled' && e.source_response_id === 'opt_h')).toBe(true);
        expect(log.some((e) => e.kind === 'closes' && e.to_event === 'target_closed' && e.source_response_id === 'opt_h')).toBe(true);

        // Decision log parity — bot recorded the choice.
        expect(state.military.event_decision_log).toBeDefined();
        const lastDecision = state.military.event_decision_log![state.military.event_decision_log!.length - 1];
        expect(lastDecision.event_id).toBe('gate29_evt');
        expect(lastDecision.response_id).toBe('opt_h');
    });
});

// ─── Gate 30 — event_decision_log parity preserved ────────────────────────

describe('B3 Gate 30 — event_decision_log parity', () => {
    it('player resolveEventDecision records exactly one decision_log entry', () => {
        const decisionEvent: EventDefinition = {
            id: 'gate30_evt',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'choice' },
            once: true,
            responding_faction: 'RBiH',
            requires_player_response: true,
            bot_response_logic: 'accept_first',
            response_options: [
                { id: 'a', label: 'A', effects: [] },
                { id: 'b', label: 'B', effects: [] },
            ],
        };
        const state = makeMinimalState('RBiH', 5);
        evaluateEvents(state, RNG, 5, [decisionEvent]);

        resolveEventDecision(state, 'gate30_evt', 'a');

        expect(state.military.event_decision_log).toEqual([
            { event_id: 'gate30_evt', response_id: 'a', decision_source: 'player', faction: 'RBiH', turn: 5 },
        ]);
    });

    // QA cosmetic correction C1 — player-vs-bot decision-log parity using the
    // same fixture for both paths. Every field of the decision-log entry must
    // be byte-identical except for `decision_source` ('player' vs 'bot').
    it('player and bot decision-log entries are byte-identical except for decision_source', () => {
        const buildEvent = (): EventDefinition => ({
            id: 'gate30_parity_evt',
            title: 'Parity fixture',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'parity choice' },
            once: true,
            responding_faction: 'RBiH',
            bot_response_logic: 'historical',
            historical_default_response_id: 'historical_pick',
            response_options: [
                {
                    id: 'historical_pick',
                    label: 'Historical pick',
                    historical_marker: 'historical_default',
                    effects: [],
                },
                {
                    id: 'counter_pick',
                    label: 'Counterfactual pick',
                    historical_marker: 'counterfactual',
                    effects: [],
                },
            ],
        });

        // Player path — same faction as the responding_faction, requires_player_response.
        const playerEvent = buildEvent();
        playerEvent.requires_player_response = true;
        const playerState = makeMinimalState('RBiH', 5);
        evaluateEvents(playerState, RNG, 5, [playerEvent]);
        resolveEventDecision(playerState, 'gate30_parity_evt', 'historical_pick');

        // Bot path — no player_faction so bot auto-resolves the same option via
        // historical bot_response_logic + historical_default_response_id.
        const botEvent = buildEvent();
        const botState = makeMinimalState(undefined, 5);
        evaluateEvents(botState, RNG, 5, [botEvent]);

        const playerEntry = playerState.military.event_decision_log?.[0];
        const botEntry = botState.military.event_decision_log?.[0];
        expect(playerEntry).toBeDefined();
        expect(botEntry).toBeDefined();

        // Same response_id, event_id, faction, turn — byte-identical except decision_source.
        expect(playerEntry!.event_id).toBe(botEntry!.event_id);
        expect(playerEntry!.response_id).toBe(botEntry!.response_id);
        expect(playerEntry!.faction).toBe(botEntry!.faction);
        expect(playerEntry!.turn).toBe(botEntry!.turn);
        expect(playerEntry!.decision_source).toBe('player');
        // Bot path can resolve via bot_political, bot_v1, or bot_ai_default;
        // all are bot variants distinct from 'player'.
        expect(['bot_political', 'bot_v1', 'bot_ai_default']).toContain(botEntry!.decision_source);

        // Field-set parity: serialized entries differ only on decision_source.
        const stripSource = (e: Record<string, unknown>) => {
            const copy = { ...e } as Record<string, unknown>;
            delete copy.decision_source;
            return copy;
        };
        expect(stripSource(playerEntry as unknown as Record<string, unknown>))
            .toEqual(stripSource(botEntry as unknown as Record<string, unknown>));
    });
});

// ─── Gate 40 — Determinism re-run ─────────────────────────────────────────

describe('B3 Gate 40 — determinism re-run (two evaluator calls produce byte-identical state)', () => {
    it('two consecutive evaluator runs on cloned states produce identical enabled_event_ids / closed_event_ids / event_causality_log', () => {
        const decisionEvent: EventDefinition = {
            id: 'gate40_evt',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'gate40' },
            once: true,
            responding_faction: 'RS',
            bot_response_logic: 'historical',
            historical_default_response_id: 'opt_h',
            response_options: [
                {
                    id: 'opt_h',
                    label: 'Historical',
                    historical_marker: 'historical_default',
                    effects: [],
                    enables_events_runtime: ['target_a', 'target_b'],
                    closes_events_runtime: ['target_c'],
                },
            ],
        };
        const evtWithFlags: EventDefinition = {
            id: 'gate40_with_flags',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'flag_open' },
            once: true,
            sets_flags: { branch_marker: 'set' },
            enables_events: ['enabled_event_x'],
        };

        const state1 = makeMinimalState(undefined, 5);
        const state2 = cloneState(state1);

        evaluateEvents(state1, RNG, 5, [decisionEvent, evtWithFlags]);
        evaluateEvents(state2, RNG, 5, [decisionEvent, evtWithFlags]);

        expect(state1.military.enabled_event_ids).toEqual(state2.military.enabled_event_ids);
        expect(state1.military.closed_event_ids).toEqual(state2.military.closed_event_ids);
        expect(state1.military.event_causality_log).toEqual(state2.military.event_causality_log);
    });
});

// ─── Gates 45-46 — Sort discipline ────────────────────────────────────────

describe('B3 Gate 45 — recordEnabledEvents dedup + sort-on-write', () => {
    it('appends new ids, dedupes, and canonical-sorts the array', () => {
        const state = makeMinimalState();
        recordEnabledEvents(state, ['zulu', 'alpha', 'mike']);
        expect(state.military.enabled_event_ids).toEqual(['alpha', 'mike', 'zulu']);

        recordEnabledEvents(state, ['bravo', 'alpha']); // dedup alpha
        expect(state.military.enabled_event_ids).toEqual(['alpha', 'bravo', 'mike', 'zulu']);
    });

    it('is a no-op for empty / undefined input', () => {
        const state = makeMinimalState();
        recordEnabledEvents(state, undefined);
        expect(state.military.enabled_event_ids).toBeUndefined();
        recordEnabledEvents(state, []);
        expect(state.military.enabled_event_ids).toBeUndefined();
    });
});

describe('B3 Gate 45 — recordClosedEvents dedup + sort-on-write', () => {
    it('appends new ids, dedupes, and canonical-sorts the array', () => {
        const state = makeMinimalState();
        recordClosedEvents(state, ['zulu', 'alpha', 'mike']);
        expect(state.military.closed_event_ids).toEqual(['alpha', 'mike', 'zulu']);

        recordClosedEvents(state, ['bravo', 'alpha']);
        expect(state.military.closed_event_ids).toEqual(['alpha', 'bravo', 'mike', 'zulu']);
    });
});

describe('B3 Gate 46 — single writer surface', () => {
    it('exposes recordEnabledEvents / recordClosedEvents / recordCausality as named exports', () => {
        // Smoke: the imports at the top of this file would have failed if the
        // helpers weren't exported. Re-assert by invocation.
        const state = makeMinimalState();
        recordEnabledEvents(state, ['x']);
        recordClosedEvents(state, ['y']);
        const entry: CausalityLogEntry = {
            turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'enables',
        };
        recordCausality(state, entry);
        expect(state.military.enabled_event_ids).toEqual(['x']);
        expect(state.military.closed_event_ids).toEqual(['y']);
        expect(state.military.event_causality_log?.length).toBe(1);
    });
});

// ─── recordCausality — dedup + sort ───────────────────────────────────────

describe('B3 — recordCausality dedup + sort-on-write', () => {
    it('dedupes identical entries (skips append)', () => {
        const state = makeMinimalState();
        const entry: CausalityLogEntry = {
            turn: 1, from_event: 'evt', to_event: 'tgt', to_flag: null, kind: 'enables',
        };
        recordCausality(state, entry);
        recordCausality(state, entry);
        expect(state.military.event_causality_log?.length).toBe(1);
    });

    it('canonical-sorts entries by (turn, from_event, to_event, to_flag, kind, source_response_id)', () => {
        const state = makeMinimalState();
        // Insert out of order; expect sorted output.
        recordCausality(state, { turn: 3, from_event: 'a', to_event: null, to_flag: null, kind: 'enables' });
        recordCausality(state, { turn: 1, from_event: 'z', to_event: null, to_flag: null, kind: 'enables' });
        recordCausality(state, { turn: 1, from_event: 'a', to_event: null, to_flag: null, kind: 'enables' });

        const log = state.military.event_causality_log!;
        expect(log[0].turn).toBe(1);
        expect(log[0].from_event).toBe('a');
        expect(log[1].turn).toBe(1);
        expect(log[1].from_event).toBe('z');
        expect(log[2].turn).toBe(3);
    });
});

// ─── Event-level enables_events records causality entry ───────────────────

describe('B3 — event-level enables_events writes causality entry', () => {
    it('records an enables causality entry for each event-level enables_events target', () => {
        const def: EventDefinition = {
            id: 'enables_driver',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'enables driver' },
            once: true,
            enables_events: ['target_one', 'target_two'],
        };
        const state = makeMinimalState();

        evaluateEvents(state, RNG, 5, [def]);

        expect(state.military.enabled_event_ids).toEqual(['target_one', 'target_two']);
        const log = state.military.event_causality_log ?? [];
        const enables = log.filter((e) => e.kind === 'enables');
        expect(enables.length).toBe(2);
        expect(enables.map((e) => e.to_event).sort()).toEqual(['target_one', 'target_two']);
        // Event-level enables have no source_response_id
        for (const entry of enables) {
            expect(entry.source_response_id).toBeUndefined();
        }
    });
});

// ─── Flag-open causality ──────────────────────────────────────────────────

describe('B3 — opens_flag causality entry for event-level sets_flags', () => {
    it('records opens_flag entry for each sets_flags key, sorted deterministically', () => {
        const def: EventDefinition = {
            id: 'flag_setter',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'flag setter' },
            once: true,
            sets_flags: { zulu_flag: true, alpha_flag: 'value' },
        };
        const state = makeMinimalState();

        evaluateEvents(state, RNG, 5, [def]);

        const flagOpens = (state.military.event_causality_log ?? []).filter((e) => e.kind === 'opens_flag');
        expect(flagOpens.length).toBe(2);
        // Log is canonically sorted; alpha < zulu, both have same turn / from_event
        expect(flagOpens[0].to_flag).toBe('alpha_flag');
        expect(flagOpens[1].to_flag).toBe('zulu_flag');
    });
});

// ─── Gates 47-48 — Taxonomy diagnostic ────────────────────────────────────

describe('B3 Gate 47 — taxonomy diagnostic surfaces runtime open/close inventory', () => {
    it('report rows expose response_options_with_enables_runtime, _closes_runtime, enables_events_runtime, closes_events_runtime', () => {
        const rows = loadCatalogRows();
        const report = buildEventTaxonomyReport(rows);
        // Schema shape — every row exposes the four runtime fields.
        for (const row of report.rows) {
            expect(typeof row.response_options_with_enables_runtime).toBe('number');
            expect(typeof row.response_options_with_closes_runtime).toBe('number');
            expect(Array.isArray(row.enables_events_runtime)).toBe(true);
            expect(Array.isArray(row.closes_events_runtime)).toBe(true);
        }
        expect(typeof report.summary.events_with_runtime_causality_wiring).toBe('number');
        // Phase D Packet 1 — rs_strategic_goals is the first row to author
        // runtime causality (3 options enable rs_paramilitary_policy_1992).
        // Phase D Packet 2 — hrhb_political_goal adds the HRHB-side analogue
        // (3 options enable hrhb_1992_graz_cooperation_collapse).
        // Phase D Packet 3 — hrhb_local_friction_1992 adds local_friction_emerges
        // option wiring enables_events_runtime.
        // Phase D Packet 4 — rbih_state_identity adds RBiH-side analogue
        // (3 options enable rbih_paramilitary_policy_1992). Count = 4
        // (R1 + H1 + H1a + B1).
        expect(report.summary.events_with_runtime_causality_wiring).toBe(4);
    });
});

describe('B3 Gate 48 — taxonomy presentation-vs-runtime alignment finding renders for mismatch', () => {
    it('emits runtime_presentation_mismatch finding when enables_events_runtime is not declared in future_consequences', () => {
        // Build a synthetic row by re-using the buildEventTaxonomyRow path
        // through a small JSON-shape fixture passed through collectCatalogFindings.
        // Easier path: directly invoke collectCatalogFindings via the in-memory rows.
        // Use a row from production catalog and mutate runtime arrays to simulate
        // a mismatch — buildEventTaxonomyRow + collectCatalogFindings will then
        // emit the finding.
        const rows = loadCatalogRows();
        // Synthesize a row by mutating a copy.
        const target = rows[0];
        const fixtureRow = {
            ...target,
            enables_events_runtime: ['nonexistent_target_that_is_not_in_future_consequences'],
            future_consequence_opens_events: [],
        };
        const findings = collectCatalogFindings([fixtureRow]);
        const mismatch = findings.find((f) => f.code === 'runtime_presentation_mismatch');
        expect(mismatch).toBeDefined();
    });

    // QA cosmetic correction C2 — symmetric closes-side mismatch. The
    // alignment rule must catch closes_events_runtime targets not declared in
    // any future_consequences[*].closes_events on the same row.
    it('emits runtime_presentation_mismatch finding when closes_events_runtime is not declared in future_consequences (closes-side)', () => {
        const rows = loadCatalogRows();
        const target = rows[0];
        const fixtureRow = {
            ...target,
            closes_events_runtime: ['nonexistent_close_target_not_in_future_consequences'],
            // Explicitly empty presentation closes — forces the mismatch.
            future_consequence_closes_events: [],
            // Ensure the symmetric enables side does not fire its own mismatch.
            enables_events_runtime: [],
            future_consequence_opens_events: [],
        };
        const findings = collectCatalogFindings([fixtureRow]);
        const closesMismatch = findings.find(
            (f) =>
                f.code === 'runtime_presentation_mismatch' &&
                typeof f.message === 'string' &&
                f.message.includes('closes_events_runtime'),
        );
        expect(closesMismatch).toBeDefined();
    });
});

// ─── Gate 43 — 40w byte-identity (smoke) ──────────────────────────────────
//
// We cannot run a full 40w scenario here (that lives in test:baselines).
// Instead, we smoke-test the engine invariant: with no event authoring
// runtime causality, the new writers must NOT mutate state in unrelated paths.

describe('B3 Gate 43 — engine smoke: no runtime causality writers fire when no row authors them', () => {
    it('evaluating a basic event with no enables_events / sets_flags / mutex / overflow / response options does not write causality log', () => {
        const def: EventDefinition = {
            id: 'no_causality_event',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'plain' },
            once: true,
        };
        const state = makeMinimalState();

        evaluateEvents(state, RNG, 5, [def]);

        // event_causality_log must be either undefined or empty —
        // no flags / no enables / no mutex / no overflow.
        const log = state.military.event_causality_log ?? [];
        expect(log).toEqual([]);
    });
});

// ─── Gate 49 — Cost Ledger / Stari Most forbidden language ────────────────

describe('B3 Gate 49 — Stari Most / H8 forbidden-language compliance', () => {
    // Phase B Sub-slice B3: forbidden-language regex per Gate §4. Tests the
    // current authored narrative text on mostar_bridge_destroyed_1993 against
    // euphemism / minimization / achievement-language patterns.
    //
    // The IT-04-74 citation in `historical_source` is an authoring artifact
    // expected in Phase D/F (H8 worksheet). When that authoring lands, the
    // citation assertion below will be tightened. Currently surfaced as a
    // structural state probe — not a hard-fail authoring gate (no JSON edits
    // in this slice per task hard constraints).

    type EventRow = {
        id: string;
        title?: string;
        narrative?: string;
        historical_source?: string;
        effects?: Array<{ kind: string; text?: string }>;
    };

    function loadStariMostRow(): EventRow {
        const events = JSON.parse(readFileSync('data/scenarios/events/war_1993.json', 'utf8')) as EventRow[];
        const row = events.find((e) => e.id === 'mostar_bridge_destroyed_1993');
        if (!row) throw new Error('mostar_bridge_destroyed_1993 not found');
        return row;
    }

    function collectStariMostStrings(row: EventRow): string[] {
        const strings: string[] = [];
        if (row.title) strings.push(row.title);
        if (row.narrative) strings.push(row.narrative);
        if (row.historical_source) strings.push(row.historical_source);
        if (Array.isArray(row.effects)) {
            for (const eff of row.effects) {
                if (eff.kind === 'narrative' && typeof eff.text === 'string') {
                    strings.push(eff.text);
                }
            }
        }
        return strings;
    }

    it('Stari Most strings avoid achievement-language ("liberat", "victorious", "triumph", "successful destruction")', () => {
        const row = loadStariMostRow();
        const strings = collectStariMostStrings(row);
        // Word-boundary forbidden patterns. "liberated" is OK only as a
        // pre-existing context word (e.g. "mostar_liberated" flag) — we test
        // the player-visible narrative strings, not flag keys.
        const forbidden = [
            /\btriumph(ant|ed|al)?\b/i,
            /\bvictorious\b/i,
            /\bsuccessful (destruction|demolition|operation)\b/i,
            /\bheroic (act|destruction|demolition)\b/i,
            /\baccomplish(ed|ment) (destruction|demolition)\b/i,
        ];
        for (const text of strings) {
            for (const re of forbidden) {
                expect(text, `Forbidden achievement-language match in: "${text}"`).not.toMatch(re);
            }
        }
    });

    it('Stari Most strings avoid minimization ("merely", "only a bridge", "just a structure", "incident")', () => {
        const row = loadStariMostRow();
        const strings = collectStariMostStrings(row);
        const forbidden = [
            /\bmerely (a bridge|symbolic)\b/i,
            /\b(only|just) (a bridge|a structure)\b/i,
            /\bbridge incident\b/i,
            /\bunintended (destruction|damage)\b/i,
            /\bcollateral (cultural )?damage\b/i,
        ];
        for (const text of strings) {
            for (const re of forbidden) {
                expect(text, `Forbidden minimization match in: "${text}"`).not.toMatch(re);
            }
        }
    });

    it('Stari Most strings avoid euphemism ("removed", "neutralized" used of the bridge, "tactical strike")', () => {
        const row = loadStariMostRow();
        const strings = collectStariMostStrings(row);
        const forbidden = [
            /\bbridge (was )?(removed|neutralized|cleared)\b/i,
            /\btactical (strike|removal|operation) (on|against) the (bridge|stari most)\b/i,
            /\bcultural (cleansing|removal|sanitization)\b/i,
        ];
        for (const text of strings) {
            for (const re of forbidden) {
                expect(text, `Forbidden euphemism match in: "${text}"`).not.toMatch(re);
            }
        }
    });

    it('Stari Most row exposes structural fields — citation field surfaced as Phase D/F authoring lever', () => {
        const row = loadStariMostRow();
        // Structural — the row must exist and carry title + narrative.
        expect(row.title).toBeTruthy();
        expect(row.narrative).toBeTruthy();
        // Citation surface: IF historical_source is populated, it MUST cite
        // IT-04-74. This is the soft contract for Phase D/F authoring; the
        // current row may not have historical_source yet (no JSON edits in
        // this slice). When the field is populated, the citation rule
        // tightens automatically.
        if (typeof row.historical_source === 'string' && row.historical_source.length > 0) {
            expect(row.historical_source).toMatch(/IT-04-74/);
        }
    });
});
