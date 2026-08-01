/**
 * Vitest tests for validateGameStateShape partition root validation.
 * Covers: military, political, political.political_controllers, displacement (optional).
 */

import { describe, it, expect } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
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

describe('validateGameStateShape autonomy proposal receipt history', () => {
    it('accepts a complete durable proposal disposition', () => {
        const state = minimalValid();
        (state.meta as any).proposal_decision_history = [{
            id: 'proposal-1',
            turn: 4,
            resolved_turn: 5,
            faction: 'RBiH',
            domain: 'military',
            description: 'Staff recommends a defensive stance.',
            proposed_action: 'SET_STANCE:arbih_3rd_corps:defensive',
            accepted: true,
        }];

        expect(validateGameStateShape(state)).toEqual({ ok: true });
    });

    it('rejects malformed or chronologically impossible proposal dispositions', () => {
        const state = minimalValid();
        (state.meta as any).proposal_decision_history = [{
            id: 'proposal-1',
            turn: 6,
            resolved_turn: 5,
            faction: 'RBiH',
            domain: 'military',
            description: 'Staff recommends a defensive stance.',
            proposed_action: 'SET_STANCE:arbih_3rd_corps:defensive',
            accepted: 'yes',
        }];

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('meta.proposal_decision_history[0].accepted must be boolean');
            expect(result.errors).toContain('meta.proposal_decision_history[0].resolved_turn must be greater than or equal to turn');
        }
    });
});

describe('validateGameStateShape optional military local state records', () => {
    it('requires sector_intel for the current schema', () => {
        const state = minimalValid();
        state.schema_version = CURRENT_SCHEMA_VERSION;
        const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain(`v${CURRENT_SCHEMA_VERSION} required field missing or invalid: military.sector_intel`);
        }
    });

    it('requires corps_front_sectors for the current schema', () => {
        const state = minimalValid();
        state.schema_version = CURRENT_SCHEMA_VERSION;
        (state.military as any).sector_intel = {};
        const result = validateGameStateShape(state, { requireVersion: CURRENT_SCHEMA_VERSION });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain(`v${CURRENT_SCHEMA_VERSION} required field missing or invalid: military.corps_front_sectors`);
        }
    });

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
        (state.military as any).sector_intel = {
            friendly_sector: [{
                enemy_sector_id: 'enemy_sector',
                enemy_faction: 'RS',
                enemy_corps_id: 'enemy_corps',
                front_edge_count: 2,
                strength_category: 'moderate',
                posture_observed: 'defensive',
                offensive_signs: false,
                confidence: 0.6,
                turns_in_contact: 3,
                visible_brigade_ids: ['enemy_brigade'],
                osid_confidence: [{ osid: 'enemy_osid', confidence: 0.8, sources: ['scout'] }],
                last_updated_turn: 4,
            }],
        };
        (state.military as any).corps_front_sectors = {
            sector_a: {
                sector_id: 'sector_a',
                corps_id: 'corps_a',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: ['edge_a'],
                sub_segments: [{
                    sub_segment_id: 'sub_a',
                    edge_ids: ['edge_a'],
                    friendly_osids: ['friendly_a'],
                    enemy_osids: ['enemy_a'],
                    length_edges: 1,
                    primary_brigade_ids: ['brigade_a'],
                }],
                length_edges: 1,
                territory_osids: ['friendly_a'],
                assigned_brigade_ids: ['brigade_a'],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 0.5,
                defensive_power: 10,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('malformed persisted sector_intel rejects every invalid leaf', () => {
        const state = minimalValid();
        (state.military as any).sector_intel = {
            friendly_sector: [{
                enemy_sector_id: '',
                enemy_faction: 7,
                enemy_corps_id: '',
                front_edge_count: -1,
                strength_category: 'omniscient',
                posture_observed: 'routed',
                offensive_signs: 'yes',
                confidence: 1.5,
                turns_in_contact: -2,
                visible_brigade_ids: ['enemy_brigade', 3],
                osid_confidence: [{ osid: '', confidence: Number.NaN, sources: ['satellite'] }],
                last_updated_turn: -1,
            }],
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('military.sector_intel.friendly_sector[0].enemy_sector_id must be a non-empty string');
            expect(result.errors).toContain('military.sector_intel.friendly_sector[0].enemy_faction must be a non-empty string');
            expect(result.errors).toContain('military.sector_intel.friendly_sector[0].front_edge_count must be a non-negative integer');
            expect(result.errors).toContain('military.sector_intel.friendly_sector[0].confidence must be a finite number in [0,1]');
            expect(result.errors).toContain('military.sector_intel.friendly_sector[0].visible_brigade_ids must be a string array');
            expect(result.errors).toContain('military.sector_intel.friendly_sector[0].osid_confidence[0].sources must contain only: passive_contact, patrol, scout, combat');
        }
    });

    it('malformed persisted corps_front_sectors rejects invalid topology leaves', () => {
        const state = minimalValid();
        (state.military as any).corps_front_sectors = {
            sector_a: {
                sector_id: 'wrong_key',
                corps_id: '',
                faction: 4,
                opposing_factions: ['RS', 1],
                edge_ids: 'edge_a',
                sub_segments: [{
                    sub_segment_id: '',
                    edge_ids: ['edge_a'],
                    friendly_osids: null,
                    enemy_osids: [],
                    length_edges: -1,
                    primary_brigade_ids: [],
                    gap: 'yes',
                }],
                length_edges: -1,
                territory_osids: [],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: Number.NaN,
                threat_ratio: -1,
                defensive_power: -1,
                sector_stance: 'charge',
                stance_source: 'scenario',
            },
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toContain('military.corps_front_sectors.sector_a.sector_id must match its record key');
            expect(result.errors).toContain('military.corps_front_sectors.sector_a.corps_id must be a non-empty string');
            expect(result.errors).toContain('military.corps_front_sectors.sector_a.edge_ids must be a string array');
            expect(result.errors).toContain('military.corps_front_sectors.sector_a.density must be a finite non-negative number');
            expect(result.errors).toContain('military.corps_front_sectors.sector_a.sub_segments[0].friendly_osids must be a string array');
            expect(result.errors).toContain('military.corps_front_sectors.sector_a.sub_segments[0].gap must be a boolean when present');
        }
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
