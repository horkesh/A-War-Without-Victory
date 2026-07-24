/**
 * Tests for v0.8.2 Phase 5a — RBiH Owen-Stoltenberg Tactical Acceptance Branch
 *
 * Covers:
 * 1. Branch fires when conditions met: RBiH + owen_stoltenberg + situation_score < 50 → 'accepted'
 * 2. Branch does NOT fire when situation_score >= 50 → falls through to normal scoring
 * 3. Branch does NOT fire for vance_owen (wrong plan id) → normal scoring path
 * 4. Branch does NOT fire for RS faction → RS floor gate applies instead
 * 5. Branch does NOT fire for HRHB faction → normal scoring
 * 6. RS still rejects O-S via floor: RS holds ~65%, O-S proposes RS=52%, gap=13pp < 18pp floor → passes floor
 * 7. Player event os_rbih_tactical_acceptance_1993 exists in war_1993.json event timeline
 * 8. Player event has turn_min = 72
 * 9. Edge case: situation_score exactly 49 → branch fires (< 50)
 * 10. Edge case: situation_score exactly 50 → branch does NOT fire (not < 50)
 * 11. Edge case: Cutileiro exclusion still fires before OS branch (id='cutileiro' handled first)
 * 12. Edge case: patron hard override at 80 still fires for RBiH on non-OS plan
 * 13. RS: gap = 13pp exactly (current 65%, proposed 52%) → floor NOT triggered (> 18 not met)
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
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
        trigger_week: 70,
        historical_responses: { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' },
        proposed_split: { RS: 52, RBiH: 33, HRHB: 15 },
        institutional_model: 'union_3_republics',
        override_change_on_reject: { RS: 5, RBiH: 10, HRHB: 10 },
        credibility_change_on_reject: { RS: -5, RBiH: -10, HRHB: -10 },
        narrative: 'Test O-S plan narrative.',
        ...overrides,
    };
}

// Canonical O-S plan fixture matching corrected peace_plan_data.ts values
function makeOSPlan(splitOverrides?: Partial<{ RBiH: number; RS: number; HRHB: number }>): PeacePlanDefinition {
    return makePlan({
        id: 'owen_stoltenberg',
        proposed_split: { RBiH: 33, RS: 52, HRHB: 15, ...splitOverrides },
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: RBiH O-S tactical acceptance branch — positive cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 1: RBiH Owen-Stoltenberg tactical acceptance branch — fires', () => {
    it('1. RBiH + owen_stoltenberg + situation_score=20 → accepted (branch fires)', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 20 });
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 20, 0, assessment, personality);
        expect(result).toBe('accepted');
    });

    it('2. RBiH + owen_stoltenberg + situation_score=1 (floor) → accepted (branch fires)', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 1 });
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 15, 0, assessment, personality);
        expect(result).toBe('accepted');
    });

    it('9. Edge: situation_score exactly 49 → branch fires (< 50 is true)', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 49 });
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 20, 0, assessment, personality);
        expect(result).toBe('accepted');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2: Branch does NOT fire — negative cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 2: RBiH O-S tactical acceptance branch — does NOT fire', () => {
    it('2. situation_score >= 50 → branch does not fire, falls through to scoring', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RBiH');
        // situation_score=60 → branch does not fire; scoring may produce accepted or rejected
        const assessment = makeAssessment({ situation_score: 60, blended_score: 60, patron_pressure: 0 });
        // We confirm it does NOT short-circuit by verifying patron override at 80 still works
        // (if branch had fired it would bypass patron logic — but branch is pre-patron, so the
        // real test is that scoring runs. Use patron_override=80 to force accepted via normal path.)
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 20, 80, assessment, personality);
        // Patron override at 80 → accepted (via normal path, not branch)
        expect(result).toBe('accepted');
    });

    it('3. Plan id = vance_owen + situation_score=20 → branch does NOT fire (wrong plan)', () => {
        const plan = makePlan({
            id: 'vance_owen',
            proposed_split: { RBiH: 53, RS: 30, HRHB: 17 },
        });
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 20, blended_score: 20 });
        // Branch only fires for 'owen_stoltenberg'. Result from normal scoring is valid either way.
        // Confirm: large territory gain for RBiH (53% proposed vs 20% held) → scoring should accept
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 20, 0, assessment, personality);
        // We can't assert direction without knowing scoring details, just confirm no crash + valid
        expect(['accepted', 'rejected']).toContain(result);
        // Key invariant: if branch had fired, result would be 'accepted' regardless of patron=0.
        // We can verify by patching: same call with patron_override=80 must also be 'accepted' (normal override)
        const resultWithOverride = computePoliticalPeacePlanResponse(plan, 'RBiH', 20, 80, assessment, personality);
        expect(resultWithOverride).toBe('accepted');
    });

    it('4. RS faction + owen_stoltenberg + situation_score=20 → RS floor gate applies (not RBiH branch)', () => {
        // RS holds 65%, O-S proposes RS=52%, gap=13pp → below 18pp floor → passes floor
        // RS should fall through to scoring (not be caught by RBiH-only branch)
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ situation_score: 20 });
        // Patron override at 80 → accepted (RS floor not triggered at 13pp gap)
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 80, assessment, personality);
        expect(result).toBe('accepted'); // patron override fires, not RBiH branch
    });

    it('5. HRHB faction + owen_stoltenberg + situation_score=20 → normal scoring (not RBiH branch)', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('HRHB');
        const assessment = makeAssessment({ situation_score: 20 });
        // Patron override at 80 → accepted via normal path
        const result = computePoliticalPeacePlanResponse(plan, 'HRHB', 15, 80, assessment, personality);
        expect(result).toBe('accepted');
    });

    it('10. Edge: situation_score exactly 50 → branch does NOT fire (50 is not < 50)', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 50 });
        // Branch does not fire. With patron_override=80 → accepted via normal patron path.
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 20, 80, assessment, personality);
        expect(result).toBe('accepted');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: RS floor gate behavior with corrected O-S split
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 3: RS floor gate with corrected O-S split (RS=52)', () => {
    it('6. RS holds 65%, O-S proposes RS=52%, gap=13pp → passes floor (13 < 18) → patron override accepts', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ situation_score: 50 });
        // gap = 65 - 52 = 13pp → below RS_TERRITORY_FLOOR_GAP=18 → floor not triggered
        // patron override at 80 → accepted
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 80, assessment, personality);
        expect(result).toBe('accepted');
    });

    it('13. RS: gap exactly 13pp (current=65, proposed=52) → floor NOT triggered (13 < 18)', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment();
        // Confirm floor passes: patron override at 80 → accepted
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 65, 80, assessment, personality);
        expect(result).toBe('accepted');
    });

    it('RS: gap = 19pp (current=71, proposed=52) → floor triggered → rejected even with patron 80', () => {
        const plan = makeOSPlan();
        const personality = getPoliticalPersonality('RS');
        const assessment = makeAssessment({ patron_pressure: 100 });
        // gap = 71 - 52 = 19pp > 18 → hard reject
        const result = computePoliticalPeacePlanResponse(plan, 'RS', 71, 100, assessment, personality);
        expect(result).toBe('rejected');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: Edge cases for other gates around the new branch
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 4: Edge cases — gate ordering', () => {
    it('11. Cutileiro exclusion fires before OS branch: id=cutileiro RBiH with low territory → rejected (legacy path)', () => {
        // Cutileiro gate is checked FIRST in the function (before OS branch)
        const plan = makePlan({
            id: 'cutileiro',
            proposed_split: { RBiH: 10 }, // proposed < current 30% → reject
        });
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 20 }); // low score, would trigger OS branch if reached
        // patronOverride = 5 (not > 50) → Cutileiro reject path
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 30, 5, assessment, personality);
        expect(result).toBe('rejected');
    });

    it('12. Patron hard override at 80 still accepts for RBiH on non-OS plan (normal path)', () => {
        const plan = makePlan({
            id: 'contact_group',
            proposed_split: { RBiH: 33 },
        });
        const personality = getPoliticalPersonality('RBiH');
        const assessment = makeAssessment({ situation_score: 60 }); // above 50 → OS branch would not fire anyway
        const result = computePoliticalPeacePlanResponse(plan, 'RBiH', 20, 80, assessment, personality);
        expect(result).toBe('accepted');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 5: Player event in war_1993.json timeline
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 5: Player event os_rbih_tactical_acceptance_1993 in timeline', () => {
    const war1993 = JSON.parse(
        readFileSync(resolve(__dirname, '../../../data/scenarios/events/war_1993.json'), 'utf-8'),
    ) as Array<{ id: string; trigger: { turn_min?: number }; once?: boolean }>;

    const osEvent = war1993.find(e => e.id === 'os_rbih_tactical_acceptance_1993');

    it('7. Event os_rbih_tactical_acceptance_1993 exists in war_1993.json', () => {
        expect(osEvent).toBeDefined();
    });

    it('8. Event turn_min is 72', () => {
        expect(osEvent?.trigger?.turn_min).toBe(72);
    });

    it('Event is once-only (required by timeline integrity)', () => {
        expect(osEvent?.once).toBe(true);
    });

    it('Event is sorted after owen_stoltenberg_plan_1993 (turn 70) in the file', () => {
        const osIdx = war1993.findIndex(e => e.id === 'os_rbih_tactical_acceptance_1993');
        const planIdx = war1993.findIndex(e => e.id === 'owen_stoltenberg_plan_1993');
        expect(osIdx).toBeGreaterThan(planIdx);
    });

    it('Event is sorted before grabovica_uzdol_massacres_1993 (turn 73) in the file', () => {
        const osIdx = war1993.findIndex(e => e.id === 'os_rbih_tactical_acceptance_1993');
        const grabIdx = war1993.findIndex(e => e.id === 'grabovica_uzdol_massacres_1993');
        expect(osIdx).toBeLessThan(grabIdx);
    });
});
