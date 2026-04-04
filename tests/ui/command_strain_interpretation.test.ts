/**
 * Focused tests for deriveOrderInterpretation — Wave 1 category classification.
 *
 * Covers:
 *  - Category classification (all 5 categories)
 *  - Backward compatibility (2-arg callers)
 *  - interventionStrength correctness
 *  - cautionNotice non-null for all non-normal categories
 */

import { describe, it, expect } from 'vitest';
import { deriveOrderInterpretation } from '../../src/ui/map/data/command_strain.js';

// ─────────────────────────────────────────────────────────────────────────────
// Category classification
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 1: deriveOrderInterpretation — category classification', () => {

    // ── normal ────────────────────────────────────────────────────────────────

    it('strain=0, assessment=launch → category=normal, severity=normal, categoryLabel=null', () => {
        const r = deriveOrderInterpretation(0, 'launch');
        expect(r.category).toBe('normal');
        expect(r.severity).toBe('normal');
        expect(r.categoryLabel).toBeNull();
    });

    it('strain=0, assessment=null → category=normal, severity=normal', () => {
        const r = deriveOrderInterpretation(0, null);
        expect(r.category).toBe('normal');
        expect(r.severity).toBe('normal');
    });

    // ── strain_shaped ─────────────────────────────────────────────────────────

    it('strain=3, assessment=launch → category=strain_shaped, severity=caution, categoryLabel=STRAIN-SHAPED', () => {
        const r = deriveOrderInterpretation(3, 'launch');
        expect(r.category).toBe('strain_shaped');
        expect(r.severity).toBe('caution');
        expect(r.categoryLabel).toBe('STRAIN-SHAPED');
    });

    it('strain=6, assessment=postpone → category=strain_shaped, severity=alarm (strain wins over constraint)', () => {
        // Strain >= COMPROMISED_THRESHOLD (6) takes priority regardless of assessment
        const r = deriveOrderInterpretation(6, 'postpone');
        expect(r.category).toBe('strain_shaped');
        expect(r.severity).toBe('alarm');
    });

    it('strain=6, assessment=launch → category=strain_shaped, severity=alarm', () => {
        const r = deriveOrderInterpretation(6, 'launch');
        expect(r.category).toBe('strain_shaped');
        expect(r.severity).toBe('alarm');
        expect(r.categoryLabel).toBe('STRAIN-SHAPED');
    });

    // strain_shaped wins even when a feasibility constraint is present
    it('strain=3, primaryConstraint=siege, assessment=postpone → category=strain_shaped (strain wins)', () => {
        const r = deriveOrderInterpretation(3, 'postpone', 'siege');
        expect(r.category).toBe('strain_shaped');
    });

    // ── feasibility_constrained ───────────────────────────────────────────────

    it('strain=0, primaryConstraint=siege, assessment=postpone → category=feasibility_constrained, severity=caution, categoryLabel=FEASIBILITY', () => {
        const r = deriveOrderInterpretation(0, 'postpone', 'siege');
        expect(r.category).toBe('feasibility_constrained');
        expect(r.severity).toBe('caution');
        expect(r.categoryLabel).toBe('FEASIBILITY');
    });

    it('strain=0, primaryConstraint=threat_pressure, assessment=abort → category=feasibility_constrained', () => {
        const r = deriveOrderInterpretation(0, 'abort', 'threat_pressure');
        expect(r.category).toBe('feasibility_constrained');
    });

    it('strain=0, primaryConstraint=defensive_duty, assessment=postpone → category=feasibility_constrained', () => {
        const r = deriveOrderInterpretation(0, 'postpone', 'defensive_duty');
        expect(r.category).toBe('feasibility_constrained');
    });

    it('strain=0, primaryConstraint=defensive_duty, assessment=launch → category=normal (constraint only fires with postpone/abort)', () => {
        // defensive_duty constraint does NOT fire if assessment is launch
        const r = deriveOrderInterpretation(0, 'launch', 'defensive_duty');
        expect(r.category).toBe('normal');
    });

    it('strain=0, primaryConstraint=force_condition, assessment=postpone → category=caution_driven (force_condition not in feasibility set)', () => {
        const r = deriveOrderInterpretation(0, 'postpone', 'force_condition');
        expect(r.category).toBe('caution_driven');
    });

    it('strain=0, primaryConstraint=plan_lifecycle, assessment=postpone → category=caution_driven (plan_lifecycle not in feasibility set)', () => {
        const r = deriveOrderInterpretation(0, 'postpone', 'plan_lifecycle');
        expect(r.category).toBe('caution_driven');
    });

    it('strain=0, primaryConstraint=none, assessment=postpone → category=caution_driven', () => {
        const r = deriveOrderInterpretation(0, 'postpone', 'none');
        expect(r.category).toBe('caution_driven');
    });

    // ── tempo_resistant ───────────────────────────────────────────────────────

    it('strain=0, assessment=postpone, trendDirection=improving → category=tempo_resistant, categoryLabel=TEMPO', () => {
        const r = deriveOrderInterpretation(0, 'postpone', undefined, 'improving');
        expect(r.category).toBe('tempo_resistant');
        expect(r.severity).toBe('caution');
        expect(r.categoryLabel).toBe('TEMPO');
    });

    it('strain=0, assessment=abort, trendDirection=improving → category=caution_driven (tempo only fires on postpone)', () => {
        // tempo_resistant requires assessment === 'postpone' specifically
        const r = deriveOrderInterpretation(0, 'abort', undefined, 'improving');
        expect(r.category).toBe('caution_driven');
    });

    // feasibility_constrained wins over tempo_resistant when constraint is structural
    it('strain=0, primaryConstraint=siege, assessment=postpone, trendDirection=improving → category=feasibility_constrained (feasibility beats tempo)', () => {
        const r = deriveOrderInterpretation(0, 'postpone', 'siege', 'improving');
        expect(r.category).toBe('feasibility_constrained');
    });

    // ── caution_driven ────────────────────────────────────────────────────────

    it('strain=0, assessment=postpone, trendDirection=stagnating → category=caution_driven', () => {
        const r = deriveOrderInterpretation(0, 'postpone', undefined, 'stagnating');
        expect(r.category).toBe('caution_driven');
    });

    it('strain=0, assessment=postpone, trendDirection=undefined → category=caution_driven', () => {
        const r = deriveOrderInterpretation(0, 'postpone', undefined, undefined);
        expect(r.category).toBe('caution_driven');
    });

    it('strain=0, assessment=abort, trendDirection=undefined → category=caution_driven', () => {
        const r = deriveOrderInterpretation(0, 'abort');
        expect(r.category).toBe('caution_driven');
        expect(r.categoryLabel).toBe('CAUTION-DRIVEN');
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Backward compatibility — 2-arg callers must not crash or regress
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 1: deriveOrderInterpretation — backward compatibility (2-arg callers)', () => {

    it('deriveOrderInterpretation(0, "launch") → severity=normal, no crash', () => {
        const r = deriveOrderInterpretation(0, 'launch');
        expect(r.severity).toBe('normal');
        expect(r.cautionNotice).toBeNull();
    });

    it('deriveOrderInterpretation(3, "launch") → severity=caution, category=strain_shaped', () => {
        const r = deriveOrderInterpretation(3, 'launch');
        expect(r.severity).toBe('caution');
        expect(r.category).toBe('strain_shaped');
    });

    it('deriveOrderInterpretation(6, "postpone") → severity=alarm, category=strain_shaped', () => {
        const r = deriveOrderInterpretation(6, 'postpone');
        expect(r.severity).toBe('alarm');
        expect(r.category).toBe('strain_shaped');
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// interventionStrength — unaffected by category
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 1: deriveOrderInterpretation — interventionStrength', () => {

    it('assessment=postpone → direct_intervention regardless of category', () => {
        // caution_driven
        expect(deriveOrderInterpretation(0, 'postpone').interventionStrength).toBe('direct_intervention');
        // feasibility_constrained
        expect(deriveOrderInterpretation(0, 'postpone', 'siege').interventionStrength).toBe('direct_intervention');
        // tempo_resistant
        expect(deriveOrderInterpretation(0, 'postpone', undefined, 'improving').interventionStrength).toBe('direct_intervention');
        // strain_shaped (strain > 0 but assessment is postpone)
        expect(deriveOrderInterpretation(3, 'postpone').interventionStrength).toBe('direct_intervention');
    });

    it('assessment=abort → direct_intervention', () => {
        expect(deriveOrderInterpretation(0, 'abort').interventionStrength).toBe('direct_intervention');
    });

    it('assessment=launch → ordinary_approval', () => {
        expect(deriveOrderInterpretation(0, 'launch').interventionStrength).toBe('ordinary_approval');
        expect(deriveOrderInterpretation(3, 'launch').interventionStrength).toBe('ordinary_approval');
        expect(deriveOrderInterpretation(6, 'launch').interventionStrength).toBe('ordinary_approval');
    });

    it('assessment=null → ordinary_approval', () => {
        expect(deriveOrderInterpretation(0, null).interventionStrength).toBe('ordinary_approval');
    });

    it('assessment=undefined → ordinary_approval', () => {
        expect(deriveOrderInterpretation(0, undefined).interventionStrength).toBe('ordinary_approval');
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// cautionNotice — non-null for all non-normal categories, null for normal
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 1: deriveOrderInterpretation — cautionNotice', () => {

    it('category=normal → cautionNotice is null', () => {
        expect(deriveOrderInterpretation(0, 'launch').cautionNotice).toBeNull();
        expect(deriveOrderInterpretation(0, null).cautionNotice).toBeNull();
        expect(deriveOrderInterpretation(0, undefined).cautionNotice).toBeNull();
    });

    it('category=strain_shaped (caution) → cautionNotice is non-null string', () => {
        const r = deriveOrderInterpretation(3, 'launch');
        expect(r.cautionNotice).not.toBeNull();
        expect(typeof r.cautionNotice).toBe('string');
        expect(r.cautionNotice!.length).toBeGreaterThan(0);
    });

    it('category=strain_shaped (alarm) → cautionNotice is non-null string, differs from caution', () => {
        const alarm = deriveOrderInterpretation(6, 'launch');
        const caution = deriveOrderInterpretation(3, 'launch');
        expect(alarm.cautionNotice).not.toBeNull();
        expect(alarm.cautionNotice).not.toBe(caution.cautionNotice);
    });

    it('category=feasibility_constrained → cautionNotice is non-null string', () => {
        const r = deriveOrderInterpretation(0, 'postpone', 'siege');
        expect(r.cautionNotice).not.toBeNull();
        expect(typeof r.cautionNotice).toBe('string');
    });

    it('category=tempo_resistant → cautionNotice is non-null string', () => {
        const r = deriveOrderInterpretation(0, 'postpone', undefined, 'improving');
        expect(r.cautionNotice).not.toBeNull();
        expect(typeof r.cautionNotice).toBe('string');
    });

    it('category=caution_driven → cautionNotice is non-null string', () => {
        const r = deriveOrderInterpretation(0, 'postpone');
        expect(r.cautionNotice).not.toBeNull();
        expect(typeof r.cautionNotice).toBe('string');
    });

});
