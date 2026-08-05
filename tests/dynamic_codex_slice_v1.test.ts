/**
 * LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — Phase 0 verification.
 *
 * 8 tests:
 *   T1: deterministic section ordering
 *   T2: faction-agnostic
 *   T3: ghost-entry conditionality
 *   T4: save/load round-trip
 *   T5: integration with CostLedger
 *   T6: Ring guard refuses §6 flags
 *   T7: ghost 3 (Srebrenica defended) emits as 'context' variant only, NEVER 'outcome'
 *   T8: deterministic body resolution (placeholder substitution)
 */
import { describe, it, expect } from 'vitest';
import {
    buildDynamicCodex,
    buildDynamicSections,
    buildGhostEntries,
    __TEST_RING_3_REFUSED_FLAGS,
    type BuilderInput,
    type BuiltGhostEntry,
} from '../src/sim/codex/dynamic_section_builder.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { buildConsequenceReceipts } from '../src/ui/map/data/consequenceReceipts.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import type { GameState, FactionId } from '../src/state/game_state.js';

// ─── Test helpers ──────────────────────────────────────────────────────────

/** Minimal state stub. The builder reads only a small slice; we type-cast
 *  via `unknown` to avoid pulling in the full GameState constructor surface. */
interface MakeStateOptions {
    /** Lifted onto state.military.event_flags. */
    event_flags?: Record<string, string | number | boolean>;
    /** Lifted onto state.military.event_fire_counts. */
    event_fire_counts?: Record<string, number>;
    /** Lifted onto state.military.negotiation.capital. */
    negotiation_capital?: Record<string, ReturnType<typeof makeBreakdown>>;
    /** Top-level paramilitary_policy. */
    paramilitary_policy?: 'always_allow' | 'always_deny' | 'ask';
    /** Top-level player_faction. */
    player_faction?: FactionId;
    /** Lifted onto state.military.event_decision_log. */
    event_decision_log?: Array<{
        event_id: string;
        response_id: string;
        decision_source?: string;
        faction?: FactionId | null;
        player_faction?: FactionId | null;
        turn?: number;
    }>;
    fired_event_ids?: string[];
    event_last_fired_turn?: Record<string, number>;
    event_causality_log?: Array<{
        turn: number;
        from_event: string;
        to_event: string | null;
        to_flag: string | null;
        kind: 'enables';
        source_response_id?: string;
    }>;
}

function makeState(options: MakeStateOptions = {}): GameState {
    const military = {
        event_flags: options.event_flags ?? {},
        event_fire_counts: options.event_fire_counts ?? {},
        event_decision_log: options.event_decision_log ?? [],
        fired_event_ids: options.fired_event_ids ?? [],
        event_last_fired_turn: options.event_last_fired_turn ?? {},
        event_causality_log: options.event_causality_log ?? [],
        negotiation: {
            capital: options.negotiation_capital ?? {},
            patron_relationships: {},
            peace_plan_history: [],
        },
    };
    const baseState = {
        paramilitary_policy: options.paramilitary_policy ?? 'ask',
        meta: { turn: 40, phase: 'war', player_faction: options.player_faction ?? ('RBiH' as FactionId) },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military,
        political: {},
    };
    return baseState as unknown as GameState;
}

function input(state: GameState, currentTurn: number): BuilderInput {
    return { state, currentTurn };
}

function playerDecision(
    event_id: string,
    response_id: string,
    faction: FactionId = 'RBiH' as FactionId,
    turn = 40,
) {
    return { event_id, response_id, decision_source: 'player', faction, turn };
}

function makeBreakdown(warCrimes: number) {
    return {
        territory_controlled_pct: 0,
        territory_controlled_km2: 0,
        civilians_under_protection: 0,
        refugees_created: 0,
        refugees_received: 0,
        military_casualties_inflicted: 0,
        military_casualties_taken: 0,
        civilian_casualties_caused: 0,
        enclaves_held: [],
        enclaves_lost: [],
        peace_plans_accepted: [],
        peace_plans_rejected: [],
        operations_launched: 0,
        operations_successful: 0,
        war_crimes_events: warCrimes,
    };
}

// ─── T1: deterministic section ordering ───────────────────────────────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T1: deterministic section ordering', () => {
    it('emits ghost entries in deterministic strictCompare order across runs', () => {
        const state = makeState({
            event_flags: {
                federation_never_fractured: true,
                vrs_quality_inverted: true,
                patron_pressure_refused: 5,
                vance_owen_accepted: true,
                enclave_held_through_turn: true,
            },
            event_fire_counts: {},
            paramilitary_policy: 'always_deny',
            negotiation_capital: { RBiH: makeBreakdown(0) },
        });

        const a = buildGhostEntries(state, 150);
        const b = buildGhostEntries(state, 150);
        const c = buildGhostEntries(state, 150);

        const ids = a.map((g) => g.ghost_id);
        // strictCompare-sorted output must match exactly across calls.
        expect(b.map((g) => g.ghost_id)).toEqual(ids);
        expect(c.map((g) => g.ghost_id)).toEqual(ids);
        // And the order is alphabetical (strictCompare is lex on ASCII).
        const sorted = [...ids].sort();
        expect(ids).toEqual(sorted);
    });
});

// ─── T2: faction-agnostic ─────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T2: faction-agnostic', () => {
    it('predicates fire identically for any player faction (RBiH/RS/HRHB)', () => {
        function stateForFaction(faction: FactionId): GameState {
            return makeState({
                event_flags: {
                    federation_never_fractured: true,
                    patron_pressure_refused: 3,
                    vrs_quality_inverted: true,
                },
                event_fire_counts: {},
                paramilitary_policy: 'always_deny',
                player_faction: faction,
                negotiation_capital: { [faction]: makeBreakdown(0) },
            });
        }

        const rbihIds = buildGhostEntries(stateForFaction('RBiH' as FactionId), 150).map((g) => g.ghost_id);
        const rsIds = buildGhostEntries(stateForFaction('RS' as FactionId), 150).map((g) => g.ghost_id);
        const hrhbIds = buildGhostEntries(stateForFaction('HRHB' as FactionId), 150).map((g) => g.ghost_id);

        // Same predicates fire regardless of which faction is the player.
        expect(rsIds).toEqual(rbihIds);
        expect(hrhbIds).toEqual(rbihIds);
    });
});

// ─── T3: ghost-entry conditionality ───────────────────────────────────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T3: ghost-entry conditionality', () => {
    it('emits no ghosts when no predicate matches', () => {
        const state = makeState();
        expect(buildGhostEntries(state, 50)).toEqual([]);
    });

    it('alliance_held requires turn >= 70 AND federation_never_fractured AND no croat_bosniak_war_begins_1993', () => {
        const beforeTurn = makeState({ event_flags: { federation_never_fractured: true } });
        expect(buildGhostEntries(beforeTurn, 60).find((g) => g.ghost_id === 'alliance_held')).toBeUndefined();

        const fired = makeState({
            event_flags: { federation_never_fractured: true },
            event_fire_counts: { croat_bosniak_war_begins_1993: 1 },
        });
        expect(buildGhostEntries(fired, 80).find((g) => g.ghost_id === 'alliance_held')).toBeUndefined();

        const passes = makeState({ event_flags: { federation_never_fractured: true } });
        const got = buildGhostEntries(passes, 80).find((g) => g.ghost_id === 'alliance_held');
        expect(got).toBeDefined();
        expect(got?.ring_classification).toBe(2);
        expect(got?.path).toBe('data/codex/ghost_entries/alliance_held.md');
    });

    it('cleansing_refused requires policy=always_deny, war_crimes=0, turn>=100', () => {
        const policyWrong = makeState({
            paramilitary_policy: 'ask',
            negotiation_capital: { RBiH: makeBreakdown(0) },
        });
        expect(buildGhostEntries(policyWrong, 120).find((g) => g.ghost_id === 'cleansing_refused')).toBeUndefined();

        const crimesPositive = makeState({
            paramilitary_policy: 'always_deny',
            negotiation_capital: { RBiH: makeBreakdown(2) },
        });
        expect(buildGhostEntries(crimesPositive, 120).find((g) => g.ghost_id === 'cleansing_refused')).toBeUndefined();

        const tooEarly = makeState({
            paramilitary_policy: 'always_deny',
            negotiation_capital: { RBiH: makeBreakdown(0) },
        });
        expect(buildGhostEntries(tooEarly, 99).find((g) => g.ghost_id === 'cleansing_refused')).toBeUndefined();

        const passes = makeState({
            paramilitary_policy: 'always_deny',
            negotiation_capital: { RBiH: makeBreakdown(0) },
        });
        expect(buildGhostEntries(passes, 120).find((g) => g.ghost_id === 'cleansing_refused')).toBeDefined();
    });

    it('early_peace_accepted is mutually exclusive with dayton_signed_1995', () => {
        const accepted = makeState({ event_flags: { vance_owen_accepted: true } });
        expect(buildGhostEntries(accepted, 60).find((g) => g.ghost_id === 'early_peace_accepted')).toBeDefined();

        const acceptedAndDayton = makeState({
            event_flags: { vance_owen_accepted: true },
            event_fire_counts: { dayton_signed_1995: 1 },
        });
        expect(buildGhostEntries(acceptedAndDayton, 200).find((g) => g.ghost_id === 'early_peace_accepted')).toBeUndefined();

        const owenStoltenberg = makeState({ event_flags: { owen_stoltenberg_accepted: true } });
        expect(buildGhostEntries(owenStoltenberg, 80).find((g) => g.ghost_id === 'early_peace_accepted')).toBeDefined();
    });

    it('patron_resisted requires patron_pressure_refused >= 3', () => {
        const two = makeState({ event_flags: { patron_pressure_refused: 2 } });
        expect(buildGhostEntries(two, 50).find((g) => g.ghost_id === 'patron_resisted')).toBeUndefined();

        const three = makeState({ event_flags: { patron_pressure_refused: 3 } });
        expect(buildGhostEntries(three, 50).find((g) => g.ghost_id === 'patron_resisted')).toBeDefined();
    });

    it('force_quality_inversion fires only when vrs_quality_inverted flag set', () => {
        const off = makeState({});
        expect(buildGhostEntries(off, 50).find((g) => g.ghost_id === 'force_quality_inversion')).toBeUndefined();

        const on = makeState({ event_flags: { vrs_quality_inverted: true } });
        expect(buildGhostEntries(on, 50).find((g) => g.ghost_id === 'force_quality_inversion')).toBeDefined();
    });
});

// ─── T4: save/load round-trip ─────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T4: save/load round-trip', () => {
    it('serialises and deserialises state-derived ghost output identically', () => {
        const stateOriginal = makeState({
            event_flags: {
                federation_never_fractured: true,
                patron_pressure_refused: 4,
            },
            event_fire_counts: {},
        });

        const before = buildGhostEntries(stateOriginal, 150);

        // Round-trip: stringify the entire state, parse it back, ensure
        // builder output is byte-identical.
        const serialised = JSON.stringify(stateOriginal);
        const restored = JSON.parse(serialised) as GameState;
        const after = buildGhostEntries(restored, 150);

        expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    });
});

// ─── T5: integration with CostLedger ──────────────────────────────────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T5: integration with CostLedger', () => {
    it('builder is read-only — does not mutate state.military.negotiation or any cost-ledger surface', () => {
        const state = makeState({
            event_flags: {
                federation_never_fractured: true,
                patron_pressure_refused: 4,
            },
            paramilitary_policy: 'always_deny',
            negotiation_capital: { RBiH: makeBreakdown(0) },
        });

        // The builder reads state.military.* and state.political.* — snapshot
        // both surfaces before and after to prove non-mutation.
        const militaryBefore = JSON.stringify(state.military);
        const politicalBefore = JSON.stringify(state.political);

        const result = buildDynamicCodex(input(state, 150));

        const militaryAfter = JSON.stringify(state.military);
        const politicalAfter = JSON.stringify(state.political);

        expect(militaryAfter).toBe(militaryBefore);
        expect(politicalAfter).toBe(politicalBefore);

        // Result is consumable shape — VerdictScreen reads it without writing back.
        expect(Array.isArray(result.sections)).toBe(true);
        expect(Array.isArray(result.ghosts)).toBe(true);
    });

    it('buildDynamicSections returns an empty array when no load-bearing decision is logged', () => {
        const state = makeState();
        expect(buildDynamicSections(input(state, 50))).toEqual([]);
    });
});

// ─── A3: dynamic-section morphing for load-bearing decisions ───────────────
// docs/40_reports/playtest/20260609_INSTRUMENTED_CAMPAIGN_AUDIT.md §A3 punch-list #2.

describe('A3 — buildDynamicSections surfaces load-bearing authored choices', () => {
    it('emits a RESPONSE-keyed section for a fired Vance-Owen acceptance', () => {
        const state = makeState({
            event_decision_log: [playerDecision('vance_owen_plan_1993', 'accept')],
        });
        const sections = buildDynamicSections(input(state, 60));
        const vopp = sections.find((s) => s.target_essay_event_id === 'vance_owen_plan_1993');
        expect(vopp).toBeDefined();
        expect(vopp?.conditional_on).toContain('RESPONSE:vance_owen_plan_1993:accept');
        expect(vopp?.ring_classification).toBe(2);
        // Never an 'outcome'/'context'-pinned framing — Ring 2 note/divergence only.
        expect(['note', 'divergence']).toContain(vopp?.variant);
    });

    it('keys the section on the ACTUAL recorded branch (reject vs accept)', () => {
        const rejected = makeState({
            event_decision_log: [playerDecision('owen_stoltenberg_plan_1993', 'reject')],
        });
        const sections = buildDynamicSections(input(rejected, 80));
        const os = sections.find((s) => s.target_essay_event_id === 'owen_stoltenberg_plan_1993');
        expect(os?.conditional_on).toContain('RESPONSE:owen_stoltenberg_plan_1993:reject');
    });

    it('emits nothing for non-load-bearing decisions', () => {
        const state = makeState({
            event_decision_log: [playerDecision('some_flavor_event_1993', 'noted')],
        });
        expect(buildDynamicSections(input(state, 60))).toEqual([]);
    });

    it('is deterministic and strictCompare-sorted across calls', () => {
        const state = makeState({
            event_decision_log: [
                playerDecision('owen_stoltenberg_plan_1993', 'accept'),
                playerDecision('vance_owen_plan_1993', 'accept'),
                playerDecision('london_conference_1992', 'accept_principles'),
            ],
        });
        const a = buildDynamicSections(input(state, 90)).map((s) => s.id);
        const b = buildDynamicSections(input(state, 90)).map((s) => s.id);
        expect(b).toEqual(a);
        expect(a).toEqual([...a].sort());
    });

    it('uses only the FIRST recorded response per once-only event', () => {
        const state = makeState({
            event_decision_log: [
                playerDecision('vance_owen_plan_1993', 'accept'),
                playerDecision('vance_owen_plan_1993', 'reject'),
            ],
        });
        const sections = buildDynamicSections(input(state, 60))
            .filter((s) => s.target_essay_event_id === 'vance_owen_plan_1993');
        expect(sections).toHaveLength(1);
        expect(sections[0]?.conditional_on).toContain('RESPONSE:vance_owen_plan_1993:accept');
    });

    it('emits response sections only for player-authored decisions owned by the loaded player faction', () => {
        const state = makeState({
            player_faction: 'RBiH' as FactionId,
            event_decision_log: [
                {
                    event_id: 'vance_owen_plan_1993',
                    response_id: 'accept',
                    decision_source: 'bot_political',
                    faction: 'RBiH' as FactionId,
                    turn: 40,
                },
                {
                    event_id: 'owen_stoltenberg_plan_1993',
                    response_id: 'accept',
                    decision_source: 'player',
                    faction: 'RS' as FactionId,
                    turn: 41,
                },
                {
                    event_id: 'london_conference_1992',
                    response_id: 'accept_principles',
                    decision_source: 'player',
                    faction: 'RBiH' as FactionId,
                    turn: 42,
                },
            ],
        });

        const sections = buildDynamicSections(input(state, 60));

        expect(sections.map((section) => section.id)).toEqual([
            'dynsec_london_conference_1992_accept_principles',
        ]);
        expect(sections[0]?.conditional_on).toEqual([
            'RESPONSE:london_conference_1992:accept_principles',
        ]);
    });

    it('binds a same-event/same-response section to the actual selected-player row and turn', () => {
        const state = makeState({
            player_faction: 'RBiH' as FactionId,
            event_decision_log: [
                playerDecision('vance_owen_plan_1993', 'accept', 'RS' as FactionId, 39),
                playerDecision('vance_owen_plan_1993', 'accept', 'RBiH' as FactionId, 44),
            ],
        });

        const section = buildDynamicSections(input(state, 60))
            .find((candidate) => candidate.id === 'dynsec_vance_owen_plan_1993_accept');

        expect(section?.claim_predicate.expression).toContain('faction=RBiH');
        expect(section?.claim_predicate.expression).toContain('turn=44');
        expect(section?.claim_predicate.expression).not.toContain('turn=39');
    });
});

// ─── A3: dead-bridge — accept sets the flag the early-peace ghost reads ─────
// The event-data fix lives in war_1993.json (accept branches set
// vance_owen_accepted / owen_stoltenberg_accepted). This pins the codex side:
// once the flag is set, the early_peace_accepted ghost becomes unlockable.

describe('A3 — dead-bridge: peace-plan acceptance unlocks the early_peace_accepted ghost', () => {
    it('early_peace_accepted ghost fires once vance_owen_accepted is set', () => {
        const before = makeState({ event_flags: {} });
        expect(buildGhostEntries(before, 60).find((g) => g.ghost_id === 'early_peace_accepted')).toBeUndefined();

        const after = makeState({ event_flags: { vance_owen_accepted: true } });
        expect(buildGhostEntries(after, 60).find((g) => g.ghost_id === 'early_peace_accepted')).toBeDefined();
    });

    it('early_peace_accepted ghost fires once owen_stoltenberg_accepted is set', () => {
        const after = makeState({ event_flags: { owen_stoltenberg_accepted: true } });
        expect(buildGhostEntries(after, 80).find((g) => g.ghost_id === 'early_peace_accepted')).toBeDefined();
    });
});

// ─── T6: Ring guard refuses §6 flags ──────────────────────────────────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T6: Ring guard refuses §6 flags', () => {
    it('exposes a non-empty refused-flag list', () => {
        expect(__TEST_RING_3_REFUSED_FLAGS.length).toBeGreaterThan(0);
        // Must include the sensitive-history rupture-flip class names.
        expect(__TEST_RING_3_REFUSED_FLAGS).toContain('rupture_flip');
        expect(__TEST_RING_3_REFUSED_FLAGS).toContain('srebrenica_genocide_did_not_occur');
    });

    it('throws when any §6 refused flag is present', () => {
        for (const refused of __TEST_RING_3_REFUSED_FLAGS) {
            const state = makeState({ event_flags: { [refused]: true } });
            expect(() => buildGhostEntries(state, 50)).toThrowError(/Ring guard refused/);
            expect(() => buildDynamicSections(input(state, 50))).toThrowError(/Ring guard refused/);
        }
    });

    it('does not throw when no §6 refused flags are present', () => {
        const benign = makeState({
            event_flags: {
                federation_never_fractured: true,
                vrs_quality_inverted: true,
            },
        });
        expect(() => buildGhostEntries(benign, 100)).not.toThrow();
    });
});

// ─── T7: Srebrenica AUDIT-ONLY — context variant, NEVER outcome ───────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T7: Srebrenica defended emits as context, NEVER outcome', () => {
    it('emits enclave_defended with ring_classification=2 and variant=context', () => {
        const state = makeState({ event_flags: { enclave_held_through_turn: true } });
        const ghosts = buildGhostEntries(state, 80);
        const got = ghosts.find((g) => g.ghost_id === 'enclave_defended');
        expect(got).toBeDefined();
        expect(got?.ring_classification).toBe(2);
        expect(got?.variant).toBe('context');
    });

    it('NEVER emits enclave_defended with variant=outcome under any state', () => {
        // Build a wide variety of states; for each, assert that if
        // enclave_defended is emitted, its variant is exactly 'context'.
        const states: GameState[] = [
            makeState({ event_flags: { enclave_held_through_turn: true } }),
            makeState({ event_flags: { enclave_held_through_turn: 1 } }),
            makeState({ event_flags: { enclave_held_through_turn: 'yes' } }),
            makeState({
                event_flags: {
                    enclave_held_through_turn: true,
                    federation_never_fractured: true,
                    patron_pressure_refused: 9,
                },
            }),
        ];
        for (const s of states) {
            const ghosts = buildGhostEntries(s, 200);
            const enclave = ghosts.find((g) => g.ghost_id === 'enclave_defended');
            if (enclave) {
                expect(enclave.variant).toBe('context');
                // Defence in depth: cannot be 'outcome' under any conditions.
                // Cast through `string` because the variant union does not
                // currently include 'outcome' as a literal — but a future
                // edit could change that, and this test must still catch it.
                expect((enclave.variant as string) === 'outcome').toBe(false);
            }
        }
    });
});

// ─── T8: deterministic body resolution (placeholder substitution) ─────────

describe('LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE — T8: deterministic body resolution', () => {
    it('produces the same conditional_on diagnostic strings on identical inputs', () => {
        const state = makeState({
            event_flags: {
                federation_never_fractured: true,
                patron_pressure_refused: 5,
                vrs_quality_inverted: true,
            },
        });

        const a = buildGhostEntries(state, 150);
        const b = buildGhostEntries(state, 150);

        expect(a.map((g) => g.conditional_on.join('|'))).toEqual(b.map((g) => g.conditional_on.join('|')));
    });

    it('emits stable ghost paths and ring_classification on every run', () => {
        const state = makeState({ event_flags: { vrs_quality_inverted: true } });

        for (let i = 0; i < 5; i++) {
            const ghosts: BuiltGhostEntry[] = buildGhostEntries(state, 50);
            const fqi = ghosts.find((g) => g.ghost_id === 'force_quality_inversion');
            expect(fqi).toBeDefined();
            expect(fqi?.path).toBe('data/codex/ghost_entries/force_quality_inversion.md');
            expect(fqi?.ring_classification).toBe(2);
            expect(fqi?.variant).toBe('context');
            expect(fqi?.classification).toBe('divergence_context');
        }
    });
});

describe('R4 Phase 4 - dynamic claims name their truth owner', () => {
    it('attaches a named state or receipt predicate to every emitted section and ghost', () => {
        const state = makeState({
            event_flags: {
                federation_never_fractured: true,
                patron_pressure_refused: 3,
            },
            event_decision_log: [{
                event_id: 'vance_owen_plan_1993',
                response_id: 'accept',
                decision_source: 'player',
                faction: 'RBiH',
                turn: 50,
            }],
        });

        const result = buildDynamicCodex(input(state, 90));
        expect([...result.sections, ...result.ghosts].length).toBeGreaterThan(0);
        for (const claim of [...result.sections, ...result.ghosts]) {
            expect(claim.claim_predicate.kind).toMatch(/^(state|receipt)$/);
            expect(claim.claim_predicate.owner_path).toMatch(/^(state\.|receipt:)/);
            expect(claim.claim_predicate.expression.trim()).not.toBe('');
            expect(claim.claim_predicate.expression).not.toMatch(/^turn\s*[<=>]/i);
        }
    });

    it('reserves missed-condition proof for path-not-taken ghosts and keeps context records honest', () => {
        const state = makeState({
            event_flags: {
                federation_never_fractured: true,
                winter_held_through_turn: true,
                corridor_blocked_through_turn: true,
            },
        });

        const ghosts = buildGhostEntries(state, 120);
        expect(ghosts.length).toBeGreaterThan(0);
        for (const ghost of ghosts) {
            if (ghost.classification === 'path_not_taken') {
                expect(ghost.missed_condition_predicate.owner_path).toMatch(/^state\./);
                expect(ghost.missed_condition_predicate.expression.trim()).not.toBe('');
                expect(ghost.missed_condition_predicate.expression).not.toBe(ghost.claim_predicate.expression);
                expect(ghost.missed_condition_predicate.expression).not.toMatch(/^turn\s*[<=>]/i);
            } else {
                expect(ghost.missed_condition_predicate).toBeUndefined();
            }
            expect(ghost.calendar_context.every((context) => /^turn/i.test(context))).toBe(true);
        }

        expect(buildGhostEntries(makeState(), 999)).toEqual([]);
    });

    it('derives every ghost predicate from exact mutable owner operands', () => {
        const expectedClassifications = new Map<string, BuiltGhostEntry['classification']>([
            ['alliance_held', 'path_not_taken'],
            ['cleansing_refused', 'divergence_context'],
            ['enclave_defended', 'audit_context'],
            ['patron_resisted', 'divergence_context'],
            ['early_peace_accepted', 'path_not_taken'],
            ['force_quality_inversion', 'divergence_context'],
            ['paramilitary_streak_refused', 'divergence_context'],
            ['winter_held', 'path_not_taken'],
            ['corridor_blocked', 'path_not_taken'],
            ['doctrine_reform_completed', 'path_not_taken'],
            ['arms_embargo_full_compliance', 'path_not_taken'],
            ['political_unity_held', 'path_not_taken'],
            ['equipment_quality_collapse', 'divergence_context'],
            ['negotiation_capital_exhausted', 'path_not_taken'],
            ['ceasefire_streak_held', 'path_not_taken'],
            ['mediator_trust_sustained', 'path_not_taken'],
            ['rear_pocket_sustained', 'path_not_taken'],
            ['civilian_displacement_contained', 'path_not_taken'],
            ['equipment_quality_recovered', 'path_not_taken'],
            ['negotiation_capital_recovered', 'path_not_taken'],
        ]);
        const fixtures: Array<{ ghostId: string; state: GameState; turn: number }> = [
            { ghostId: 'alliance_held', state: makeState({ event_flags: { federation_never_fractured: true } }), turn: 70 },
            {
                ghostId: 'cleansing_refused',
                state: makeState({
                    paramilitary_policy: 'always_deny',
                    negotiation_capital: { RBiH: makeBreakdown(0) },
                }),
                turn: 100,
            },
            { ghostId: 'enclave_defended', state: makeState({ event_flags: { enclave_held_through_turn: true } }), turn: 80 },
            { ghostId: 'patron_resisted', state: makeState({ event_flags: { patron_pressure_refused: 3 } }), turn: 40 },
            { ghostId: 'early_peace_accepted', state: makeState({ event_flags: { vance_owen_accepted: true } }), turn: 60 },
            { ghostId: 'force_quality_inversion', state: makeState({ event_flags: { vrs_quality_inverted: true } }), turn: 60 },
            {
                ghostId: 'paramilitary_streak_refused',
                state: makeState({ event_flags: { paramilitary_authorization_refused: true, clean_record: true } }),
                turn: 80,
            },
            { ghostId: 'winter_held', state: makeState({ event_flags: { winter_held_through_turn: true } }), turn: 80 },
            { ghostId: 'corridor_blocked', state: makeState({ event_flags: { corridor_blocked_through_turn: true } }), turn: 30 },
            {
                ghostId: 'doctrine_reform_completed',
                state: makeState({ event_flags: {
                    doctrine_reform_initiated_RBiH: true,
                    doctrine_modernization_active_RBiH: true,
                } }),
                turn: 40,
            },
            {
                ghostId: 'arms_embargo_full_compliance',
                state: makeState({ event_flags: { arms_embargo_compliant_through_turn: true } }),
                turn: 100,
            },
            {
                ghostId: 'political_unity_held',
                state: makeState({ event_flags: { political_unity_held_through_turn: true } }),
                turn: 100,
            },
            { ghostId: 'equipment_quality_collapse', state: makeState({ event_flags: { equipment_quality_collapsed: true } }), turn: 40 },
            {
                ghostId: 'negotiation_capital_exhausted',
                state: makeState({ event_flags: { negotiation_capital_exhausted: true } }),
                turn: 100,
            },
            { ghostId: 'ceasefire_streak_held', state: makeState({ event_flags: { ceasefire_held_through_turn: true } }), turn: 80 },
            {
                ghostId: 'mediator_trust_sustained',
                state: makeState({ event_flags: { mediator_trust_held_through_turn: true } }),
                turn: 80,
            },
            {
                ghostId: 'rear_pocket_sustained',
                state: makeState({
                    event_flags: { rear_pocket_discipline_held_through_turn: true },
                    negotiation_capital: { RBiH: makeBreakdown(0) },
                }),
                turn: 80,
            },
            {
                ghostId: 'civilian_displacement_contained',
                state: makeState({ event_flags: { civilian_displacement_contained_through_turn: true } }),
                turn: 80,
            },
            {
                ghostId: 'equipment_quality_recovered',
                state: makeState({ event_flags: { equipment_quality_recovery_streak_active_RBiH: true } }),
                turn: 80,
            },
            {
                ghostId: 'negotiation_capital_recovered',
                state: makeState({ event_flags: { negotiation_capital_recovered: true } }),
                turn: 80,
            },
        ];

        const setPath = (target: Record<string, any>, ownerPath: string, value: unknown): void => {
            const segments = ownerPath.split('.').slice(1);
            let cursor = target;
            for (const segment of segments.slice(0, -1)) {
                cursor[segment] ??= {};
                cursor = cursor[segment];
            }
            cursor[segments.at(-1)!] = value;
        };

        for (const fixture of fixtures) {
            const emitted = buildGhostEntries(fixture.state, fixture.turn)
                .find((ghost) => ghost.ghost_id === fixture.ghostId);
            expect(emitted, fixture.ghostId).toBeDefined();
            expect(emitted?.claim_predicate.owner_paths).toEqual(
                emitted?.claim_predicate.operands.map((operand) => operand.owner_path),
            );
            expect(emitted?.claim_predicate.expression).not.toContain('<player>');
            expect(emitted?.classification).toBe(expectedClassifications.get(fixture.ghostId));
            if (emitted?.classification === 'path_not_taken') {
                expect(emitted.missed_condition_predicate.owner_paths.every(
                    (path) => emitted.claim_predicate.owner_paths.includes(path),
                )).toBe(true);
                expect(emitted.missed_condition_predicate.expression).not.toBe(emitted.claim_predicate.expression);
            } else {
                expect(emitted?.missed_condition_predicate).toBeUndefined();
            }

            for (const operand of emitted!.claim_predicate.operands) {
                const mutated = JSON.parse(JSON.stringify(fixture.state)) as GameState;
                let falsifyingValue: unknown;
                if (operand.operator === 'at_least') {
                    falsifyingValue = Number(operand.expected_value) - 1;
                } else if (operand.operator === 'truthy_equals') {
                    falsifyingValue = operand.expected_value === true ? false : true;
                } else if (typeof operand.expected_value === 'number') {
                    falsifyingValue = operand.expected_value + 1;
                } else {
                    falsifyingValue = '__mismatch__';
                }
                setPath(mutated as unknown as Record<string, any>, operand.owner_path, falsifyingValue);
                expect(
                    buildGhostEntries(mutated, fixture.turn).some((ghost) => ghost.ghost_id === fixture.ghostId),
                    `${fixture.ghostId} should fail when ${operand.owner_path} changes`,
                ).toBe(false);
            }
        }
    });

    it('fails closed for every ghost when the selected player is absent', () => {
        const state = makeState({ event_flags: { federation_never_fractured: true } });
        (state.meta as { player_faction?: string }).player_faction = undefined;
        expect(buildGhostEntries(state, 200)).toEqual([]);
    });
});

function makeReceiptCatalog(): Map<string, EventDefinition> {
    const source = (id: string, targetId: string): EventDefinition => ({
        id,
        title: `${id} decision`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'Recorded.' },
        family: 'peace_plan',
        source_tier: 'icty_icj_un',
        response_options: [{
            id: 'accept',
            label: 'Accept',
            effects: [],
            enables_events_runtime: [targetId],
            future_consequences: [{
                id: `${targetId}_future`,
                label: `${targetId} consequence`,
                timing: 'future',
                certainty: 'guaranteed',
                opens_events: [targetId],
                explanation: 'The recorded choice enables this consequence.',
            }],
        }],
    } as unknown as EventDefinition);
    const target = (id: string): EventDefinition => ({
        id,
        title: `${id} consequence`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'Recorded.' },
        family: 'peace_plan',
        source_tier: 'icty_icj_un',
        response_options: [],
    } as unknown as EventDefinition);

    return new Map([
        ['rbih_source', source('rbih_source', 'rbih_consequence')],
        ['rbih_consequence', target('rbih_consequence')],
        ['rs_source', source('rs_source', 'rs_consequence')],
        ['rs_consequence', target('rs_consequence')],
    ]);
}

function makeTwoFactionReceiptState(): GameState {
    return makeState({
        player_faction: 'RBiH' as FactionId,
        event_decision_log: [
            {
                event_id: 'rbih_source',
                response_id: 'accept',
                decision_source: 'player',
                faction: 'RBiH',
                turn: 50,
            },
            {
                event_id: 'rs_source',
                response_id: 'accept',
                decision_source: 'player',
                faction: 'RS',
                turn: 51,
            },
        ],
        fired_event_ids: ['rbih_consequence', 'rs_consequence'],
        event_last_fired_turn: { rbih_consequence: 54, rs_consequence: 55 },
        event_causality_log: [
            {
                turn: 50,
                from_event: 'rbih_source',
                to_event: 'rbih_consequence',
                to_flag: null,
                kind: 'enables',
                source_response_id: 'accept',
            },
            {
                turn: 51,
                from_event: 'rs_source',
                to_event: 'rs_consequence',
                to_flag: null,
                kind: 'enables',
                source_response_id: 'accept',
            },
        ],
    });
}

function receiptIdsAcrossSurfaces(
    state: GameState,
    catalog: ReadonlyMap<string, EventDefinition>,
): Record<'codex' | 'chronicle' | 'records' | 'costLedger', string[]> {
    return {
        codex: buildDynamicSections(input(state, 60))
            .flatMap((section) => section.receipt_record_id ? [section.receipt_record_id] : []),
        chronicle: generateChronicleEntries({
            rawGameState: state,
            firedEvents: [],
            turn: 60,
        } as any, catalog).flatMap((entry) => entry.metadata?.receiptRecordId
            ? [entry.metadata.receiptRecordId]
            : []),
        records: buildConsequenceReceipts(state, catalog).map((receipt) => receipt.receiptRecordId),
        costLedger: (buildCostLedger(state).consequence_receipts ?? [])
            .map((receipt) => receipt.receipt_record_id),
    };
}

describe('R4 Phase 4 - one realized receipt across Codex, Chronicle, Records, and Cost Ledger', () => {
    it('projects only the selected player faction when valid RBiH and RS receipts coexist', () => {
        const idsBySurface = receiptIdsAcrossSurfaces(makeTwoFactionReceiptState(), makeReceiptCatalog());
        const expected = ['receipt:rbih_source::accept::50::rbih_consequence'];

        for (const ids of Object.values(idsBySurface)) {
            expect(ids).toEqual(expected);
        }
    });

    it('projects zero receipts on every surface when the selected player is absent', () => {
        const state = makeTwoFactionReceiptState();
        (state.meta as { player_faction?: string }).player_faction = undefined;

        const idsBySurface = receiptIdsAcrossSurfaces(state, makeReceiptCatalog());
        for (const ids of Object.values(idsBySurface)) {
            expect(ids).toEqual([]);
        }
    });

    it('projects zero receipts on every surface for a null-faction player decision', () => {
        const state = makeTwoFactionReceiptState();
        state.military.event_decision_log = [{
            event_id: 'rbih_source',
            response_id: 'accept',
            decision_source: 'player',
            faction: null,
            turn: 50,
        }];

        const idsBySurface = receiptIdsAcrossSurfaces(state, makeReceiptCatalog());
        for (const ids of Object.values(idsBySurface)) {
            expect(ids).toEqual([]);
        }
    });

    it('projects the same receipt id and predicate from one durable causal edge', () => {
        const state = makeState({
            event_decision_log: [{
                event_id: 'vance_owen_plan_1993',
                response_id: 'accept',
                decision_source: 'player',
                faction: 'RBiH',
                turn: 50,
            }],
            fired_event_ids: ['vance_owen_plan_1993', 'peace_implementation_review_1993'],
            event_last_fired_turn: { peace_implementation_review_1993: 54 },
            event_causality_log: [{
                turn: 50,
                from_event: 'vance_owen_plan_1993',
                to_event: 'peace_implementation_review_1993',
                to_flag: null,
                kind: 'enables',
                source_response_id: 'accept',
            }],
        });
        const catalog = new Map<string, EventDefinition>([
            ['vance_owen_plan_1993', {
                id: 'vance_owen_plan_1993',
                title: 'Vance-Owen Peace Plan',
                trigger: { turn_min: 1, phase: 'war' },
                effect: { kind: 'narrative', text: 'Recorded.' },
                family: 'peace_plan',
                source_tier: 'icty_icj_un',
                response_options: [{
                    id: 'accept',
                    label: 'Accept the plan',
                    effects: [],
                    enables_events_runtime: ['peace_implementation_review_1993'],
                    future_consequences: [{
                        id: 'implementation_review',
                        label: 'Implementation review',
                        timing: 'future',
                        certainty: 'guaranteed',
                        opens_events: ['peace_implementation_review_1993'],
                        explanation: 'The signed plan enters implementation review.',
                    }],
                }],
            } as unknown as EventDefinition],
            ['peace_implementation_review_1993', {
                id: 'peace_implementation_review_1993',
                title: 'Peace implementation review',
                trigger: { turn_min: 1, phase: 'war' },
                effect: { kind: 'narrative', text: 'Recorded.' },
                family: 'peace_plan',
                source_tier: 'icty_icj_un',
                response_options: [],
            } as unknown as EventDefinition],
        ]);

        const [recordsReceipt] = buildConsequenceReceipts(state, catalog);
        expect(recordsReceipt).toBeDefined();

        const codexReceipt = buildDynamicSections(input(state, 60))
            .find((section) => section.receipt_record_id === recordsReceipt.receiptRecordId);
        const costReceipt = buildCostLedger(state).consequence_receipts
            ?.find((receipt) => receipt.receipt_record_id === recordsReceipt.receiptRecordId);
        const chronicleReceipt = generateChronicleEntries({
            rawGameState: state,
            firedEvents: [],
            turn: 60,
        } as any, catalog).find((entry) => entry.metadata?.receiptRecordId === recordsReceipt.receiptRecordId);

        expect(codexReceipt?.claim_predicate).toEqual(recordsReceipt.claimPredicate);
        expect(costReceipt?.claim_predicate).toEqual(recordsReceipt.claimPredicate);
        expect(chronicleReceipt?.metadata?.receiptPredicate).toBe(recordsReceipt.claimPredicate.expression);
        expect(chronicleReceipt?.metadata?.receiptPredicateOwnerPaths).toEqual(
            recordsReceipt.claimPredicate.owner_paths,
        );
        expect(recordsReceipt.claimPredicate.owner_paths).toEqual([
            'state.meta.player_faction',
            'state.military.event_decision_log',
            'state.military.event_causality_log',
            'state.military.fired_event_ids',
            'state.military.event_last_fired_turn.peace_implementation_review_1993',
        ]);
    });
});
