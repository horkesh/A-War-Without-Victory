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
    event_decision_log?: Array<{ event_id: string; response_id: string }>;
}

function makeState(options: MakeStateOptions = {}): GameState {
    const military = {
        event_flags: options.event_flags ?? {},
        event_fire_counts: options.event_fire_counts ?? {},
        event_decision_log: options.event_decision_log ?? [],
        negotiation: {
            capital: options.negotiation_capital ?? {},
            patron_relationships: {},
            peace_plan_history: [],
        },
    };
    const baseState = {
        paramilitary_policy: options.paramilitary_policy ?? 'ask',
        meta: { player_faction: options.player_faction ?? ('RBiH' as FactionId) },
        military,
        political: {},
    };
    return baseState as unknown as GameState;
}

function input(state: GameState, currentTurn: number): BuilderInput {
    return { state, currentTurn };
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
            event_decision_log: [{ event_id: 'vance_owen_plan_1993', response_id: 'accept' }],
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
            event_decision_log: [{ event_id: 'owen_stoltenberg_plan_1993', response_id: 'reject' }],
        });
        const sections = buildDynamicSections(input(rejected, 80));
        const os = sections.find((s) => s.target_essay_event_id === 'owen_stoltenberg_plan_1993');
        expect(os?.conditional_on).toContain('RESPONSE:owen_stoltenberg_plan_1993:reject');
    });

    it('emits nothing for non-load-bearing decisions', () => {
        const state = makeState({
            event_decision_log: [{ event_id: 'some_flavor_event_1993', response_id: 'noted' }],
        });
        expect(buildDynamicSections(input(state, 60))).toEqual([]);
    });

    it('is deterministic and strictCompare-sorted across calls', () => {
        const state = makeState({
            event_decision_log: [
                { event_id: 'owen_stoltenberg_plan_1993', response_id: 'accept' },
                { event_id: 'vance_owen_plan_1993', response_id: 'accept' },
                { event_id: 'london_conference_1992', response_id: 'accept_principles' },
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
                { event_id: 'vance_owen_plan_1993', response_id: 'accept' },
                { event_id: 'vance_owen_plan_1993', response_id: 'reject' },
            ],
        });
        const sections = buildDynamicSections(input(state, 60))
            .filter((s) => s.target_essay_event_id === 'vance_owen_plan_1993');
        expect(sections).toHaveLength(1);
        expect(sections[0]?.conditional_on).toContain('RESPONSE:vance_owen_plan_1993:accept');
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
        }
    });
});
