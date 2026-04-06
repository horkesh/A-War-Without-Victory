/**
 * v0.8.4 Phase E — op proposal description enrichment tests.
 *
 * Tests buildOpProposalDescription() in isolation:
 *   - zone name derived from staging_zone when available
 *   - force count from assigned_brigades
 *   - threat label from threat_assessment.overall_pressure
 *   - graceful fallback when commander state has no enrichment data
 *   - description never returns empty string
 *   - all four overall_pressure values map correctly
 *   - singular "brigade" vs plural "brigades"
 */

import { describe, it, expect } from 'vitest';
import { buildOpProposalDescription } from '../../../src/sim/ai_commander/proposal_generation.js';
import type { CommanderState } from '../../../src/sim/combat/commander/commander_state.js';

// ---------------------------------------------------------------------------
// Minimal CommanderState builder
// ---------------------------------------------------------------------------

function makeCS(opts: {
    stagingZone?: string;
    assignedBrigades?: string[];
    overallPressure?: 'low' | 'moderate' | 'heavy' | 'critical';
    currentPlan?: boolean; // false = null current_plan
}): CommanderState {
    const hasPlan = opts.currentPlan !== false && (opts.stagingZone != null || opts.assignedBrigades != null);
    return {
        zone_assessments: [],
        threat_assessment: {
            threatened_zones: [],
            enemy_concentration_zones: [],
            recent_losses: [],
            overall_pressure: opts.overallPressure ?? 'low',
        },
        force_assessment: {
            total_brigades: 0,
            combat_effective: 0,
            evaluations: [],
            by_zone: {},
            tier_counts: { main_effort: 0, active_defense: 0, garrison: 0 },
            total_surplus: 0,
        },
        current_plan: hasPlan
            ? {
                  plan_id: 'plan_test_01',
                  objective_description: 'Seize objective',
                  target_osids: [],
                  required_brigades: 3,
                  assigned_brigades: (opts.assignedBrigades ?? []) as string[],
                  staging_zone: (opts.stagingZone ?? '') as string & { readonly __brand: 'ZoneId' },
                  status: 'ready',
                  created_turn: 1,
                  target_ready_turn: 5,
                  concentration_progress: 1.0,
                  viability_score: 0.8,
                  source: 'pre_planned',
              }
            : null,
        sector_activity_log: [],
        operation_history: [],
        intel_picture: {
            zone_confidence: {},
            offensive_signs: {},
            concentration_detected: {},
            last_updated_turn: 1,
        },
        garrison_budget: {},
        last_assessment_turn: 1,
    } as unknown as CommanderState;
}

// ---------------------------------------------------------------------------
// Group 1: Zone name enrichment
// ---------------------------------------------------------------------------

describe('buildOpProposalDescription: zone name', () => {
    it('includes formatted zone name when staging_zone is available', () => {
        const cs = makeCS({ stagingZone: 'posavina_corridor', overallPressure: 'low' });
        const result = buildOpProposalDescription('1st Corps', cs, 'Advance north');
        expect(result).toContain('Zone: Posavina Corridor');
    });

    it('title-cases multi-word zone IDs correctly', () => {
        const cs = makeCS({ stagingZone: 'sava_river_zone', overallPressure: 'low' });
        const result = buildOpProposalDescription('2nd Corps', cs, 'Cross the Sava');
        expect(result).toContain('Zone: Sava River Zone');
    });

    it('handles single-word zone ID', () => {
        const cs = makeCS({ stagingZone: 'sarajevo', overallPressure: 'low' });
        const result = buildOpProposalDescription('SRK', cs, 'Hold the line');
        expect(result).toContain('Zone: Sarajevo');
    });

    it('omits zone segment when current_plan is null', () => {
        const cs = makeCS({ currentPlan: false, overallPressure: 'moderate' });
        const result = buildOpProposalDescription('1st Corps', cs, 'offensive operation');
        expect(result).not.toContain('Zone:');
    });
});

// ---------------------------------------------------------------------------
// Group 2: Force count enrichment
// ---------------------------------------------------------------------------

describe('buildOpProposalDescription: force count', () => {
    it('includes brigade count when assigned_brigades is populated', () => {
        const cs = makeCS({
            stagingZone: 'test_zone',
            assignedBrigades: ['bde_1', 'bde_2', 'bde_3'],
            overallPressure: 'moderate',
        });
        const result = buildOpProposalDescription('1st Corps', cs, 'Push forward');
        expect(result).toContain('Force: 3 brigades');
    });

    it('uses singular "brigade" when exactly 1 assigned', () => {
        const cs = makeCS({
            stagingZone: 'test_zone',
            assignedBrigades: ['bde_1'],
            overallPressure: 'low',
        });
        const result = buildOpProposalDescription('1st Corps', cs, 'Probe');
        expect(result).toContain('Force: 1 brigade');
        expect(result).not.toContain('brigades');
    });

    it('omits force segment when assigned_brigades is empty', () => {
        const cs = makeCS({ stagingZone: 'test_zone', assignedBrigades: [], overallPressure: 'low' });
        const result = buildOpProposalDescription('1st Corps', cs, 'Plan pending');
        expect(result).not.toContain('Force:');
    });
});

// ---------------------------------------------------------------------------
// Group 3: Threat label enrichment
// ---------------------------------------------------------------------------

describe('buildOpProposalDescription: threat label', () => {
    it('maps overall_pressure "low" to "Low"', () => {
        const cs = makeCS({ stagingZone: 'zone_a', overallPressure: 'low' });
        const result = buildOpProposalDescription('Corps', cs, 'Advance');
        expect(result).toContain('Threat: Low');
    });

    it('maps overall_pressure "moderate" to "Moderate"', () => {
        const cs = makeCS({ stagingZone: 'zone_b', overallPressure: 'moderate' });
        const result = buildOpProposalDescription('Corps', cs, 'Advance');
        expect(result).toContain('Threat: Moderate');
    });

    it('maps overall_pressure "heavy" to "High"', () => {
        const cs = makeCS({ stagingZone: 'zone_c', overallPressure: 'heavy' });
        const result = buildOpProposalDescription('Corps', cs, 'Advance');
        expect(result).toContain('Threat: High');
    });

    it('maps overall_pressure "critical" to "Critical"', () => {
        const cs = makeCS({ stagingZone: 'zone_d', overallPressure: 'critical' });
        const result = buildOpProposalDescription('Corps', cs, 'Advance');
        expect(result).toContain('Threat: Critical');
    });
});

// ---------------------------------------------------------------------------
// Group 4: Existing objective description preserved
// ---------------------------------------------------------------------------

describe('buildOpProposalDescription: existing objective description', () => {
    it('appends objective description after enriched segments', () => {
        const cs = makeCS({
            stagingZone: 'posavina_corridor',
            assignedBrigades: ['bde_1', 'bde_2'],
            overallPressure: 'high' as unknown as 'heavy', // edge: unknown value passes through
        });
        const result = buildOpProposalDescription('1st Corps', cs, 'Seize Brcko');
        expect(result).toContain('Plan: Seize Brcko');
        // Zone segment comes before Plan segment
        expect(result.indexOf('Zone:')).toBeLessThan(result.indexOf('Plan:'));
    });

    it('omits Plan segment when objectiveDesc is empty string', () => {
        const cs = makeCS({ stagingZone: 'zone_a', overallPressure: 'low' });
        const result = buildOpProposalDescription('1st Corps', cs, '');
        expect(result).not.toContain('Plan:');
    });
});

// ---------------------------------------------------------------------------
// Group 5: Graceful fallback — description never empty
// ---------------------------------------------------------------------------

describe('buildOpProposalDescription: fallback safety', () => {
    it('returns non-empty string when current_plan is null and objectiveDesc is empty', () => {
        const cs = makeCS({ currentPlan: false, overallPressure: 'low' });
        // Override threat_assessment to have no pressure (simulate stripped state)
        (cs as unknown as { threat_assessment: { overall_pressure: '' } }).threat_assessment.overall_pressure = '';
        const result = buildOpProposalDescription('2nd Corps', cs, '');
        expect(result.length).toBeGreaterThan(0);
    });

    it('falls back to corps-name-based string when no data available at all', () => {
        const cs = makeCS({ currentPlan: false, overallPressure: 'low' });
        (cs as unknown as { threat_assessment: { overall_pressure: '' } }).threat_assessment.overall_pressure = '';
        const result = buildOpProposalDescription('East Bosnia Corps', cs, '');
        expect(result).toBe('East Bosnia Corps offensive operation');
    });

    it('returns objectiveDesc alone when only objectiveDesc is provided (no plan, no threat)', () => {
        const cs = makeCS({ currentPlan: false, overallPressure: 'low' });
        (cs as unknown as { threat_assessment: { overall_pressure: '' } }).threat_assessment.overall_pressure = '';
        const result = buildOpProposalDescription('Corps X', cs, 'Defend the perimeter');
        // objectiveDesc is non-empty, so parts has one entry: "Plan: ..."
        expect(result).toContain('Plan: Defend the perimeter');
    });

    it('full enrichment produces correctly ordered dot-separated segments', () => {
        const cs = makeCS({
            stagingZone: 'drina_valley',
            assignedBrigades: ['bde_1', 'bde_2', 'bde_3', 'bde_4'],
            overallPressure: 'critical',
        });
        const result = buildOpProposalDescription('Drina Corps', cs, 'Advance on Gorazde');
        expect(result).toBe(
            'Zone: Drina Valley. Force: 4 brigades. Threat: Critical. Plan: Advance on Gorazde'
        );
    });
});
