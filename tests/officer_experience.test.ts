import { describe, it, expect } from 'vitest';
import {
    applyOperationExperience,
    gradeStarsToOutcome,
    getFactionOfficerMaturity,
    updateFactionOfficerMaturity,
    checkHeroicStand,
    checkDefeatism,
} from '../src/sim/combat/officer_experience.js';
import { getFrictionChance, checkWarlordFriction } from '../src/sim/combat/warlord_friction.js';
import type { GameState } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';

function makeMinimalState(overrides?: Partial<GameState>): GameState {
    return {
        meta: { turn: 10, phase: 'war', scenario_id: 'test', player_faction: 'RBiH' },
        political: {} as GameState['political'],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {} as any,
            front_posture_regions: {} as any,
            front_pressure: {},
            militia_pools: {},
            named_officer_data: [],
            named_officers: {},
        },
        displacement: {} as any,
        ...overrides,
    } as GameState;
}

function addOfficer(
    state: GameState,
    id: string,
    faction: string,
    competence: number,
    opts?: Partial<NamedOfficer> & Partial<{ status: string; assigned_corps_id: string | null }>,
): void {
    const data: NamedOfficer = {
        id,
        name: `Officer ${id}`,
        faction: faction as any,
        rank: 'corps_commander',
        competence,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: opts?.political_reliability ?? 3,
        available_from_turn: 0,
        origin: 'military',
        casualty_vulnerability: 0.1,
        can_improve: opts?.can_improve ?? true,
        improvement_rate: 0.05,
        pool_tier: 'tier_a',
        ...opts,
    };
    state.military.named_officer_data!.push(data);
    state.military.named_officers![id] = {
        officer_id: id,
        status: (opts?.status ?? 'active') as import('../src/state/officer_types.js').OfficerStatus,
        assigned_corps_id: opts?.assigned_corps_id ?? 'test_corps',
        turns_in_command: 5,
        battles: 3,
        victories: 2,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Experience gain per outcome type
// ═══════════════════════════════════════════════════════════════════════════

describe('applyOperationExperience', () => {
    it('grants experience scaled by outcome', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 2.0);

        applyOperationExperience(state, 'off1', 'decisive');
        const data = state.military.named_officer_data!.find(o => o.id === 'off1')!;
        // EXPERIENCE_BASE (0.1) * decisive (1.5) * RS (1.0) = 0.15
        expect(data.competence).toBeCloseTo(2.15, 4);
        expect(state.military.named_officers!['off1'].experience_points).toBeCloseTo(0.15, 4);
        expect(state.military.named_officers!['off1'].operations_commanded).toBe(1);
    });

    it('grants less experience for poor outcomes', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 2.0);

        applyOperationExperience(state, 'off1', 'catastrophic');
        const data = state.military.named_officer_data!.find(o => o.id === 'off1')!;
        // 0.1 * 0.1 = 0.01
        expect(data.competence).toBeCloseTo(2.01, 4);
    });

    it('caps competence at 5', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 4.95);

        applyOperationExperience(state, 'off1', 'decisive');
        const data = state.military.named_officer_data!.find(o => o.id === 'off1')!;
        expect(data.competence).toBe(5);
    });

    it('does not grant experience when can_improve is false', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 2.0, { can_improve: false });

        applyOperationExperience(state, 'off1', 'decisive');
        const data = state.military.named_officer_data!.find(o => o.id === 'off1')!;
        expect(data.competence).toBe(2.0);
        // operations_commanded still tracks
        expect(state.military.named_officers!['off1'].operations_commanded).toBe(1);
    });

    it('shifts aggressiveness up and defensive_skill down', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 2.0, { aggressiveness: 3, defensive_skill: 3 });

        applyOperationExperience(state, 'off1', 'victory');
        const data = state.military.named_officer_data!.find(o => o.id === 'off1')!;
        expect(data.aggressiveness).toBeCloseTo(3.05, 4);
        expect(data.defensive_skill).toBeCloseTo(2.98, 4);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ARBiH learning multiplier
// ═══════════════════════════════════════════════════════════════════════════

describe('ARBiH learning multiplier', () => {
    it('applies 1.5x multiplier to RBiH officers', () => {
        const state = makeMinimalState();
        addOfficer(state, 'arbih1', 'RBiH', 2.0);
        addOfficer(state, 'rs1', 'RS', 2.0);

        applyOperationExperience(state, 'arbih1', 'victory');
        applyOperationExperience(state, 'rs1', 'victory');

        const arbihData = state.military.named_officer_data!.find(o => o.id === 'arbih1')!;
        const rsData = state.military.named_officer_data!.find(o => o.id === 'rs1')!;
        // RBiH: 0.1 * 1.2 * 1.5 = 0.18; RS: 0.1 * 1.2 * 1.0 = 0.12
        expect(arbihData.competence).toBeCloseTo(2.18, 4);
        expect(rsData.competence).toBeCloseTo(2.12, 4);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Faction officer maturity
// ═══════════════════════════════════════════════════════════════════════════

describe('getFactionOfficerMaturity', () => {
    it('returns average competence of active officers', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 4.0);
        addOfficer(state, 'off2', 'RS', 2.0);
        addOfficer(state, 'off3', 'RBiH', 3.0); // different faction

        expect(getFactionOfficerMaturity(state, 'RS')).toBeCloseTo(3.0, 4);
    });

    it('returns 3.0 when no active officers', () => {
        const state = makeMinimalState();
        expect(getFactionOfficerMaturity(state, 'RS')).toBe(3.0);
    });
});

describe('updateFactionOfficerMaturity', () => {
    it('populates faction_officer_maturity on state', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 4.0);

        updateFactionOfficerMaturity(state);
        expect(state.military.faction_officer_maturity).toBeDefined();
        expect(state.military.faction_officer_maturity!['RS']).toBe(4.0);
        expect(state.military.faction_officer_maturity!['RBiH']).toBe(3.0); // no officers → default
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Grade stars to outcome mapping
// ═══════════════════════════════════════════════════════════════════════════

describe('gradeStarsToOutcome', () => {
    it('maps star levels to outcome labels', () => {
        expect(gradeStarsToOutcome(5)).toBe('decisive');
        expect(gradeStarsToOutcome(4)).toBe('victory');
        expect(gradeStarsToOutcome(3)).toBe('costly');
        expect(gradeStarsToOutcome(2)).toBe('stalemate');
        expect(gradeStarsToOutcome(1)).toBe('repulsed');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Heroic stand and defeatism
// ═══════════════════════════════════════════════════════════════════════════

describe('checkHeroicStand', () => {
    it('triggers at 3:1+ defense ratio', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 3.0, { aggressiveness: 2 });

        const result = checkHeroicStand(state, 'off1', 3.5);
        expect(result.triggered).toBe(true);
        expect(result.aggressiveness_gain).toBe(1);
        const data = state.military.named_officer_data!.find(o => o.id === 'off1')!;
        expect(data.aggressiveness).toBe(3);
    });

    it('does not trigger below 3:1', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 3.0);

        const result = checkHeroicStand(state, 'off1', 2.5);
        expect(result.triggered).toBe(false);
    });
});

describe('checkDefeatism', () => {
    it('triggers at 3+ consecutive failures', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 3.0);

        const result = checkDefeatism(state, 'off1', 3);
        expect(result.triggered).toBe(true);
        expect(result.competence_loss).toBeCloseTo(0.3);
        const data = state.military.named_officer_data!.find(o => o.id === 'off1')!;
        expect(data.competence).toBeCloseTo(2.7, 4);
    });

    it('does not trigger below 3 failures', () => {
        const state = makeMinimalState();
        addOfficer(state, 'off1', 'RS', 3.0);

        const result = checkDefeatism(state, 'off1', 2);
        expect(result.triggered).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Warlord friction
// ═══════════════════════════════════════════════════════════════════════════

describe('getFrictionChance', () => {
    it('returns 0 for reliability >= 3', () => {
        expect(getFrictionChance(3)).toBe(0);
        expect(getFrictionChance(4)).toBe(0);
        expect(getFrictionChance(5)).toBe(0);
    });

    it('returns scaled chance for low reliability', () => {
        expect(getFrictionChance(2)).toBeCloseTo(0.05);
        expect(getFrictionChance(1)).toBeCloseTo(0.10);
    });
});

describe('checkWarlordFriction', () => {
    it('is deterministic via deterministicRandom', () => {
        const state1 = makeMinimalState();
        addOfficer(state1, 'warlord1', 'RBiH', 2.0, { political_reliability: 1 });

        const state2 = makeMinimalState();
        addOfficer(state2, 'warlord1', 'RBiH', 2.0, { political_reliability: 1 });

        const r1 = checkWarlordFriction(state1);
        const r2 = checkWarlordFriction(state2);

        // Same inputs → same output
        expect(r1.events.length).toBe(r2.events.length);
        if (r1.events.length > 0) {
            expect(r1.events[0].type).toBe(r2.events[0].type);
        }
    });

    it('stores friction events on state', () => {
        const state = makeMinimalState();
        addOfficer(state, 'warlord1', 'RBiH', 2.0, { political_reliability: 1 });

        checkWarlordFriction(state);
        expect(state.military.friction_events).toBeDefined();
    });
});
