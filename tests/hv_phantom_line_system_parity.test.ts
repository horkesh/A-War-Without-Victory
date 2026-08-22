import { describe, expect, it } from 'vitest';

import { getFactionBrigades } from '../src/sim/combat/bot_brigade_context.js';
import { buildCorpsOperationReadinessInputSnapshot } from '../src/sim/combat/corps_operation_readiness.js';
import { buildActiveCombatFormationScanIds } from '../src/sim/combat/sector_building.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

function formation(id: string, kind: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        faction: 'HRHB',
        kind,
        status: 'active',
        created_turn: 174,
        personnel: 2_000,
        cohesion: 80,
        morale: 80,
        officer_quality: 0.8,
        corps_id: 'hvo_tomislavgrad',
        location_osid: 'op:duvno:tomislavgrad_2',
        assignment: null,
        ...overrides,
    } as FormationState;
}

function stateWith(formations: FormationState[]): GameState {
    return {
        meta: { turn: 174, phase: 'war' },
        factions: [{
            id: 'HRHB',
            capability_profile: {
                year: 1995,
                training_quality: 0.8,
                organizational_maturity: 0.8,
                equipment_access: 0.8,
                doctrine_effectiveness: { ATTACK: 0.8 },
            },
        }],
        military: {
            formations: Object.fromEntries(formations.map((item) => [item.id, item])),
            corps_command: { hvo_tomislavgrad: { corps_exhaustion: 0 } },
        },
        political: {},
    } as unknown as GameState;
}

describe('HV phantom parity at corps line-system boundaries', () => {
    it('admits HV phantoms to bot brigade context while rejecting non-line formations', () => {
        const state = stateWith([
            formation('line_brigade', 'brigade'),
            formation('expeditionary_hv', 'hv_phantom'),
            formation('command_asset', 'corps_asset'),
        ]);

        expect(getFactionBrigades(state, 'HRHB').map((item) => item.id)).toEqual([
            'expeditionary_hv',
            'line_brigade',
        ]);
    });

    it('includes HV phantoms in the sector topology active-combat scan', () => {
        const formations = {
            line_brigade: formation('line_brigade', 'brigade'),
            expeditionary_hv: formation('expeditionary_hv', 'hv_phantom'),
            command_asset: formation('command_asset', 'corps_asset'),
        };

        expect(buildActiveCombatFormationScanIds(formations as any)).toEqual([
            'expeditionary_hv',
            'line_brigade',
        ]);
    });

    it('counts an HV phantom as an active subordinate in corps readiness', () => {
        const state = stateWith([
            formation('hvo_tomislavgrad', 'corps', { corps_id: undefined }),
            formation('expeditionary_hv', 'hv_phantom'),
        ]);

        const snapshot = buildCorpsOperationReadinessInputSnapshot(state, 'hvo_tomislavgrad');
        expect(snapshot.active_subordinate_count).toBe(1);
        expect(snapshot.mean_officer_quality).toBe(0.8);
        expect(snapshot.mean_cohesion_normalized).toBe(0.8);
        expect(snapshot.mean_morale_normalized).toBe(0.8);
    });
});
