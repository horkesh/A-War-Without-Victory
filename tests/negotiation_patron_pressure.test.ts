import { describe, it, expect } from 'vitest';
import {
    updatePatronPressure,
    computeOverrideAuthority,
    getTerritoryLossRate,
    getPatronExhaustion,
    getMilitaryStrengthRatio,
    getRecentDefeats,
    SANCTIONS_OVERRIDE_BONUS,
    MAX_TERRITORY_LOSS_OVERRIDE,
    MAX_WAR_CRIMES_OVERRIDE,
    MAX_PATRON_EXHAUSTION_OVERRIDE,
    MAX_MILITARY_STRENGTH_REDUCTION,
    MAX_RECENT_DEFEATS_OVERRIDE,
    computeDrinaCleansingOverride,
    DRINA_CLEANSING_OVERRIDE_PEAK,
    DRINA_CLEANSING_OVERRIDE_FLOOR,
    DRINA_CLEANSING_DECAY_WINDOW,
} from '../src/sim/negotiation/patron_pressure.js';
import {
    evaluatePatronEvents,
    applyPatronEvent,
    CONTACT_GROUP_REJECTION,
    SREBRENICA_AFTERMATH,
    NATO_BOMBING,
    WASHINGTON_AGREEMENT,
} from '../src/sim/negotiation/patron_events.js';
import {
    createEmptyCapital,
    createDefaultPatronRelationship,
} from '../src/state/negotiation_types.js';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type { NegotiationState, PatronRelationship, NegotiationBreakdown } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeNegotiationState(overrides: Partial<NegotiationState> = {}): NegotiationState {
    const capital: Record<string, NegotiationBreakdown> = {
        RBiH: createEmptyCapital(),
        RS: createEmptyCapital(),
        HRHB: createEmptyCapital(),
    };
    const patron_relationships: Record<string, PatronRelationship> = {
        RBiH: createDefaultPatronRelationship('RBiH'),
        RS: createDefaultPatronRelationship('RS'),
        HRHB: createDefaultPatronRelationship('HRHB'),
    };
    return {
        capital,
        patron_relationships,
        peace_plan_history: [],
        strategic_dimensions: initializeStrategicDimensions(),
        ...overrides,
    };
}

function makeState(overrides: {
    turn?: number;
    war_start_turn?: number;
    negotiation?: Partial<NegotiationState>;
    formations?: Record<string, any>;
    turn_summaries?: any[];
} = {}): GameState {
    const neg = makeNegotiationState(overrides.negotiation);
    return {
        meta: {
            turn: overrides.turn ?? 10,
            phase: 'war',
            seed: 1,
            date: '1992-06-15',
            war_start_turn: overrides.war_start_turn ?? 0,
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: overrides.formations ?? {},
            negotiation: neg,
        },
        political: { political_controllers: {} },
        displacement: {},
        turn_summaries: overrides.turn_summaries ?? [],
    } as unknown as GameState;
}

function makeTurnSummary(turn: number, rsNet: number) {
    return {
        turn,
        territory_net: { RS: rsNet },
        battles: [],
        notable_flips: [],
        displacement_total: 0,
        displacement_by_ethnicity: {},
        decoration_awards: [],
        arc_transitions: [],
        formation_spawns: [],
        formation_destructions: [],
        supply_deltas: {},
        heavy_munitions_deltas: {},
        notable_events: [],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Override Authority Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Patron Pressure — Override Authority', () => {
    it('sanctions increase override authority by 30', () => {
        const state = makeState();
        const pr = state.military.negotiation!.patron_relationships.RS;
        const cap = state.military.negotiation!.capital.RS;

        // Without sanctions
        pr.sanctions_active = false;
        const withoutSanctions = computeOverrideAuthority(state, 'RS', pr, cap);

        // With sanctions
        pr.sanctions_active = true;
        const withSanctions = computeOverrideAuthority(state, 'RS', pr, cap);

        expect(withSanctions - withoutSanctions).toBeCloseTo(SANCTIONS_OVERRIDE_BONUS, 1);
    });

    it('strong military reduces override authority', () => {
        const formations: Record<string, any> = {};
        for (let i = 0; i < 80; i++) {
            formations[`rs_bde_${i}`] = {
                faction: 'RS',
                kind: 'brigade',
                personnel: 2000,
                lifecycle_status: 'active',
            };
        }
        const state = makeState({ formations });
        const pr = state.military.negotiation!.patron_relationships.RS;
        const cap = state.military.negotiation!.capital.RS;

        const authority = computeOverrideAuthority(state, 'RS', pr, cap);

        // With ~160k personnel (near RS peak of 155k), military strength ~1.0
        const strengthRatio = getMilitaryStrengthRatio(state, 'RS');
        expect(strengthRatio).toBeGreaterThan(0.9);

        // No other positive factors → authority should be clamped to 0
        expect(authority).toBe(0);
    });

    it('war crimes increase override authority up to cap', () => {
        const state = makeState();
        const pr = state.military.negotiation!.patron_relationships.RS;
        const cap = state.military.negotiation!.capital.RS;

        cap.war_crimes_events = 0;
        const base = computeOverrideAuthority(state, 'RS', pr, cap);

        cap.war_crimes_events = 3;
        const withCrimes = computeOverrideAuthority(state, 'RS', pr, cap);

        // 3 * 5 = 15, capped at MAX_WAR_CRIMES_OVERRIDE=15
        expect(withCrimes - base).toBe(MAX_WAR_CRIMES_OVERRIDE);
    });

    it('Drina cleansing override is bounded + decays from PEAK to FLOOR (not a permanent flat per-turn add)', () => {
        // Flag unset → no contribution
        const clean = makeState({ turn: 8 });
        expect(computeDrinaCleansingOverride(clean)).toBe(0);

        // Flag set at turn 8: first observation stamps the set-turn, contribution = PEAK
        const s = makeState({ turn: 8 });
        s.military.event_flags = { drina_cleansing_occurred: true };
        expect(computeDrinaCleansingOverride(s)).toBeCloseTo(DRINA_CLEANSING_OVERRIDE_PEAK, 5);

        // Midway through the decay window → between FLOOR and PEAK, strictly decreasing
        const mid = makeState({ turn: 8 + DRINA_CLEANSING_DECAY_WINDOW / 2 });
        mid.military.event_flags = { drina_cleansing_occurred: true, drina_cleansing_first_turn: 8 };
        const midVal = computeDrinaCleansingOverride(mid);
        expect(midVal).toBeLessThan(DRINA_CLEANSING_OVERRIDE_PEAK);
        expect(midVal).toBeGreaterThan(DRINA_CLEANSING_OVERRIDE_FLOOR);

        // Late war (well past the window) → holds at FLOOR, NOT an escalating value
        const late = makeState({ turn: 188 });
        late.military.event_flags = { drina_cleansing_occurred: true, drina_cleansing_first_turn: 8 };
        expect(computeDrinaCleansingOverride(late)).toBeCloseTo(DRINA_CLEANSING_OVERRIDE_FLOOR, 5);

        // Bound: never exceeds PEAK regardless of elapsed turns
        for (const turn of [8, 20, 60, 120, 188]) {
            const st = makeState({ turn });
            st.military.event_flags = { drina_cleansing_occurred: true, drina_cleansing_first_turn: 8 };
            const v = computeDrinaCleansingOverride(st);
            expect(v).toBeLessThanOrEqual(DRINA_CLEANSING_OVERRIDE_PEAK);
            expect(v).toBeGreaterThanOrEqual(DRINA_CLEANSING_OVERRIDE_FLOOR);
        }
    });

    it('Drina override only applies to RS', () => {
        const s = makeState({ turn: 100 });
        s.military.event_flags = { drina_cleansing_occurred: true, drina_cleansing_first_turn: 8 };
        const rsPr = s.military.negotiation!.patron_relationships.RS;
        const rsCap = s.military.negotiation!.capital.RS;
        const rbihPr = s.military.negotiation!.patron_relationships.RBiH;
        const rbihCap = s.military.negotiation!.capital.RBiH;

        const rsAuth = computeOverrideAuthority(s, 'RS', rsPr, rsCap);
        const rbihAuth = computeOverrideAuthority(s, 'RBiH', rbihPr, rbihCap);
        // RS picks up the (now floored) Drina contribution; RBiH does not.
        expect(rsAuth).toBeGreaterThan(rbihAuth);
    });

    it('override authority is clamped 0-100', () => {
        const state = makeState();
        const pr = state.military.negotiation!.patron_relationships.RS;
        const cap = state.military.negotiation!.capital.RS;

        // Max everything positive
        pr.sanctions_active = true;
        cap.war_crimes_events = 10;

        const authority = computeOverrideAuthority(state, 'RS', pr, cap);
        expect(authority).toBeLessThanOrEqual(100);
        expect(authority).toBeGreaterThanOrEqual(0);
    });

    it('override never goes below 0 even with strong military', () => {
        const formations: Record<string, any> = {};
        for (let i = 0; i < 100; i++) {
            formations[`rs_bde_${i}`] = {
                faction: 'RS',
                kind: 'brigade',
                personnel: 2000,
                lifecycle_status: 'active',
            };
        }
        const state = makeState({ formations });
        const pr = state.military.negotiation!.patron_relationships.RS;
        const cap = state.military.negotiation!.capital.RS;

        const authority = computeOverrideAuthority(state, 'RS', pr, cap);
        expect(authority).toBeGreaterThanOrEqual(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Patron Exhaustion Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Patron Pressure — Patron Exhaustion', () => {
    it('no exhaustion before week 52', () => {
        const state = makeState({ turn: 30, war_start_turn: 0 });
        const exhaustion = getPatronExhaustion(state, 'RS');
        expect(exhaustion).toBe(0);
    });

    it('exhaustion grows after week 52', () => {
        const state = makeState({ turn: 100, war_start_turn: 0 });
        const exhaustion = getPatronExhaustion(state, 'RS');
        expect(exhaustion).toBeGreaterThan(0);
        expect(exhaustion).toBeLessThanOrEqual(MAX_PATRON_EXHAUSTION_OVERRIDE);
    });

    it('RS patron exhausts faster than RBiH patron', () => {
        const state = makeState({ turn: 130, war_start_turn: 0 });
        const rsExhaustion = getPatronExhaustion(state, 'RS');
        const rbihExhaustion = getPatronExhaustion(state, 'RBiH');
        expect(rsExhaustion).toBeGreaterThan(rbihExhaustion);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Military Strength Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Patron Pressure — Military Strength', () => {
    it('returns 0 with no formations', () => {
        const state = makeState();
        expect(getMilitaryStrengthRatio(state, 'RS')).toBe(0);
    });

    it('returns close to 1 at peak strength', () => {
        const formations: Record<string, any> = {};
        for (let i = 0; i < 77; i++) {
            formations[`rs_bde_${i}`] = {
                faction: 'RS',
                kind: 'brigade',
                personnel: 2000,
                lifecycle_status: 'active',
            };
        }
        const state = makeState({ formations });
        const ratio = getMilitaryStrengthRatio(state, 'RS');
        expect(ratio).toBeGreaterThan(0.95);
        expect(ratio).toBeLessThanOrEqual(1);
    });

    it('ignores destroyed formations', () => {
        const formations: Record<string, any> = {
            rs_active: { faction: 'RS', kind: 'brigade', personnel: 2000, lifecycle_status: 'active' },
            rs_dead: { faction: 'RS', kind: 'brigade', personnel: 2000, lifecycle_status: 'destroyed' },
        };
        const state = makeState({ formations });
        const ratio = getMilitaryStrengthRatio(state, 'RS');
        expect(ratio).toBeCloseTo(2000 / 155000, 2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Recent Defeats Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Patron Pressure — Recent Defeats', () => {
    it('counts turns with negative territory_net', () => {
        const state = makeState({
            turn: 20,
            turn_summaries: [
                makeTurnSummary(15, -3),
                makeTurnSummary(17, -1),
                makeTurnSummary(19, 2),
            ],
        });
        expect(getRecentDefeats(state, 'RS')).toBe(2);
    });

    it('ignores defeats outside window', () => {
        const state = makeState({
            turn: 30,
            turn_summaries: [makeTurnSummary(5, -5)],
        });
        expect(getRecentDefeats(state, 'RS')).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// updatePatronPressure Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('updatePatronPressure', () => {
    it('updates override authority for all factions', () => {
        const state = makeState();
        const neg = state.military.negotiation!;
        const initialRS = neg.patron_relationships.RS.override_authority;

        neg.patron_relationships.RS.sanctions_active = true;
        updatePatronPressure(state);

        expect(neg.patron_relationships.RS.override_authority).toBeGreaterThan(initialRS);
    });

    it('decays support when sanctions active', () => {
        const state = makeState();
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS.sanctions_active = true;
        const initialSupport = neg.patron_relationships.RS.support_level;

        updatePatronPressure(state);

        expect(neg.patron_relationships.RS.support_level).toBeLessThan(initialSupport);
    });

    it('does not decay support when no sanctions', () => {
        const state = makeState();
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS.sanctions_active = false;
        const initialSupport = neg.patron_relationships.RS.support_level;

        updatePatronPressure(state);

        expect(neg.patron_relationships.RS.support_level).toBe(initialSupport);
    });

    it('does nothing when negotiation state missing', () => {
        const state = makeState();
        (state.military as any).negotiation = undefined;
        expect(() => updatePatronPressure(state)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Patron Events Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Patron Events', () => {
    it('Contact Group rejection triggers Belgrade sanctions on RS', () => {
        const state = makeState({
            turn: CONTACT_GROUP_REJECTION.trigger_week,
            war_start_turn: 0,
        });
        const neg = state.military.negotiation!;

        expect(neg.patron_relationships.RS.sanctions_active).toBe(false);
        evaluatePatronEvents(state);

        expect(neg.patron_relationships.RS.sanctions_active).toBe(true);
        expect(neg.patron_relationships.RS.override_authority).toBeGreaterThan(10);
        expect(neg.patron_relationships.RS.relationship_events).toContain('contact_group_rejection');
    });

    it('Srebrenica aftermath increases override for all factions', () => {
        const state = makeState({
            turn: SREBRENICA_AFTERMATH.trigger_week,
            war_start_turn: 0,
        });
        const neg = state.military.negotiation!;

        const rsOverrideBefore = neg.patron_relationships.RS.override_authority;
        const rbihOverrideBefore = neg.patron_relationships.RBiH.override_authority;
        const hrhbOverrideBefore = neg.patron_relationships.HRHB.override_authority;

        evaluatePatronEvents(state);

        expect(neg.patron_relationships.RS.override_authority).toBeGreaterThan(rsOverrideBefore);
        expect(neg.patron_relationships.RBiH.override_authority).toBeGreaterThan(rbihOverrideBefore);
        expect(neg.patron_relationships.HRHB.override_authority).toBeGreaterThan(hrhbOverrideBefore);
    });

    it('Srebrenica reduces RS international_standing dimension by 30', () => {
        const state = makeState({
            turn: SREBRENICA_AFTERMATH.trigger_week,
            war_start_turn: 0,
        });
        const neg = state.military.negotiation!;
        // Set international_standing base to 50, event_modifier to 0
        neg.strategic_dimensions!.RS.international_standing = { base_value: 50, event_modifier: 0, effective_value: 50 };

        evaluatePatronEvents(state);

        // humanitarian_delta of -30 now applies to strategic_dimensions.international_standing.event_modifier
        expect(neg.strategic_dimensions!.RS.international_standing.event_modifier).toBe(-30);
        expect(neg.strategic_dimensions!.RS.international_standing.effective_value).toBe(20);
    });

    it('NATO bombing reduces RS support by 20', () => {
        const state = makeState({
            turn: NATO_BOMBING.trigger_week,
            war_start_turn: 0,
        });
        const neg = state.military.negotiation!;
        const supportBefore = neg.patron_relationships.RS.support_level;

        evaluatePatronEvents(state);

        expect(neg.patron_relationships.RS.support_level).toBe(supportBefore - 20);
    });

    it('Washington Agreement sets HRHB override to at least 85', () => {
        const state = makeState({
            turn: WASHINGTON_AGREEMENT.trigger_week,
            war_start_turn: 0,
        });
        const neg = state.military.negotiation!;
        neg.patron_relationships.HRHB.override_authority = 30;

        evaluatePatronEvents(state);

        expect(neg.patron_relationships.HRHB.override_authority).toBeGreaterThanOrEqual(85);
    });

    it('events fire only once', () => {
        const state = makeState({
            turn: CONTACT_GROUP_REJECTION.trigger_week,
            war_start_turn: 0,
        });
        const neg = state.military.negotiation!;

        evaluatePatronEvents(state);
        const overrideAfterFirst = neg.patron_relationships.RS.override_authority;

        evaluatePatronEvents(state);
        expect(neg.patron_relationships.RS.override_authority).toBe(overrideAfterFirst);
    });

    it('events respect war_start_turn offset', () => {
        const state = makeState({
            turn: 128,
            war_start_turn: 10,
        });
        const neg = state.military.negotiation!;

        evaluatePatronEvents(state);

        // war week = 128-10 = 118 = Contact Group trigger
        expect(neg.patron_relationships.RS.relationship_events).toContain('contact_group_rejection');
    });

    it('events do not fire at wrong week', () => {
        const state = makeState({
            turn: CONTACT_GROUP_REJECTION.trigger_week + 1,
            war_start_turn: 0,
        });
        const neg = state.military.negotiation!;

        evaluatePatronEvents(state);

        expect(neg.patron_relationships.RS.relationship_events).not.toContain('contact_group_rejection');
    });

    it('does nothing when negotiation state missing', () => {
        const state = makeState();
        (state.military as any).negotiation = undefined;
        expect(() => evaluatePatronEvents(state)).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Historical Baseline Test
// ═══════════════════════════════════════════════════════════════════════════

describe('Historical Baseline — RS override trajectory', () => {
    it('RS starts low (~0-15), reaches high (70+) under Dayton conditions', () => {
        // Early war: default state, no factors
        const earlyState = makeState({ turn: 5, war_start_turn: 0 });
        const earlyPr = earlyState.military.negotiation!.patron_relationships.RS;
        const earlyCap = earlyState.military.negotiation!.capital.RS;
        const earlyOverride = computeOverrideAuthority(earlyState, 'RS', earlyPr, earlyCap);
        expect(earlyOverride).toBeLessThanOrEqual(15);

        // Late war: sanctions, war crimes, depleted military, recent defeats, patron exhaustion
        const lateState = makeState({
            turn: 188,
            war_start_turn: 0,
            formations: {
                rs_remnant: { faction: 'RS', kind: 'brigade', personnel: 800, lifecycle_status: 'active' },
            },
            turn_summaries: [
                makeTurnSummary(181, -5),
                makeTurnSummary(183, -8),
                makeTurnSummary(186, -3),
            ],
        });
        const latePr = lateState.military.negotiation!.patron_relationships.RS;
        const lateCap = lateState.military.negotiation!.capital.RS;

        latePr.sanctions_active = true;
        lateCap.war_crimes_events = 3;

        const lateOverride = computeOverrideAuthority(lateState, 'RS', latePr, lateCap);

        // sanctions=30, war_crimes=15, exhaustion~15, defeats(3 turns)=20 cap, minus tiny military
        // Total ~80
        expect(lateOverride).toBeGreaterThanOrEqual(70);
        expect(lateOverride).toBeLessThanOrEqual(100);
    });
});
