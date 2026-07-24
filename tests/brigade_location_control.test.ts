import { describe, expect, it } from 'vitest';
import type { FormationKind, FormationState, GameState } from '../src/state/game_state.js';
import { validateBrigadeLocationControl } from '../src/validate/brigade_location_control.js';

function formation(id: string, kind: FormationKind | undefined, locationOsid?: string): FormationState {
    return {
        id,
        faction: 'RBiH',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        ...(kind ? { kind } : {}),
        ...(locationOsid ? { location_osid: locationOsid } : {}),
    } as FormationState;
}

describe('validateBrigadeLocationControl', () => {
    it('rejects every active physical combat formation without exact faction control', () => {
        const formations: Record<string, FormationState> = {
            brigade_missing: formation('brigade_missing', 'brigade'),
            militia_missing: formation('militia_missing', 'militia'),
            og_allied: formation('og_allied', 'og', 'op:test:allied'),
            operational_group_owned: formation('operational_group_owned', 'operational_group', 'op:test:owned'),
            jna_missing: formation('jna_missing', 'jna_phantom'),
            hv_missing: formation('hv_missing', 'hv_phantom'),
            paramilitary_uncontrolled: formation('paramilitary_uncontrolled', 'paramilitary', 'op:test:uncontrolled'),
            legacy_brigade_missing: formation('legacy_brigade_missing', undefined),
            corps_command: formation('corps_command', 'corps'),
            corps_asset_command: formation('corps_asset_command', 'corps_asset'),
            army_hq_command: formation('army_hq_command', 'army_hq'),
        };
        const state = {
            meta: { phase: 'war' },
            military: { formations },
            political: {
                political_controllers: {
                    'op:test:allied': 'HRHB',
                    'op:test:owned': 'RBiH',
                    'op:test:uncontrolled': null,
                },
                war_alliance_rbih_hrhb: 1,
            },
        } as unknown as GameState;

        const issues = validateBrigadeLocationControl(state);

        expect(issues.map(issue => [issue.code, issue.path])).toEqual([
            ['formation.location_missing', 'formations.brigade_missing.location_osid'],
            ['formation.location_missing', 'formations.militia_missing.location_osid'],
            ['formation.location_not_controlled', 'formations.og_allied.location_osid'],
            ['formation.location_missing', 'formations.jna_missing.location_osid'],
            ['formation.location_missing', 'formations.hv_missing.location_osid'],
            ['formation.location_not_controlled', 'formations.paramilitary_uncontrolled.location_osid'],
            ['formation.location_missing', 'formations.legacy_brigade_missing.location_osid'],
        ]);
    });

    it('does not validate inactive physical formations or non-spatial command records', () => {
        const inactive = formation('inactive_brigade', 'brigade');
        inactive.status = 'inactive';
        const state = {
            meta: { phase: 'war' },
            military: {
                formations: {
                    inactive_brigade: inactive,
                    corps_command: formation('corps_command', 'corps'),
                    corps_asset_command: formation('corps_asset_command', 'corps_asset'),
                    army_hq_command: formation('army_hq_command', 'army_hq'),
                },
            },
            political: { political_controllers: {} },
        } as unknown as GameState;

        expect(validateBrigadeLocationControl(state)).toEqual([]);
    });
});
