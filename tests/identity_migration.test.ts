import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { canonicalizePoliticalSideId, defaultArmyLabelForSide } from '../src/state/identity.js';
import { deserializeState } from '../src/state/serialize.js';
import { validateState } from '../src/validate/validate.js';

describe('identity migration contracts', () => {
    it('canonicalizePoliticalSideId maps army labels to political sides', () => {
        expect(canonicalizePoliticalSideId('ARBiH')).toBe('RBiH');
        expect(canonicalizePoliticalSideId('VRS')).toBe('RS');
        expect(canonicalizePoliticalSideId('HVO')).toBe('HRHB');
        expect(canonicalizePoliticalSideId('RBiH')).toBe('RBiH');
        expect(canonicalizePoliticalSideId('RS')).toBe('RS');
        expect(canonicalizePoliticalSideId('HRHB')).toBe('HRHB');
    });

    it('defaultArmyLabelForSide returns correct army labels', () => {
        expect(defaultArmyLabelForSide('RBiH')).toBe('ARBiH');
        expect(defaultArmyLabelForSide('RS')).toBe('VRS');
        expect(defaultArmyLabelForSide('HRHB')).toBe('HVO');
    });

    it('migration canonicalizes faction IDs in factions array', () => {
        const rawState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'test' },
            factions: [
            { id: 'ARBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'VRS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HVO', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
            } as any,
        };

        const serialized = JSON.stringify(rawState);
        const migrated = deserializeState(serialized);

        expect(migrated.factions[0].id).toBe('RBiH');
        expect(migrated.factions[1].id).toBe('RS');
        expect(migrated.factions[2].id).toBe('HRHB');
    });

    it('migration canonicalizes formation faction IDs and preserves army labels as force_label', () => {
        const rawState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'test' },
            factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {
            'F1': {
                id: 'F1',
                faction: 'ARBiH',
                name: 'Test Formation',
                created_turn: 0,
                status: 'active',
                assignment: null
            }
                },
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
            } as any,
        };

        const serialized = JSON.stringify(rawState);
        const migrated = deserializeState(serialized);

        expect(migrated.military.formations['F1'].faction).toBe('RBiH');
        expect(migrated.military.formations['F1'].force_label).toBe('ARBiH');
    });

    it('migration sets default force_label when faction is already political and force_label missing', () => {
        const rawState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'test' },
            factions: [
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {
            'F1': {
                id: 'F1',
                faction: 'RS',
                name: 'Test Formation',
                created_turn: 0,
                status: 'active',
                assignment: null
            }
                },
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
            } as any,
        };

        const serialized = JSON.stringify(rawState);
        const migrated = deserializeState(serialized);

        expect(migrated.military.formations['F1'].faction).toBe('RS');
        expect(migrated.military.formations['F1'].force_label).toBe('VRS');
    });

    it('migration canonicalizes militia pool faction IDs', () => {
        const rawState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'test' },
            factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {
            'MUN1': {
                mun_id: 'MUN1',
                faction: 'ARBiH',
                available: 100,
                committed: 0,
                exhausted: 0,
                updated_turn: 0
            }
                },
            } as any,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
            } as any,
        };

        const serialized = JSON.stringify(rawState);
        const migrated = deserializeState(serialized);

        expect(migrated.military.militia_pools['MUN1'].faction).toBe('RBiH');
    });

    it('migration canonicalizes negotiation ledger faction_id', () => {
        const rawState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'test' },
            factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [
            { id: 'NLED_0_ARBiH_gain_0', turn: 0, faction_id: 'ARBiH', kind: 'gain', amount: 10, reason: 'test' }
                ],
            } as any,
        };

        const serialized = JSON.stringify(rawState);
        const migrated = deserializeState(serialized);

        expect(migrated.political.negotiation_ledger![0].faction_id).toBe('RBiH');
    });

    it('validation rejects ARBiH/VRS/HVO as faction IDs (before migration)', () => {
        const invalidState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'test' },
            factions: [
            { id: 'ARBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
            } as any,
        };

        const issues = validateState(invalidState as any);
        const errors = issues.filter((issue) => issue.severity === 'error');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((error) => error.code === 'faction.id.not_political_side')).toBe(true);
    });

    it('validation accepts only POLITICAL_SIDES as faction IDs', () => {
        const validState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'test' },
            factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
            } as any,
        };

        const issues = validateState(validState as any);
        const errors = issues.filter((issue) => issue.severity === 'error');
        expect(errors).toHaveLength(0);
    });
});
