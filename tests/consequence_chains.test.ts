/**
 * v0.9.0 Consequence System — integration tests for authored divergence chains.
 *
 * Verifies:
 *   - consequences.json loads via event_loader.
 *   - Each chain is gated by its ahistorical flag (NO csq_* event fires on
 *     the historical path).
 *   - Each chain event fires within its declared turn window when the flag
 *     is set and downstream effects land on MilitaryState.
 *
 * Writers and engine consumers are covered by sibling files:
 *   tests/consequence_effects.test.ts (writer contracts)
 *   tests/consequence_consumers.test.ts (reader / pipeline contracts)
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { HOSTILE_THRESHOLD, isRbihHrhbAtWar, isRbihHrhbCombatEnabled } from '../src/sim/early_war/alliance_update.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

/** Deterministic RNG for probabilistic events (consequence chains are
 *  flag-gated, not probabilistic, but evaluateEvents requires an rng). */
function rng(): number { return 0.5; }

function makeRBiHState(turn: number, flags: Record<string, string | number | boolean> = {}): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'csq' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_brig_1: {
                    id: 'rbih_brig_1', faction: 'RBiH', name: 'B1',
                    kind: 'brigade', status: 'active', assignment: null,
                    created_turn: 0, morale: 60, cohesion: 70,
                } as any,
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
            event_flags: { ...flags },
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {},
        } as unknown as GameState['political'],
    } as unknown as GameState;
}

// Load the real consequences.json through the event loader to prove the
// loader wiring works end to end.
const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);
const CSQ_EVENTS = ALL_EVENTS.filter(e => e.id.startsWith('csq_'));
const EVENT_BY_ID = new Map(ALL_EVENTS.map(e => [e.id, e]));

describe('consequences.json loads via event_loader', () => {
    it('loader returns at least one csq_ event', () => {
        expect(CSQ_EVENTS.length).toBeGreaterThan(0);
    });

    it('Chain 6 events are all present in the registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_minority_defections_1992')).toBe(true);
        expect(ids.has('csq_bosniak_unity_1993')).toBe(true);
        expect(ids.has('csq_international_disillusionment_1993')).toBe(true);
    });
});

describe('Chain 6 — RBiH Identity: historical path fires nothing', () => {
    it('no csq_ event fires when rbih_state_identity is unset', () => {
        const state = makeRBiHState(15);
        const result = evaluateEvents(state, rng, 15, ALL_EVENTS);
        const firedCsq = result.fired.filter(f => f.id.startsWith('csq_'));
        expect(firedCsq).toHaveLength(0);
    });

    it('no csq_ event fires when rbih_state_identity = civic (historical)', () => {
        const state = makeRBiHState(15, { rbih_state_identity: 'civic' });
        const result = evaluateEvents(state, rng, 15, ALL_EVENTS);
        const firedCsq = result.fired.filter(f => f.id.startsWith('csq_'));
        expect(firedCsq).toHaveLength(0);
    });

    it('no csq_ event fires when rbih_state_identity = pragmatic', () => {
        // pragmatic is a weaker variant; MVP only gates on bosniak_national.
        const state = makeRBiHState(15, { rbih_state_identity: 'pragmatic' });
        const result = evaluateEvents(state, rng, 15, ALL_EVENTS);
        const firedCsq = result.fired.filter(f => f.id.startsWith('csq_'));
        expect(firedCsq).toHaveLength(0);
    });
});

describe('Chain 6 — RBiH Identity: ahistorical path fires chain', () => {
    it('csq_minority_defections_1992 fires in w8-w20 when flag = bosniak_national', () => {
        const state = makeRBiHState(15, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 15, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_minority_defections_1992');
    });

    it('csq_minority_defections_1992 does NOT fire before w8', () => {
        const state = makeRBiHState(6, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 6, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain('csq_minority_defections_1992');
    });

    it('csq_minority_defections_1992 does NOT fire after w20', () => {
        const state = makeRBiHState(25, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 25, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain('csq_minority_defections_1992');
    });

    it('csq_minority_defections_1992 lands a recruitment_modifier and morale drop', () => {
        const state = makeRBiHState(15, { rbih_state_identity: 'bosniak_national' });
        const moraleBefore = (state.military.formations as any).rbih_brig_1.morale;
        evaluateEvents(state, rng, 15, ALL_EVENTS);
        const mods = state.military.recruitment_modifiers ?? [];
        const rbihMods = mods.filter(m => m.faction === 'RBiH');
        expect(rbihMods).toHaveLength(1);
        expect(rbihMods[0].pool_multiplier).toBeCloseTo(0.80);
        const moraleAfter = (state.military.formations as any).rbih_brig_1.morale;
        expect(moraleAfter).toBeLessThan(moraleBefore);
    });

    it('csq_bosniak_unity_1993 fires in w30-w55 with +1.15 recruitment modifier', () => {
        const state = makeRBiHState(40, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(state, rng, 40, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_bosniak_unity_1993');
        const mods = state.military.recruitment_modifiers ?? [];
        const unityMod = mods.find(m => m.pool_multiplier > 1);
        expect(unityMod).toBeDefined();
        expect(unityMod!.pool_multiplier).toBeCloseTo(1.15);
    });

    it('csq_international_disillusionment_1993 requires low international_standing', () => {
        // With no strategic_dimensions configured, dimension_below defaults to 50
        // → NOT below 40 → event should NOT fire.
        const stateHigh = makeRBiHState(50, { rbih_state_identity: 'bosniak_national' });
        evaluateEvents(stateHigh, rng, 50, ALL_EVENTS);
        expect(stateHigh.military.fired_event_ids ?? []).not.toContain('csq_international_disillusionment_1993');
    });

    it('csq_international_disillusionment_1993 fires when both gates are met', () => {
        const state = makeRBiHState(50, { rbih_state_identity: 'bosniak_national' });
        state.military.negotiation = {
            strategic_dimensions: {
                RBiH: {
                    international_standing: { base_value: 30, event_modifier: 0, effective_value: 30 },
                } as any,
            } as any,
        } as any;
        evaluateEvents(state, rng, 50, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_international_disillusionment_1993');
    });
});

// ─── Chain 4 — Bihac Collapses ───────────────────────────────────────────

function makeBihacChainState(turn: number, opts: {
    abdicPactFired?: boolean;
    bihacCollapseFired?: boolean;
    rbihMorale?: number;
    bihacSupply?: 'adequate' | 'strained' | 'critical';
} = {}): GameState {
    const fired: string[] = [];
    if (opts.abdicPactFired) fired.push('abdic_karadzic_pact_1993');
    if (opts.bihacCollapseFired) fired.push('csq_bihac_pocket_collapses_1994');
    const morale = opts.rbihMorale ?? 40;
    const bihacSupply = opts.bihacSupply ?? 'adequate';
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'csq4' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_brig_1: {
                    id: 'rbih_brig_1', faction: 'RBiH', name: 'B1',
                    kind: 'brigade', status: 'active', assignment: null,
                    created_turn: 0, morale,
                } as any,
                rbih_brig_2: {
                    id: 'rbih_brig_2', faction: 'RBiH', name: 'B2',
                    kind: 'brigade', status: 'active', assignment: null,
                    created_turn: 0, morale,
                } as any,
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: fired,
            event_flags: {},
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {},
            last_supply_state_by_osid: {
                'op:bihac:bihac_1': bihacSupply,
                'op:bihac:bihac_2': bihacSupply,
            },
        } as unknown as GameState['political'],
    } as unknown as GameState;
}

describe('Chain 4 — Bihac Collapses: historical path (no Abdic pact) fires nothing', () => {
    it('no Chain 4 csq_ event fires when abdic_karadzic_pact_1993 is absent', () => {
        const state = makeBihacChainState(140, {
            abdicPactFired: false,
            rbihMorale: 25,
            bihacSupply: 'critical',
        });
        evaluateEvents(state, rng, 140, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain('csq_bihac_pocket_collapses_1994');
    });
});

describe('Chain 4 — Bihac Collapses: gated collapse', () => {
    it('fires only when morale is below 30 AND bihac supply is critical', () => {
        const moraleHigh = makeBihacChainState(140, {
            abdicPactFired: true,
            rbihMorale: 60,
            bihacSupply: 'critical',
        });
        evaluateEvents(moraleHigh, rng, 140, ALL_EVENTS);
        expect(moraleHigh.military.fired_event_ids ?? []).not.toContain('csq_bihac_pocket_collapses_1994');

        const supplyOk = makeBihacChainState(140, {
            abdicPactFired: true,
            rbihMorale: 25,
            bihacSupply: 'adequate',
        });
        evaluateEvents(supplyOk, rng, 140, ALL_EVENTS);
        expect(supplyOk.military.fired_event_ids ?? []).not.toContain('csq_bihac_pocket_collapses_1994');

        const bothMet = makeBihacChainState(140, {
            abdicPactFired: true,
            rbihMorale: 25,
            bihacSupply: 'critical',
        });
        evaluateEvents(bothMet, rng, 140, ALL_EVENTS);
        expect(bothMet.military.fired_event_ids).toContain('csq_bihac_pocket_collapses_1994');
        expect(bothMet.military.event_flags?.bihac_pocket_fell).toBe(true);
    });

    it('csq_northwest_rs_consolidation_1995 fires after Bihac collapse', () => {
        const state = makeBihacChainState(125, { bihacCollapseFired: true });
        evaluateEvents(state, rng, 125, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_northwest_rs_consolidation_1995');
        // aggression_modifier landed for RS
        const mods = state.military.event_aggression_modifiers ?? [];
        expect(mods.some(m => m.faction === 'RS' && m.delta === 0.10)).toBe(true);
        // bot_priority_shift landed
        const shifts = state.military.bot_priority_shifts ?? [];
        expect(shifts.some(s => s.faction === 'RS' && s.add_objectives?.includes('zenica'))).toBe(true);
    });

    it('csq_bihac_refugee_crisis_1994 fires after Bihac collapse and lands supply_delta', () => {
        const state = makeBihacChainState(125, { bihacCollapseFired: true });
        const rbihBefore = state.military.general_supply_reserve!['RBiH'];
        evaluateEvents(state, rng, 125, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_bihac_refugee_crisis_1994');
        const rbihAfter = state.military.general_supply_reserve!['RBiH'];
        expect(rbihAfter).toBeLessThan(rbihBefore);
    });

    it('all three Chain 4 events present in registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_bihac_pocket_collapses_1994')).toBe(true);
        expect(ids.has('csq_northwest_rs_consolidation_1995')).toBe(true);
        expect(ids.has('csq_bihac_refugee_crisis_1994')).toBe(true);
    });
});

// ─── Chain 5 — RS Maximum Aggression → Accelerated Response ──────────────
//
// Chain 5's gate flag (`rs_strategic_goals = aggressive`) lives in the same
// turn windows as unrelated historical RS-patron events (e.g. the
// `turajlic_assassination_1993` burst at w40-w42). To keep these tests
// asserting ONLY Chain 5 behavior we pass `CSQ_EVENTS` (the csq_* subset)
// rather than `ALL_EVENTS`. The loader-integration test above already proves
// Chain 5 is in the full registry.

/** RS-focused chain state: aggression flag, optional pre-fired events, optional
 *  RS war_crimes_events counter on negotiation.capital. */
function makeRSChainState(
    turn: number,
    opts: {
        flags?: Record<string, string | number | boolean>;
        firedEvents?: string[];
        rsWarCrimes?: number;
    } = {},
): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RS', seed: 'csq5' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [...(opts.firedEvents ?? [])],
            event_flags: { ...(opts.flags ?? {}) },
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
            negotiation: {
                capital: {
                    RBiH: { war_crimes_events: 0 } as any,
                    RS: { war_crimes_events: opts.rsWarCrimes ?? 0 } as any,
                    HRHB: { war_crimes_events: 0 } as any,
                },
                patron_relationships: {
                    RS: { support_level: 70, override_authority: 0 } as any,
                    RBiH: { support_level: 50, override_authority: 0 } as any,
                    HRHB: { support_level: 60, override_authority: 0 } as any,
                },
                strategic_dimensions: {
                    RS: {} as any, RBiH: {} as any, HRHB: {} as any,
                },
            } as any,
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {},
        } as unknown as GameState['political'],
    } as unknown as GameState;
}

describe('Chain 5 — RS Max Aggression: historical path fires nothing', () => {
    it('no Chain 5 csq_ event fires when rs_strategic_goals = all_six (historical)', () => {
        const state = makeRSChainState(8, { flags: { rs_strategic_goals: 'all_six' } });
        evaluateEvents(state, rng, 8, CSQ_EVENTS);
        const fired = state.military.fired_event_ids ?? [];
        expect(fired).not.toContain('csq_accelerated_camps_discovery_1992');
        expect(fired).not.toContain('csq_early_war_crimes_tribunal_1993');
    });

    it('no Chain 5 csq_ event fires when rs_strategic_goals = selective', () => {
        const state = makeRSChainState(40, {
            flags: { rs_strategic_goals: 'selective' },
            rsWarCrimes: 20, // even with high war crimes, wrong flag value → no fire
        });
        evaluateEvents(state, rng, 40, CSQ_EVENTS);
        expect(state.military.fired_event_ids).not.toContain('csq_early_war_crimes_tribunal_1993');
    });
});

describe('Chain 5 — RS Max Aggression: ahistorical path fires chain', () => {
    it('csq_accelerated_camps_discovery_1992 fires w6-w12 and bumps RS war_crimes_events', () => {
        const state = makeRSChainState(8, { flags: { rs_strategic_goals: 'aggressive' } });
        evaluateEvents(state, rng, 8, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_accelerated_camps_discovery_1992');
        expect((state.military.negotiation as any).capital.RS.war_crimes_events).toBe(2);
        expect(state.military.event_flags?.camps_revealed_early).toBe(true);
    });

    it('csq_early_war_crimes_tribunal_1993 requires war_crimes_above RS 5', () => {
        // War crimes = 3 → tribunal does NOT fire
        const below = makeRSChainState(40, {
            flags: { rs_strategic_goals: 'aggressive' },
            rsWarCrimes: 3,
        });
        evaluateEvents(below, rng, 40, CSQ_EVENTS);
        expect(below.military.fired_event_ids).not.toContain('csq_early_war_crimes_tribunal_1993');

        // War crimes = 7 → tribunal fires; patron_pressure RS applies
        const above = makeRSChainState(40, {
            flags: { rs_strategic_goals: 'aggressive' },
            rsWarCrimes: 7,
        });
        evaluateEvents(above, rng, 40, CSQ_EVENTS);
        expect(above.military.fired_event_ids).toContain('csq_early_war_crimes_tribunal_1993');
        expect((above.military.negotiation as any).patron_relationships.RS.support_level).toBe(60);
        expect(above.military.event_flags?.icty_mandate_expanded).toBe(true);
    });

    it('csq_accelerated_safe_areas_1993 requires prior tribunal event and pushes scope_restriction', () => {
        // Without prior tribunal → does NOT fire
        const noPrior = makeRSChainState(40, { flags: { rs_strategic_goals: 'aggressive' } });
        evaluateEvents(noPrior, rng, 40, CSQ_EVENTS);
        expect(noPrior.military.fired_event_ids).not.toContain('csq_accelerated_safe_areas_1993');

        // With prior tribunal fired (and in w35-w55 window) → fires and blocks RS ops in enclave munis
        const withPrior = makeRSChainState(40, {
            flags: { rs_strategic_goals: 'aggressive' },
            firedEvents: ['csq_early_war_crimes_tribunal_1993'],
        });
        evaluateEvents(withPrior, rng, 40, CSQ_EVENTS);
        expect(withPrior.military.fired_event_ids).toContain('csq_accelerated_safe_areas_1993');
        const restrictions = withPrior.military.event_constraints?.scope_restrictions ?? [];
        const rsBlock = restrictions.find(r =>
            r.faction === 'RS' && r.reason === 'accelerated_un_safe_areas_with_defence_mandate',
        );
        expect(rsBlock).toBeDefined();
        expect(rsBlock?.blocked_municipalities).toEqual(['bihac', 'srebrenica', 'gorazde', 'zepa']);
        // expires_turn stamped as currentTurn + duration_turns = 40 + 40 = 80
        expect(rsBlock?.expires_turn).toBe(80);
    });

    it('csq_early_nato_threshold_1994 requires war_crimes_above RS 10 and pushes aggression_modifier', () => {
        // War crimes = 8 → does NOT fire
        const below = makeRSChainState(90, {
            flags: { rs_strategic_goals: 'aggressive' },
            rsWarCrimes: 8,
        });
        evaluateEvents(below, rng, 90, CSQ_EVENTS);
        expect(below.military.fired_event_ids).not.toContain('csq_early_nato_threshold_1994');

        // War crimes = 12 → fires; aggression_modifier -0.15 for RS lands
        const above = makeRSChainState(90, {
            flags: { rs_strategic_goals: 'aggressive' },
            rsWarCrimes: 12,
        });
        evaluateEvents(above, rng, 90, CSQ_EVENTS);
        expect(above.military.fired_event_ids).toContain('csq_early_nato_threshold_1994');
        const mods = above.military.event_aggression_modifiers ?? [];
        const rsMod = mods.find(m => m.faction === 'RS' && m.delta === -0.15);
        expect(rsMod).toBeDefined();
        expect(rsMod?.expires_turn).toBe(120); // turn 90 + duration 30
        expect(above.military.event_flags?.early_nato_threshold_lowered).toBe(true);
    });

    it('all four Chain 5 events are present in the loaded registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_accelerated_camps_discovery_1992')).toBe(true);
        expect(ids.has('csq_early_war_crimes_tribunal_1993')).toBe(true);
        expect(ids.has('csq_accelerated_safe_areas_1993')).toBe(true);
        expect(ids.has('csq_early_nato_threshold_1994')).toBe(true);
    });
});

// ─── Chain 1 — No Drina Cleansing → Partisan Rear ────────────────────────
//
// Chain 1 gates on `rs_strategic_goals = selective`. Historical path uses
// `all_six`, so all four csq_drina_* events are calibration-safe-by-construction.
// The partisan_resistance anchor also requires `territory_percentage: RS above
// 0.40`; we populate political_controllers with a 60/40 RS split.

function makeChain1State(
    turn: number,
    opts: {
        flags?: Record<string, string | number | boolean>;
        firedEvents?: string[];
        rsTerritoryShare?: number; // 0..1 fraction of OSIDs assigned to RS
    } = {},
): GameState {
    const share = opts.rsTerritoryShare ?? 0.60;
    // Build a 10-OSID synthetic political map; RS controls `share * 10` of them.
    const pc: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
        pc[`op:syn:${i}`] = i < Math.round(share * 10) ? 'RS' : 'RBiH';
    }
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RS', seed: 'csq1' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [...(opts.firedEvents ?? [])],
            event_flags: { ...(opts.flags ?? {}) },
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
            negotiation: {
                capital: {
                    RBiH: { war_crimes_events: 0 } as any,
                    RS: { war_crimes_events: 0 } as any,
                    HRHB: { war_crimes_events: 0 } as any,
                },
                patron_relationships: {
                    RS: { support_level: 70, override_authority: 0 } as any,
                    RBiH: { support_level: 50, override_authority: 0 } as any,
                    HRHB: { support_level: 60, override_authority: 0 } as any,
                },
                strategic_dimensions: { RS: {} as any, RBiH: {} as any, HRHB: {} as any },
            } as any,
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: pc,
        } as unknown as GameState['political'],
    } as unknown as GameState;
}

describe('Chain 1 — No Drina Cleansing: historical path fires nothing', () => {
    it('no Chain 1 csq_ event fires when rs_strategic_goals = all_six (historical)', () => {
        const state = makeChain1State(12, { flags: { rs_strategic_goals: 'all_six' } });
        evaluateEvents(state, rng, 12, CSQ_EVENTS);
        const fired = state.military.fired_event_ids ?? [];
        expect(fired).not.toContain('csq_drina_partisan_resistance_1992');
    });

    it('no Chain 1 csq_ event fires when rs_strategic_goals = aggressive', () => {
        const state = makeChain1State(12, { flags: { rs_strategic_goals: 'aggressive' } });
        evaluateEvents(state, rng, 12, CSQ_EVENTS);
        expect(state.military.fired_event_ids).not.toContain('csq_drina_partisan_resistance_1992');
    });
});

describe('Chain 1 — No Drina Cleansing: ahistorical path fires chain', () => {
    it('csq_drina_partisan_resistance_1992 fires w8-w20 with selective flag and RS territory >40%', () => {
        const state = makeChain1State(12, {
            flags: { rs_strategic_goals: 'selective' },
            rsTerritoryShare: 0.60,
        });
        evaluateEvents(state, rng, 12, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_drina_partisan_resistance_1992');
        const threats = state.military.guerrilla_threats ?? [];
        expect(threats.some(t => t.faction === 'RS')).toBe(true);
        expect(state.military.event_flags?.drina_partisan_resistance_active).toBe(true);
    });

    it('csq_drina_partisan_resistance_1992 does NOT fire when RS territory is below 40%', () => {
        const state = makeChain1State(12, {
            flags: { rs_strategic_goals: 'selective' },
            rsTerritoryShare: 0.30,
        });
        evaluateEvents(state, rng, 12, CSQ_EVENTS);
        expect(state.military.fired_event_ids).not.toContain('csq_drina_partisan_resistance_1992');
    });

    it('csq_drina_corps_pinned_1993 requires prior partisan_resistance and pushes a scope_restriction', () => {
        const noPrior = makeChain1State(50, {
            flags: { rs_strategic_goals: 'selective' },
            rsTerritoryShare: 0.60,
        });
        evaluateEvents(noPrior, rng, 50, CSQ_EVENTS);
        expect(noPrior.military.fired_event_ids).not.toContain('csq_drina_corps_pinned_1993');

        const withPrior = makeChain1State(50, {
            flags: { rs_strategic_goals: 'selective' },
            rsTerritoryShare: 0.60,
            firedEvents: ['csq_drina_partisan_resistance_1992'],
        });
        evaluateEvents(withPrior, rng, 50, CSQ_EVENTS);
        expect(withPrior.military.fired_event_ids).toContain('csq_drina_corps_pinned_1993');
        const restrictions = withPrior.military.event_constraints?.scope_restrictions ?? [];
        const rsBlock = restrictions.find(r =>
            r.faction === 'RS' && r.reason === 'drina_corps_fixed_rear_security',
        );
        expect(rsBlock).toBeDefined();
        expect(rsBlock?.blocked_municipalities).toEqual(['srebrenica', 'zepa', 'gorazde']);
    });

    it('csq_drina_population_resilience_1993 sets the drina_refugee_wave_suppressed flag', () => {
        const state = makeChain1State(45, {
            flags: { rs_strategic_goals: 'selective' },
            rsTerritoryShare: 0.60,
            firedEvents: ['csq_drina_partisan_resistance_1992'],
        });
        evaluateEvents(state, rng, 45, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_drina_population_resilience_1993');
        expect(state.military.event_flags?.drina_refugee_wave_suppressed).toBe(true);
        const mods = state.military.recruitment_modifiers ?? [];
        const rbihMod = mods.find(m => m.faction === 'RBiH' && m.pool_multiplier === 1.08);
        expect(rbihMod).toBeDefined();
    });

    it('all four Chain 1 events are present in the loaded registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_drina_partisan_resistance_1992')).toBe(true);
        expect(ids.has('csq_drina_supply_disruption_1993')).toBe(true);
        expect(ids.has('csq_drina_corps_pinned_1993')).toBe(true);
        expect(ids.has('csq_drina_population_resilience_1993')).toBe(true);
    });
});

// ─── Chain 3 — Srebrenica Survives → No Deliberate Force ─────────────────
//
// Chain 3 gates on `srebrenica_enclave_formed = true` AND `flag_not_set:
// srebrenica_fell`. Historical path: enclave forms AND falls, so
// flag_not_set is false → no Chain 3 event fires. Ahistorical path: enclave
// survives.
//
// Canon review note (2026-04-22): `csq_srebrenica_stalemate_1995` must NOT
// grant RBiH +5 international_standing. The only canon-legal upside is the
// non-firing of `srebrenica_genocide_1995`. See
// docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md §L60.

describe('Chain 3 — Srebrenica Survives: historical path fires nothing', () => {
    it('historical source events write the flags consumed by Chain 3 predicates', () => {
        const srebrenicaFalls = EVENT_BY_ID.get('srebrenica_falls_1995');
        const deliberateForce = EVENT_BY_ID.get('nato_deliberate_force_1995');

        expect(srebrenicaFalls?.sets_flags?.srebrenica_fell).toBe(true);
        expect(deliberateForce?.sets_flags?.nato_deliberate_force_occurred).toBe(true);
    });

    it('no Chain 3 csq_ event fires when srebrenica_fell is set (historical)', () => {
        const state = makeChain1State(175, {
            flags: { srebrenica_enclave_formed: true, srebrenica_fell: true },
        });
        evaluateEvents(state, rng, 175, CSQ_EVENTS);
        const fired = state.military.fired_event_ids ?? [];
        expect(fired).not.toContain('csq_srebrenica_stalemate_1995');
        expect(fired).not.toContain('csq_enclave_drain_continues_1995');
        expect(fired).not.toContain('csq_prolonged_war_exhaustion_1995');
    });

    it('csq_prolonged_war_exhaustion_1995 does not fire when Deliberate Force occurred', () => {
        const state = makeChain1State(185, {
            flags: { srebrenica_enclave_formed: true, nato_deliberate_force_occurred: true },
        });
        evaluateEvents(state, rng, 185, CSQ_EVENTS);
        expect(state.military.fired_event_ids).not.toContain('csq_prolonged_war_exhaustion_1995');
    });
});

describe('Chain 3 — Srebrenica Survives: ahistorical path fires chain', () => {
    it('csq_srebrenica_stalemate_1995 fires w170-w190 when enclave formed but not fallen', () => {
        const state = makeChain1State(175, {
            flags: { srebrenica_enclave_formed: true },
        });
        evaluateEvents(state, rng, 175, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_srebrenica_stalemate_1995');
        expect(state.military.event_flags?.srebrenica_stalemate).toBe(true);
    });

    it('csq_srebrenica_stalemate_1995 does NOT grant RBiH +5 international_standing (canon gate)', () => {
        const state = makeChain1State(175, {
            flags: { srebrenica_enclave_formed: true },
        });
        evaluateEvents(state, rng, 175, CSQ_EVENTS);
        // Dimension_shift side channel reflects in military.dimension_shifts_log
        // (applyEventEffects pathway). Alternative: inspect CSQ_EVENTS registry.
        const stalemate = CSQ_EVENTS.find(e => e.id === 'csq_srebrenica_stalemate_1995')!;
        const shifts = stalemate.dimension_shifts ?? [];
        const rbihStanding = shifts.find(
            s => s.faction === 'RBiH' && s.dimension === 'international_standing',
        );
        expect(rbihStanding).toBeUndefined();
        // The ONLY dimension shift on stalemate is RS military_credibility -5.
        expect(shifts).toEqual([
            { faction: 'RS', dimension: 'military_credibility', delta: -5 },
        ]);
    });

    it('csq_enclave_drain_continues_1995 requires prior stalemate and pins Drina Corps', () => {
        const withPrior = makeChain1State(180, {
            flags: { srebrenica_enclave_formed: true },
            firedEvents: ['csq_srebrenica_stalemate_1995'],
        });
        evaluateEvents(withPrior, rng, 180, CSQ_EVENTS);
        expect(withPrior.military.fired_event_ids).toContain('csq_enclave_drain_continues_1995');
        const restrictions = withPrior.military.event_constraints?.scope_restrictions ?? [];
        const rsBlock = restrictions.find(r =>
            r.faction === 'RS' && r.reason === 'drina_corps_fixed_on_srebrenica_siege',
        );
        expect(rsBlock).toBeDefined();
    });

    it('csq_prolonged_war_exhaustion_1995 fires when both srebrenica_fell and nato_deliberate_force_occurred are unset', () => {
        const state = makeChain1State(185, {
            flags: { srebrenica_enclave_formed: true },
        });
        evaluateEvents(state, rng, 185, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_prolonged_war_exhaustion_1995');
        // Three-faction exhaustion: recruitment_modifier 0.80 for each faction
        const mods = state.military.recruitment_modifiers ?? [];
        const rbihMod = mods.find(m => m.faction === 'RBiH' && m.pool_multiplier === 0.80);
        const rsMod = mods.find(m => m.faction === 'RS' && m.pool_multiplier === 0.80);
        const hrhbMod = mods.find(m => m.faction === 'HRHB' && m.pool_multiplier === 0.80);
        expect(rbihMod).toBeDefined();
        expect(rsMod).toBeDefined();
        expect(hrhbMod).toBeDefined();
    });

    it('all four Chain 3 events are present in the loaded registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_srebrenica_stalemate_1995')).toBe(true);
        expect(ids.has('csq_enclave_drain_continues_1995')).toBe(true);
        expect(ids.has('csq_alternative_nato_trigger_1995')).toBe(true);
        expect(ids.has('csq_prolonged_war_exhaustion_1995')).toBe(true);
    });
});

// ─── Chain 2 — Alliance Holds → No Croat-Bosniak War ─────────────────────
//
// Chain 2 gates on `hrhb_political_goal = united_front`. Historical response
// ordering for `hrhb_political_goal` was fixed in the same commit that lands
// this chain: `croat_republic` is now the first response option so the
// `bot_response_logic: 'historical'` path (which picks option A) sets the
// flag to `croat_republic` — the historically-accurate HRHB trajectory —
// and Chain 2 does NOT fire on the historical baseline.

describe('Chain 2 — Alliance Holds: historical path fires nothing', () => {
    it('no Chain 2 csq_ event fires when hrhb_political_goal = croat_republic (historical)', () => {
        const state = makeChain1State(8, { flags: { hrhb_political_goal: 'croat_republic' } });
        evaluateEvents(state, rng, 8, CSQ_EVENTS);
        const fired = state.military.fired_event_ids ?? [];
        expect(fired).not.toContain('csq_joint_operations_agreement_1992');
    });

    it('no Chain 2 csq_ event fires when hrhb_political_goal = strategic_ambiguity', () => {
        const state = makeChain1State(8, { flags: { hrhb_political_goal: 'strategic_ambiguity' } });
        evaluateEvents(state, rng, 8, CSQ_EVENTS);
        expect(state.military.fired_event_ids).not.toContain('csq_joint_operations_agreement_1992');
    });
});

describe('Chain 2 — Alliance Holds: ahistorical path fires chain', () => {
    it('csq_joint_operations_agreement_1992 fires w6-w12 under united_front and locks alliance at 0.50', () => {
        const state = makeChain1State(8, { flags: { hrhb_political_goal: 'united_front' } });
        evaluateEvents(state, rng, 8, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_joint_operations_agreement_1992');
        const locks = state.military.alliance_locks ?? [];
        const floorLock = locks.find(l => l.mode === 'floor' && l.value === 0.50);
        expect(floorLock).toBeDefined();
        expect(state.military.event_flags?.joint_operations_agreement_active).toBe(true);
    });

    it('csq_zagreb_displeasure_1993 fires w30-w50 and reduces HRHB supply + patron', () => {
        const state = makeChain1State(40, {
            flags: { hrhb_political_goal: 'united_front' },
            firedEvents: ['csq_joint_operations_agreement_1992'],
        });
        evaluateEvents(state, rng, 40, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_zagreb_displeasure_1993');
    });

    it('csq_territorial_friction_1993 requires prior joint_ops AND RBiH territory > 30%', () => {
        const belowTerritory = makeChain1State(50, {
            flags: { hrhb_political_goal: 'united_front' },
            firedEvents: ['csq_joint_operations_agreement_1992'],
            rsTerritoryShare: 0.80, // → RBiH share ≈ 20%, below threshold
        });
        evaluateEvents(belowTerritory, rng, 50, CSQ_EVENTS);
        expect(belowTerritory.military.fired_event_ids).not.toContain('csq_territorial_friction_1993');

        const aboveTerritory = makeChain1State(50, {
            flags: { hrhb_political_goal: 'united_front' },
            firedEvents: ['csq_joint_operations_agreement_1992'],
            rsTerritoryShare: 0.50, // → RBiH share = 50%, above threshold
        });
        evaluateEvents(aboveTerritory, rng, 50, CSQ_EVENTS);
        expect(aboveTerritory.military.fired_event_ids).toContain('csq_territorial_friction_1993');
    });

    it('csq_federation_early_1994 requires prior joint_ops AND alliance > 0.40', () => {
        const state = makeChain1State(80, {
            flags: { hrhb_political_goal: 'united_front' },
            firedEvents: ['csq_joint_operations_agreement_1992'],
        });
        // Bump alliance above 0.40 for the condition gate
        (state.political as any).war_alliance_rbih_hrhb = 0.60;
        evaluateEvents(state, rng, 80, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_federation_early_1994');
        expect(state.military.event_flags?.federation_formed_early).toBe(true);
    });

    it('csq_joint_offensive_1994 requires prior csq_federation_early_1994', () => {
        const noPrior = makeChain1State(90, { flags: { hrhb_political_goal: 'united_front' } });
        evaluateEvents(noPrior, rng, 90, CSQ_EVENTS);
        expect(noPrior.military.fired_event_ids).not.toContain('csq_joint_offensive_1994');

        const withPrior = makeChain1State(90, {
            flags: { hrhb_political_goal: 'united_front' },
            firedEvents: ['csq_joint_operations_agreement_1992', 'csq_federation_early_1994'],
        });
        evaluateEvents(withPrior, rng, 90, CSQ_EVENTS);
        expect(withPrior.military.fired_event_ids).toContain('csq_joint_offensive_1994');
        const mods = withPrior.military.event_aggression_modifiers ?? [];
        const rbihMod = mods.find(m => m.faction === 'RBiH' && m.delta === 0.10);
        const hrhbMod = mods.find(m => m.faction === 'HRHB' && m.delta === 0.10);
        expect(rbihMod).toBeDefined();
        expect(hrhbMod).toBeDefined();
    });

    it('all five Chain 2 events are present in the loaded registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_joint_operations_agreement_1992')).toBe(true);
        expect(ids.has('csq_zagreb_displeasure_1993')).toBe(true);
        expect(ids.has('csq_territorial_friction_1993')).toBe(true);
        expect(ids.has('csq_federation_early_1994')).toBe(true);
        expect(ids.has('csq_joint_offensive_1994')).toBe(true);
    });
});

describe('hrhb_political_goal historical ordering fix', () => {
    it('croat_republic is the FIRST response option (so bot_response_logic: historical picks it)', () => {
        // The base event lives in war_1992.json, not consequences.json. Pull it
        // out of the full loader registry to assert the fix landed.
        const event = ALL_EVENTS.find(e => e.id === 'hrhb_political_goal');
        expect(event).toBeDefined();
        expect(event?.response_options?.[0]?.id).toBe('croat_republic');
    });
});

// ─── Issue #9 — csq_hvo_central_bosnia_offensive_1993 ─────────────────────
//
// Per the corps-army-commander + war-or-game design consult (2026-04-23),
// the HVO Croat-Bosniak war requires:
//   1. alliance_change -1.0 + alliance_lock ceiling 0.0 (flips hostility)
//   2. morale/cohesion bump (un-sticks HVO brigades idle at morale 0)
//   3. aggression_modifier +0.25 + bot_priority_shift on central-Bosnia munis
// Phase 2 (ARBiH counter-offensive) emerges organically once alliance breaks.

describe('Issue #9 — csq_hvo_central_bosnia_offensive_1993', () => {
    it('does NOT fire before w48', () => {
        const state = makeChain1State(40, { flags: { hrhb_political_goal: 'croat_republic' } });
        evaluateEvents(state, rng, 40, CSQ_EVENTS);
        expect(state.military.fired_event_ids).not.toContain('csq_hvo_central_bosnia_offensive_1993');
    });

    it('does NOT fire when hrhb_political_goal is united_front', () => {
        const state = makeChain1State(52, { flags: { hrhb_political_goal: 'united_front' } });
        evaluateEvents(state, rng, 52, CSQ_EVENTS);
        expect(state.military.fired_event_ids).not.toContain('csq_hvo_central_bosnia_offensive_1993');
    });

    it('fires w48-w56 under croat_republic and lands all five effect kinds', () => {
        const state = makeChain1State(52, { flags: { hrhb_political_goal: 'croat_republic' } });
        state.political.war_alliance_rbih_hrhb = 1.0;
        evaluateEvents(state, rng, 52, CSQ_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_hvo_central_bosnia_offensive_1993');
        expect(state.military.event_flags?.hvo_arbih_war_active).toBe(true);
        expect(state.military.event_flags?.ahmici_1993).toBe(true);
        expect(state.political.war_alliance_rbih_hrhb).toBeLessThanOrEqual(HOSTILE_THRESHOLD);
        expect(isRbihHrhbAtWar(state)).toBe(true);
        expect(isRbihHrhbCombatEnabled(state)).toBe(true);

        // alliance_lock ceiling 0.0 at duration 60
        const locks = state.military.alliance_locks ?? [];
        const ceilingLock = locks.find(l => l.mode === 'ceiling' && l.value === 0.0);
        expect(ceilingLock).toBeDefined();
        expect(ceilingLock?.expires_turn).toBe(112);

        // aggression_modifier HRHB +0.25 duration 14
        const aggMods = state.military.event_aggression_modifiers ?? [];
        const hrhbAgg = aggMods.find(m => m.faction === 'HRHB' && m.delta === 0.25);
        expect(hrhbAgg).toBeDefined();
        expect(hrhbAgg?.expires_turn).toBe(66); // 52 + 14

        // bot_priority_shift HRHB with central-Bosnia munis
        const shifts = state.military.bot_priority_shifts ?? [];
        const hrhbShift = shifts.find(s => s.faction === 'HRHB' && (s.add_objectives ?? []).includes('vitez'));
        expect(hrhbShift).toBeDefined();
        expect(hrhbShift?.add_objectives).toEqual(
            expect.arrayContaining(['vitez', 'busovaca', 'novi_travnik', 'gornji_vakuf', 'prozor', 'kiseljak', 'travnik', 'kakanj', 'fojnica', 'mostar']),
        );
        expect(hrhbShift?.expires_turn).toBe(66); // 52 + 14
    });

    it('is present in the loaded registry', () => {
        const ids = new Set(CSQ_EVENTS.map(e => e.id));
        expect(ids.has('csq_hvo_central_bosnia_offensive_1993')).toBe(true);
    });
});
