/**
 * Vitest tests for validateGameStateShape partition root validation.
 * Covers: military, political, political.political_controllers, displacement (optional).
 */

import { describe, it, expect } from 'vitest';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid state object that passes all shape checks. */
function minimalValid(): Record<string, unknown> {
    return {
        schema_version: 1,
        meta: { turn: 0, seed: 'test-fixture' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        },
        political: {
            political_controllers: {
                'SID_001': 'RBiH',
                'SID_002': null
            }
        },
        displacement: {}
    };
}

describe('validateGameStateShape — partition root validation', () => {
    it('valid state passes', () => {
        const result = validateGameStateShape(minimalValid());
        expect(result.ok).toBe(true);
    });

    it('missing military fails', () => {
        const state = minimalValid();
        delete state.military;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.military must be a non-null object');
        }
    });

    it('null military fails', () => {
        const state = minimalValid();
        state.military = null as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.military must be a non-null object');
        }
    });

    it('missing political fails', () => {
        const state = minimalValid();
        delete state.political;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political must be a non-null object');
        }
    });

    it('null political fails', () => {
        const state = minimalValid();
        state.political = null as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political must be a non-null object');
        }
    });

    it('missing political.political_controllers fails', () => {
        const state = minimalValid();
        state.political = { /* no political_controllers */ };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political.political_controllers must be a non-null object');
        }
    });

    it('null political.political_controllers fails', () => {
        const state = minimalValid();
        (state.political as any).political_controllers = null;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.political.political_controllers must be a non-null object');
        }
    });

    it('missing displacement still passes (optional)', () => {
        const state = minimalValid();
        delete state.displacement;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('undefined displacement still passes (optional)', () => {
        const state = minimalValid();
        state.displacement = undefined;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('null displacement fails (must be object when present)', () => {
        const state = minimalValid();
        state.displacement = null as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.displacement must be an object when present');
        }
    });

    it('array displacement fails', () => {
        const state = minimalValid();
        state.displacement = [] as any;
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('state.displacement must be an object when present');
        }
    });
});

describe('validateGameStateShape optional military local state records', () => {
    it('absent optional local state records still pass', () => {
        const state = minimalValid();
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('well-formed optional local state records pass', () => {
        const state = minimalValid();
        (state.military as any).casualty_ledger = {
            RBiH: {
                killed: 1,
                wounded: 2,
                missing_captured: 0,
                equipment_lost: { tanks: 0, artillery: 1, aa_systems: 0 },
                per_formation: {
                    brigade_a: { killed: 1, wounded: 2, missing_captured: 0 }
                }
            }
        };
        (state.military as any).enclave_state = {
            gorazde: { fallen: false, status: 'holding', resilience: 0.8 }
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('malformed casualty_ledger rejects when present', () => {
        const state = minimalValid();
        (state.military as any).casualty_ledger = {
            RS: {
                killed: 1,
                wounded: Number.NaN,
                missing_captured: 0,
                equipment_lost: { tanks: 0, artillery: -1, aa_systems: 0 },
                per_formation: {
                    brigade_a: { killed: 0, wounded: 1, missing_captured: 'bad' }
                }
            }
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('military.casualty_ledger.RS.wounded must be a finite non-negative number');
            expect(result.errors).toContain('military.casualty_ledger.RS.equipment_lost.artillery must be a finite non-negative number');
            expect(result.errors).toContain('military.casualty_ledger.RS.per_formation.brigade_a.missing_captured must be a finite non-negative number');
        }
    });

    it('malformed enclave_state rejects known leaves when present', () => {
        const state = minimalValid();
        (state.military as any).enclave_state = {
            bihac: { fallen: 'no', status: 3 }
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('military.enclave_state.bihac.fallen must be a boolean when present');
            expect(result.errors).toContain('military.enclave_state.bihac.status must be a string when present');
        }
    });
});
