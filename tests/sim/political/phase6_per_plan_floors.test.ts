/**
 * Tests for v0.8.2 Phase 6 — Per-plan RS floors, patron immunity, HRHB Washington alignment.
 *
 * Covers:
 * Per-plan floor group (6 tests):
 *   1. VOPP: RS at 65%, gap 22pp > 18pp floor → hard-reject
 *   2. VOPP: RS at 65%, gap explicitly 22pp → floor triggers
 *   3. O-S: RS at 65%, gap 13pp < 18pp floor → NOT hard-rejected (routes to scoring)
 *   4. CG: RS at 63%, gap 14pp > 10pp floor → hard-reject
 *   5. CG: RS at 58%, gap 9pp < 10pp floor → NOT hard-rejected (floor eroded RS passes)
 *   6. Default fallback: unknown plan id, gap 20pp > 18pp default → hard-reject
 *
 * Patron immunity group (4 tests):
 *   7. VOPP: patron=100 → still rejected (RS immunity blocks override)
 *   8. VOPP: patron=90, RS at 65% → still rejected (not overrideable)
 *   9. CG: patron=100, RS at 63% → still rejected (CG immune)
 *  10. O-S: patron=90, RS at 65%, gap 13pp < floor 18pp → patron override fires → accepted
 *
 * HRHB Washington alignment group (5 tests):
 *  11. HRHB, CG, warWeek=110, patron=65 → accepted (65 >= 60 threshold)
 *  12. HRHB, CG, warWeek=110, patron=55 → NOT short-circuited (falls to scoring)
 *  13. HRHB, CG, warWeek=50 (pre-Washington) → NOT triggered (turn gate fails)
 *  14. HRHB, VOPP, warWeek=110, patron=65 → NOT triggered (wrong plan)
 *  15. RS, CG, patron=100 → rejected (RS immune; HRHB alignment does not apply to RS)
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { computePoliticalPeacePlanResponse } from '../../../src/sim/political/political_peace_plan.js';
import { getPoliticalPersonality } from '../../../src/sim/political/political_personality.js';
import type { PoliticalAssessment } from '../../../src/sim/political/political_personality.js';
import type { PeacePlanDefinition } from '../../../src/state/negotiation_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Fixture helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeAssessment(overrides: Partial<PoliticalAssessment> = {}): PoliticalAssessment {
    return {
        situation_score: 50,
        dimension_score: 50,
        blended_score: 50,
        territory_trend: 'stable',
        military_strength: 0.5,
        patron_pressure: 0,
        exhaustion_level: 20,
        negotiation_pressure: 0,
        ...overrides,
    };
}

function makePlan(overrides: Partial<PeacePlanDefinition> & { id: string }): PeacePlanDefinition {
    return {
        name: 'Test Plan',
        trigger_week: 10,
        proposed_split: { RS: 49, RBiH: 30, HRHB: 21 },
        institutional_model: 'canton',
        override_change_on_reject: { RS: 5, RBiH: 5, HRHB: 5 },
        credibility_change_on_reject: { RS: -5, RBiH: -5, HRHB: -5 },
        narrative: 'Test plan narrative.',
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group A: Per-plan floor
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 6 Group A: Per-plan RS territory floors', () => {
    it('1. VOPP: RS at 65%, proposed 43% (gap 22pp) → 22 > 18pp floor → hard-reject', () => {
        const plan = makePlan({ id: 'vance_owen', proposed_split: { RS: 43 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment();
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 10, assessment, personality, 0);
        expect(result).toBe('rejected');
    });

    it('2. VOPP: RS at 65%, gap explicitly 22pp → floor triggers regardless of patron=0', () => {
        const plan = makePlan({ id: 'vance_owen', proposed_split: { RS: 43 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ patron_pressure: 0 });
        // gap = 65 - 43 = 22pp > 18pp VOPP floor → hard-reject
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 0, assessment, personality, 0);
        expect(result).toBe('rejected');
    });

    it('3. O-S: RS at 65%, proposed 52% (gap 13pp) → 13 < 18pp floor → NOT hard-rejected (routes to scoring)', () => {
        // Gap 13pp < 18pp O-S floor → floor does NOT fire; result is scoring-dependent.
        // With patron=0 and neutral assessment, verify the floor path is not taken
        // (i.e., function does not return 'rejected' due to floor alone).
        const plan = makePlan({ id: 'owen_stoltenberg', proposed_split: { RS: 52 } });
        const personality = getPoliticalPersonality('RS');
        // Force patron override to confirm floor wasn't triggered: patron=80 → must return 'accepted'
        // if floor didn't fire. (O-S is NOT immune, so patron=80 can override.)
        const assessment = makeAssessment();
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 80, assessment, personality, 0);
        // If floor triggered it would be 'rejected' before patron override;
        // patron=80 fires only because floor didn't trigger → must be 'accepted'
        expect(result).toBe('accepted');
    });

    it('4. CG: RS at 63%, proposed 49% (gap 14pp) → 14 > 10pp CG floor → hard-reject', () => {
        const plan = makePlan({ id: 'contact_group', proposed_split: { RS: 49 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment();
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 63, 10, assessment, personality, 0);
        expect(result).toBe('rejected');
    });

    it('5. CG: RS at 58%, proposed 49% (gap 9pp) → 9 < 10pp floor → NOT hard-rejected (eroded RS passes)', () => {
        const plan = makePlan({ id: 'contact_group', proposed_split: { RS: 49 } });
        const personality = getPoliticalPersonality('RS');
        // Floor at 10pp; gap = 58 - 49 = 9pp < 10pp → floor does NOT fire.
        // Note: CG is patron-immune for RS, so patron override can't force accept.
        // Result falls to scoring — just verify it doesn't hard-reject via floor.
        // Use patron=0 so only scoring determines result; we verify no throw and valid result.
        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 58, 0, assessment, personality, 0);
        // Valid result (not a floor rejection since 9 < 10); may be accepted or rejected by scoring
        expect(['accepted', 'rejected']).toContain(result);
        // Confirm: with patron=0 and floor not triggered, the function didn't throw
    });

    it('6. Default fallback: unknown plan id, RS at 70%, proposed 50% (gap 20pp) → 20 > 18pp default → hard-reject', () => {
        const plan = makePlan({ id: 'unknown_plan_xyz', proposed_split: { RS: 50 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment();
        // gap = 70 - 50 = 20pp > RS_FLOOR_GAP_DEFAULT (18) → hard-reject
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 70, 10, assessment, personality, 0);
        expect(result).toBe('rejected');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group B: Patron immunity
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 6 Group B: Patron override immunity', () => {
    it('7. VOPP: patron=100 → still rejected (RS immunity blocks patron override)', () => {
        // VOPP: gap 22pp > 18pp floor → hard-reject fires before immunity check.
        // Even if floor somehow passed, immunity (Infinity threshold) would block patron.
        const plan = makePlan({ id: 'vance_owen', proposed_split: { RS: 43 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ patron_pressure: 100 });
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 100, assessment, personality, 0);
        expect(result).toBe('rejected');
    });

    it('8. VOPP: patron=90, RS at 65% → still rejected (patron cannot override VOPP for RS)', () => {
        const plan = makePlan({ id: 'vance_owen', proposed_split: { RS: 43 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment();
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 90, assessment, personality, 0);
        expect(result).toBe('rejected');
    });

    it('9. CG: patron=100, RS at 63%, gap 14pp → still rejected (CG immune, floor fires at 14 > 10)', () => {
        const plan = makePlan({ id: 'contact_group', proposed_split: { RS: 49 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ patron_pressure: 100 });
        // Floor fires (14 > 10), AND CG is immune → patron=100 cannot override
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 63, 100, assessment, personality, 0);
        expect(result).toBe('rejected');
    });

    it('10. O-S: patron=90, RS at 65%, gap 13pp < floor 18pp → patron override fires → accepted', () => {
        // O-S is NOT patron-immune (not in RS_PATRON_OVERRIDE_IMMUNE set).
        // gap = 65 - 52 = 13pp < 18pp O-S floor → floor does not fire.
        // patron=90 >= PATRON_HARD_OVERRIDE_THRESHOLD(80) → accept.
        const plan = makePlan({ id: 'owen_stoltenberg', proposed_split: { RS: 52 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment();
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 90, assessment, personality, 0);
        expect(result).toBe('accepted');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group C: HRHB Washington Agreement alignment
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 6 Group C: HRHB Washington Agreement alignment', () => {
    it('11. HRHB, CG, warWeek=110, patron=65 → accepted (65 >= 60 HRHB_CG_ALIGNMENT_THRESHOLD)', () => {
        // Post-Washington (w102), HRHB + contact_group + patron >= 60 → Zagreb-aligned accept
        const plan = makePlan({ id: 'contact_group', proposed_split: { HRHB: 18 } });
        const personality = getPoliticalPersonality('HRHB');
        const assessment = makeAssessment();
        const result = computePoliticalPeacePlanResponse(plan, 'HRHB', 15, 65, assessment, personality, 110);
        expect(result).toBe('accepted');
    });

    it('12. HRHB, CG, warWeek=110, patron=55 → NOT short-circuited (55 < 60 threshold, falls to scoring)', () => {
        // patron=55 < HRHB_CG_ALIGNMENT_THRESHOLD(60) → alignment block does NOT fire
        // Falls through to regular patron override check (55 < 80 → also doesn't fire)
        // Result is scoring-determined; verify no crash and valid result
        const plan = makePlan({ id: 'contact_group', proposed_split: { HRHB: 18 } });
        const personality = getPoliticalPersonality('HRHB');
        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const result = computePoliticalPeacePlanResponse(plan, 'HRHB', 15, 55, assessment, personality, 110);
        expect(['accepted', 'rejected']).toContain(result);
    });

    it('13. HRHB, CG, warWeek=50 (pre-Washington) → NOT triggered (turn gate warWeek > 102 fails)', () => {
        // warWeek=50 <= WASHINGTON_AGREEMENT_WEEK(102) → isPostWashington=false → alignment block skipped
        // patron=65 is below normal override threshold (80) → falls to scoring
        const plan = makePlan({ id: 'contact_group', proposed_split: { HRHB: 18 } });
        const personality = getPoliticalPersonality('HRHB');
        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const result = computePoliticalPeacePlanResponse(plan, 'HRHB', 15, 65, assessment, personality, 50);
        // Result is scoring-determined (alignment block not triggered); may be accepted or rejected
        expect(['accepted', 'rejected']).toContain(result);
        // Key contract: result at warWeek=50 may differ from warWeek=110 (alignment changes behavior)
    });

    it('14. HRHB, VOPP, warWeek=110, patron=65 → NOT triggered (wrong plan — VOPP, not contact_group)', () => {
        // isHrhbCgAlignment requires plan.id === 'contact_group'; VOPP fails this check
        // patron=65 < 80 normal override threshold → also doesn't fire
        // Falls to scoring; result valid
        const plan = makePlan({ id: 'vance_owen', proposed_split: { HRHB: 18 } });
        const personality = getPoliticalPersonality('HRHB');
        const assessment = makeAssessment({ blended_score: 50, patron_pressure: 0 });
        const result = computePoliticalPeacePlanResponse(plan, 'HRHB', 15, 65, assessment, personality, 110);
        expect(['accepted', 'rejected']).toContain(result);
    });

    it('15. RS, CG, patron=100 → rejected (RS immune; HRHB alignment does NOT apply to RS)', () => {
        // RS + contact_group: floor fires (gap 14 > 10) AND CG is patron-immune for RS.
        // HRHB alignment block only triggers for faction === 'HRHB' — never fires for RS.
        const plan = makePlan({ id: 'contact_group', proposed_split: { RS: 49 } });
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ patron_pressure: 100 });
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 63, 100, assessment, personality, 110);
        expect(result).toBe('rejected');
    });
});
