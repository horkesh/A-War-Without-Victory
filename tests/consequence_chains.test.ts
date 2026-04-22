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
        } as GameState['political'],
    } as unknown as GameState;
}

// Load the real consequences.json through the event loader to prove the
// loader wiring works end to end.
const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);
const CSQ_EVENTS = ALL_EVENTS.filter(e => e.id.startsWith('csq_'));

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

// ─── Chain 2 — Alliance Holds ────────────────────────────────────────────

function makeHRHBChainState(turn: number, flags: Record<string, string | number | boolean> = {}, territoryRBiH: number = 0.35): GameState {
    // Populate political_controllers so territory_percentage can evaluate.
    // territoryRBiH ≈ fraction of total OSIDs held by RBiH.
    const controllers: Record<string, string> = {};
    const totalOsids = 100;
    const rbihCount = Math.round(territoryRBiH * totalOsids);
    for (let i = 0; i < totalOsids; i++) {
        controllers[`op:m${i}:o${i}`] = i < rbihCount ? 'RBiH' : 'RS';
    }
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'HRHB', seed: 'csq2' } as GameState['meta'],
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
            fired_event_ids: [],
            event_flags: { ...flags },
            event_fire_counts: {},
            event_readiness: {},
            event_last_fired_turn: {},
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: controllers,
        } as GameState['political'],
    } as unknown as GameState;
}

describe('Chain 2 — Alliance Holds: historical path fires nothing', () => {
    it('no csq_ event fires when hrhb_political_goal = croat_republic (historical)', () => {
        const state = makeHRHBChainState(10, { hrhb_political_goal: 'croat_republic' });
        evaluateEvents(state, rng, 10, ALL_EVENTS);
        const firedCsq = (state.military.fired_event_ids ?? []).filter(id => id.startsWith('csq_'));
        // Chain 6 events don't gate on HRHB flags, but they require rbih_state_identity
        // which isn't set in this state either, so no csq_ should fire.
        expect(firedCsq).toHaveLength(0);
    });

    it('csq_joint_operations_agreement_1992 does NOT fire on croat_republic even in w6-w12 window', () => {
        const state = makeHRHBChainState(8, { hrhb_political_goal: 'croat_republic' });
        evaluateEvents(state, rng, 8, ALL_EVENTS);
        expect(state.military.fired_event_ids ?? []).not.toContain('csq_joint_operations_agreement_1992');
    });
});

describe('Chain 2 — Alliance Holds: ahistorical path fires chain', () => {
    it('csq_joint_operations_agreement_1992 fires w6-w12 and lands an alliance_lock floor', () => {
        const state = makeHRHBChainState(8, { hrhb_political_goal: 'united_front' });
        evaluateEvents(state, rng, 8, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_joint_operations_agreement_1992');
        const locks = state.military.alliance_locks ?? [];
        expect(locks).toHaveLength(1);
        expect(locks[0].mode).toBe('floor');
        expect(locks[0].value).toBe(0.50);
    });

    it('alliance_lock floor actually constrains alliance_change deltas in this chain', () => {
        const state = makeHRHBChainState(8, { hrhb_political_goal: 'united_front' });
        evaluateEvents(state, rng, 8, ALL_EVENTS);
        // Try to crater the alliance — the floor should save it.
        state.political.war_alliance_rbih_hrhb = 0.7;
        // Use the real applyEventEffects to apply alliance_change, which now
        // consults alliance_locks.
        applyEventEffects(state, [{ kind: 'alliance_change', delta: -2 }]);
        expect(state.political.war_alliance_rbih_hrhb).toBe(0.50);
    });

    it('csq_zagreb_displeasure_1993 fires w30-w50 under united_front', () => {
        const state = makeHRHBChainState(40, { hrhb_political_goal: 'united_front' });
        // Seed patron support so we can see the delta apply.
        state.military.negotiation = {
            patron_relationships: {
                HRHB: { support_level: 60, override_authority: 0 },
            } as any,
            capital: {} as any,
        } as any;
        evaluateEvents(state, rng, 40, ALL_EVENTS);
        expect(state.military.fired_event_ids).toContain('csq_zagreb_displeasure_1993');
        expect((state.military.negotiation as any).patron_relationships.HRHB.support_level).toBe(45);
    });

    it('csq_territorial_friction_1993 requires RBiH territory above 30%', () => {
        const lowTerr = makeHRHBChainState(50, { hrhb_political_goal: 'united_front' }, 0.20);
        evaluateEvents(lowTerr, rng, 50, ALL_EVENTS);
        expect(lowTerr.military.fired_event_ids ?? []).not.toContain('csq_territorial_friction_1993');

        const highTerr = makeHRHBChainState(50, { hrhb_political_goal: 'united_front' }, 0.40);
        evaluateEvents(highTerr, rng, 50, ALL_EVENTS);
        expect(highTerr.military.fired_event_ids).toContain('csq_territorial_friction_1993');
    });

    it('csq_federation_early_1994 requires alliance > 0.40', () => {
        const lowAlliance = makeHRHBChainState(80, { hrhb_political_goal: 'united_front' });
        lowAlliance.political.war_alliance_rbih_hrhb = 0.3;
        evaluateEvents(lowAlliance, rng, 80, ALL_EVENTS);
        expect(lowAlliance.military.fired_event_ids ?? []).not.toContain('csq_federation_early_1994');

        const highAlliance = makeHRHBChainState(80, { hrhb_political_goal: 'united_front' });
        highAlliance.political.war_alliance_rbih_hrhb = 0.6;
        evaluateEvents(highAlliance, rng, 80, ALL_EVENTS);
        expect(highAlliance.military.fired_event_ids).toContain('csq_federation_early_1994');
        expect(highAlliance.military.event_flags?.federation_formed_early).toBe(true);
    });

    it('csq_joint_offensive_1994 requires prior csq_federation_early_1994 to have fired', () => {
        const noFed = makeHRHBChainState(90, { hrhb_political_goal: 'united_front' });
        evaluateEvents(noFed, rng, 90, ALL_EVENTS);
        expect(noFed.military.fired_event_ids ?? []).not.toContain('csq_joint_offensive_1994');

        const withFed = makeHRHBChainState(90, { hrhb_political_goal: 'united_front' });
        withFed.military.fired_event_ids = ['csq_federation_early_1994'];
        evaluateEvents(withFed, rng, 90, ALL_EVENTS);
        expect(withFed.military.fired_event_ids).toContain('csq_joint_offensive_1994');
        // Aggression modifier landed for both RBiH and HRHB.
        const mods = withFed.military.event_aggression_modifiers ?? [];
        expect(mods.some(m => m.faction === 'RBiH' && m.delta === 0.10)).toBe(true);
        expect(mods.some(m => m.faction === 'HRHB' && m.delta === 0.10)).toBe(true);
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
        } as GameState['political'],
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
