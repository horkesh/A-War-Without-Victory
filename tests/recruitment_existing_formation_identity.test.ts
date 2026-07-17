import { describe, expect, it, vi } from 'vitest';
import type { OobBrigade } from '../src/scenario/oob_loader.js';
import { initializeRecruitmentResources, runBotRecruitment } from '../src/sim/recruitment_engine.js';
import { assertFormationsInFriendlyTerritory } from '../src/sim/combat/assert_formation_territory.js';
import { runOngoingRecruitment } from '../src/sim/recruitment_turn.js';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import { RECRUITMENT_DEFAULTS } from '../src/state/recruitment_types.js';

function makeMandatoryBrigade(overrides: Partial<OobBrigade> & Pick<OobBrigade, 'id' | 'faction' | 'name' | 'home_mun'>): OobBrigade {
    return {
        kind: 'brigade',
        ...RECRUITMENT_DEFAULTS,
        mandatory: true,
        available_from: 0,
        ...overrides
    };
}

function makeState(existing: FormationState): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 1, seed: 'test', phase: 'war' },
        factions: [
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: {
            formations: { [existing.id]: { ...existing } },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {
                [militiaPoolKey('rogatica', 'RS')]: {
                    mun_id: 'rogatica',
                    faction: 'RS',
                    available: 3000,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 1
                }
            }
        } as any,
        political: {
            political_controllers: { s1: 'RS' }
        } as any
    } as unknown as GameState;
}

describe('recruitment existing formation identity', () => {
    it('does not recreate an already-existing mandatory OOB brigade when the recruited ledger is stale', () => {
        const existing: FormationState = {
            id: 'rs_1st_podrinje',
            faction: 'RS',
            name: '1st Podrinje Light Infantry',
            created_turn: 0,
            status: 'active',
            assignment: null,
            tags: ['corps:vrs_drina', 'mun:rogatica'],
            kind: 'brigade',
            personnel: 1500,
            readiness: 'active',
            cohesion: 67,
            corps_id: 'vrs_drina',
            origin_mun: 'rogatica',
            location_osid: 'op:rogatica:pljesevica',
            home_osid: 'op:rogatica:rogatica_2',
            max_personnel: 2000
        };
        const state = makeState(existing);
        const resources = initializeRecruitmentResources(['RS'], { RS: 0 }, { RS: 0 });
        const brigades = [
            makeMandatoryBrigade({
                id: 'rs_1st_podrinje',
                faction: 'RS',
                name: '1st Podrinje Light Infantry',
                home_mun: 'rogatica',
                corps: 'vrs_drina',
                initial_personnel: 900,
                initial_cohesion: 47,
                home_osid: 'op:rogatica:rogatica_2',
                priority: 1
            })
        ];

        const report = runBotRecruitment(state, [], brigades, resources, new Map([['s1', 'rogatica']]), { rogatica: 's1' }, {
            includeCorps: false,
            includeMandatory: true
        });

        expect(report.mandatory_recruited).toBe(0);
        expect(state.military.formations['rs_1st_podrinje']).toEqual(existing);
        expect(resources.recruited_brigade_ids).toContain('rs_1st_podrinje');
    });

    it('does not accrue mandatory mobilization manpower for an already-existing OOB brigade', () => {
        const existing: FormationState = {
            id: 'rs_5th_podrinje',
            faction: 'RS',
            name: '5th Podrinje Light Infantry',
            created_turn: 0,
            status: 'active',
            assignment: null,
            tags: ['corps:vrs_drina', 'mun:vlasenica'],
            kind: 'brigade',
            personnel: 1200,
            readiness: 'active',
            cohesion: 67,
            corps_id: 'vrs_drina',
            origin_mun: 'vlasenica',
            location_osid: 'op:vlasenica:bacici',
            home_osid: 'op:vlasenica:sebiocina',
            max_personnel: 2000
        };
        const state = makeState(existing);
        state.military.militia_pools = {
            [militiaPoolKey('vlasenica', 'RS')]: {
                mun_id: 'vlasenica',
                faction: 'RS',
                available: 60,
                committed: 0,
                exhausted: 0,
                updated_turn: 1
            }
        } as any;
        state.military.recruitment_state = initializeRecruitmentResources(['RS'], { RS: 0 }, { RS: 0 }, { RS: 0 }, { RS: 0 }, 1);
        state.political.political_controllers = { s1: 'RS' } as any;
        const brigades = [
            makeMandatoryBrigade({
                id: 'rs_5th_podrinje',
                faction: 'RS',
                name: '5th Podrinje Light Infantry',
                home_mun: 'vlasenica',
                corps: 'vrs_drina',
                initial_personnel: 720,
                home_osid: 'op:vlasenica:sebiocina',
                priority: 1
            })
        ];

        const report = runOngoingRecruitment(state, [], brigades, new Map([['s1', 'vlasenica']]), { vlasenica: 's1' });

        expect(report?.mandatory_recruited).toBe(0);
        expect(state.military.militia_pools[militiaPoolKey('vlasenica', 'RS')]?.available).toBe(60);
        expect(state.military.recruitment_state.recruited_brigade_ids).toContain('rs_5th_podrinje');
    });

    it('reanchors home and physical location to the friendly resolved HQ when authored home_osid has flipped enemy', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 22, seed: 'test', phase: 'war' },
            factions: [
                { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {
                    [militiaPoolKey('srebrenica', 'RBiH')]: {
                        mun_id: 'srebrenica',
                        faction: 'RBiH',
                        available: 3000,
                        committed: 0,
                        exhausted: 0,
                        updated_turn: 22
                    }
                }
            },
            political: {
                political_controllers: {
                    s_safe: 'RBiH',
                    s_presence: 'RBiH',
                    'op:srebrenica:osmace_2': 'RS',
                    'op:srebrenica:potocari_2': 'RBiH',
                }
            }
        } as unknown as GameState;

        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 });
        const brigades = [
            makeMandatoryBrigade({
                id: 'arbih_284th_east_bosnian_light',
                faction: 'RBiH',
                name: '284th East Bosnian Light Infantry',
                home_mun: 'srebrenica',
                corps: 'arbih_2nd_corps',
                initial_personnel: 900,
                home_osid: 'op:srebrenica:osmace_2',
                priority: 1
            })
        ];

        runBotRecruitment(
            state,
            [],
            brigades,
            resources,
            new Map([
                ['s_safe', 'srebrenica'],
                ['s_presence', 'srebrenica'],
            ]),
            { srebrenica: 's_safe' },
            {
                includeCorps: false,
                includeMandatory: true,
                canonicalToOperational: {
                    s_safe: 'op:srebrenica:potocari_2',
                },
            }
        );

        const formation = state.military.formations['arbih_284th_east_bosnian_light']!;
        expect(formation.home_osid).toBe('op:srebrenica:potocari_2');
        expect(formation.location_osid).toBe('op:srebrenica:potocari_2');

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        assertFormationsInFriendlyTerritory(state);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('places ongoing enclave recruitment at a deterministic friendly enclave OSID when no canonical placement map is available', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 22, seed: 'test', phase: 'war' },
            factions: [
                { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {
                    [militiaPoolKey('srebrenica', 'RBiH')]: {
                        mun_id: 'srebrenica',
                        faction: 'RBiH',
                        available: 3000,
                        committed: 0,
                        exhausted: 0,
                        updated_turn: 22
                    }
                }
            },
            political: {
                political_controllers: {
                    'op:srebrenica:osmace_2': 'RS',
                    'op:srebrenica:srebrenica_2': 'RBiH',
                    'op:srebrenica:potocari_2': 'RBiH',
                }
            }
        } as unknown as GameState;

        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 });
        const brigades = [
            makeMandatoryBrigade({
                id: 'arbih_284th_east_bosnian_light',
                faction: 'RBiH',
                name: '284th East Bosnian Light Infantry',
                home_mun: 'srebrenica',
                corps: 'arbih_2nd_corps',
                initial_personnel: 900,
                home_osid: 'op:srebrenica:osmace_2',
                priority: 1,
                tags: ['enclave'],
            })
        ];

        runBotRecruitment(
            state,
            [],
            brigades,
            resources,
            new Map([
                ['op:srebrenica:osmace_2', 'srebrenica'],
                ['op:srebrenica:srebrenica_2', 'srebrenica'],
                ['op:srebrenica:potocari_2', 'srebrenica'],
            ]),
            { srebrenica: 'missing_sid_without_osid_mapping' },
            {
                includeCorps: false,
                includeMandatory: true,
            }
        );

        const formation = state.military.formations['arbih_284th_east_bosnian_light']!;
        expect(formation.home_osid).toBe('op:srebrenica:potocari_2');
        expect(formation.location_osid).toBe('op:srebrenica:potocari_2');

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        assertFormationsInFriendlyTerritory(state);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
