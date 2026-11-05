import assert from 'node:assert';
import { describe, expect, test } from 'vitest';
import { loadOobBrigades } from '../src/scenario/oob_loader.js';
import type { OobBrigade } from '../src/scenario/oob_loader.js';
import { initializeRecruitmentResources } from '../src/sim/recruitment_engine.js';
import { accrueRecruitmentResources, runOngoingRecruitment, selectAutomaticRecruitmentFactions } from '../src/sim/recruitment_turn.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';

function makeState(): GameState {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 4, seed: 'test', phase: 'war' },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 60, legitimacy: 60, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                embargo_profile: {
                    heavy_equipment_access: 1,
                    ammunition_resupply_rate: 1,
                    maintenance_capacity: 1,
                    smuggling_efficiency: 0,
                    external_pipeline_status: 1
                }
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {
            [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 5000, committed: 0, exhausted: 0, updated_turn: 4 }
        },
    production_facilities: {
            pf_zenica: {
                facility_id: 'pf_zenica',
                name: 'Zenica Foundry',
                municipality_id: 'zenica',
                type: 'heavy_equipment',
                base_capacity: 5,
                current_condition: 1,
                required_inputs: { electricity: true, raw_materials: true, skilled_labor: true }
            }
        },
    recruitment_state: initializeRecruitmentResources(
            ['RBiH'],
            { RBiH: 10 },
            { RBiH: 10 },
            { RBiH: 1 },
            { RBiH: 2 },
            1
        )
  } as any,
  political: {
    political_controllers: {
            s1: 'RBiH'
        }
  } as any,
  displacement: {
    displacement_state: {
            zenica: {
                mun_id: 'zenica',
                original_population: 1000,
                displaced_out: 0,
                displaced_in: 0,
                lost_population: 0,
                last_updated_turn: 4
            }
        }
  } as any,
};
}

describe('accrueRecruitmentResources', () => {
    test('accrues capital and equipment from trickle + production/population inputs', () => {
        const state = makeState();
        const settlements = new Map([
            [
                's1',
                {
                    sid: 's1',
                    name: 'S1',
                    source_id: 's1',
                    source: 'test',
                    mun: 'zenica',
                    mun_code: 'zenica',
                    mun1990_id: 'zenica'
                }
            ]
        ]);
        const accrual = accrueRecruitmentResources(state, settlements, {
            schema: 1,
            turn: 4,
            by_municipality: [{ mun_id: 'zenica', capacity: 1, controlling_faction_id: 'RBiH' }]
        });
        assert.ok(accrual);
        assert.strictEqual(accrual!.by_faction.length, 1);
        assert.strictEqual(accrual!.by_faction[0]!.capital_delta, 2);
        assert.strictEqual(accrual!.by_faction[0]!.equipment_delta, 16);
        assert.strictEqual(state.military.recruitment_state!.recruitment_capital.RBiH.points, 12);
        // Embargo pool ceiling: Math.round(points_initial * (1 + embargoAccess)) = Math.round(10 * 1.7) = 17
        assert.strictEqual(state.military.recruitment_state!.equipment_pools.RBiH.points, 17);
    });
});

describe('runOngoingRecruitment', () => {
    test('prioritizes the source-dated 31st Drina lineage within the real cap-2 mandatory queue', async () => {
        const loaded = await loadOobBrigades(process.cwd());
        const lineage = loaded.find((brigade) => brigade.id === 'arbih_831st_drina_lineage');
        expect(lineage).toBeDefined();
        expect(lineage!.priority).toBe(49);

        const queuePeer = (id: string): OobBrigade => ({
            id,
            faction: 'RBiH',
            name: id,
            home_mun: 'gorazde',
            kind: 'brigade',
            manpower_cost: 800,
            capital_cost: 10,
            default_equipment_class: 'light_infantry',
            home_osid: 'op:gorazde:gorazde_2',
            priority: 50,
            mandatory: true,
            available_from: 7,
            initial_personnel: 600,
            max_personnel: 1800,
        });
        const runQueue = (turn: number, lineagePriority: number) => {
            const state = makeState();
            state.meta.turn = turn;
            state.military.formations = {};
            state.military.militia_pools = {
                [militiaPoolKey('gorazde', 'RBiH')]: {
                    mun_id: 'gorazde',
                    faction: 'RBiH',
                    available: 34,
                    committed: 5500,
                    exhausted: 92,
                    updated_turn: 7,
                },
            };
            state.military.recruitment_state = initializeRecruitmentResources(
                ['RBiH'],
                { RBiH: 0 },
                { RBiH: 0 },
                { RBiH: 0 },
                { RBiH: 0 },
                2,
            );
            state.political.political_controllers = {
                'op:gorazde:gorazde_2': 'RBiH',
            };
            const report = runOngoingRecruitment(
                state,
                [],
                [
                    queuePeer('arbih_212th_mountain'),
                    queuePeer('arbih_223rd_mountain'),
                    { ...lineage!, priority: lineagePriority },
                ],
                new Map([['op:gorazde:gorazde_2', 'gorazde']]),
                { gorazde: 'op:gorazde:gorazde_2' },
            );
            const pool = state.military.militia_pools?.[militiaPoolKey('gorazde', 'RBiH')];
            return {
                actionIds: report?.actions.map((action) => action.brigade_id),
                mandatoryRecruited: report?.mandatory_recruited,
                formationIds: Object.keys(state.military.formations).sort(),
                lineagePersonnel: state.military.formations.arbih_831st_drina_lineage?.personnel,
                poolAvailable: pool?.available,
                poolCommitted: pool?.committed,
            };
        };

        expect(runQueue(6, 49)).toEqual({
            actionIds: [],
            mandatoryRecruited: 0,
            formationIds: [],
            lineagePersonnel: undefined,
            poolAvailable: 34,
            poolCommitted: 5500,
        });

        const defaultPriority = runQueue(7, 50);
        expect(defaultPriority).toMatchObject({
            actionIds: ['arbih_212th_mountain', 'arbih_223rd_mountain'],
            mandatoryRecruited: 2,
            formationIds: ['arbih_212th_mountain', 'arbih_223rd_mountain'],
            lineagePersonnel: undefined,
        });

        const prioritized = runQueue(7, lineage!.priority);
        expect(prioritized).toEqual({
            actionIds: ['arbih_831st_drina_lineage', 'arbih_212th_mountain'],
            mandatoryRecruited: 2,
            formationIds: ['arbih_212th_mountain', 'arbih_831st_drina_lineage'],
            lineagePersonnel: 900,
            poolAvailable: 0,
            poolCommitted: 7000,
        });
        expect(runQueue(7, lineage!.priority)).toEqual(prioritized);
        expect(prioritized.formationIds).not.toContain('arbih_223rd_mountain');
    });

    test('keeps player recruitment manual at autonomy 0-1 and delegates it at 2-3 or headless', () => {
        const state = makeState();
        state.meta.player_faction = 'RBiH';
        state.factions = [
            ...state.factions,
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ];

        state.meta.autonomy_level = 0;
        expect(selectAutomaticRecruitmentFactions(state)).toEqual(['RS']);
        state.meta.autonomy_level = 1;
        expect(selectAutomaticRecruitmentFactions(state)).toEqual(['RS']);
        state.meta.autonomy_level = 2;
        expect(selectAutomaticRecruitmentFactions(state)).toEqual(['RBiH', 'RS']);
        state.meta.autonomy_level = 3;
        expect(selectAutomaticRecruitmentFactions(state)).toEqual(['RBiH', 'RS']);
        state.meta.autonomy_level = 0;
        state.meta.headless_scenario_auto_control = true;
        expect(selectAutomaticRecruitmentFactions(state)).toEqual(['RBiH', 'RS']);
    });

    test('does not consume an assisted player formation through ongoing bot recruitment', () => {
        const state = makeState();
        state.meta.player_faction = 'RBiH';
        state.meta.autonomy_level = 1;
        const brigade: OobBrigade = {
            id: 'rbih_player_choice',
            faction: 'RBiH',
            name: 'Player Choice Brigade',
            home_mun: 'zenica',
            kind: 'brigade',
            manpower_cost: 800,
            capital_cost: 10,
            default_equipment_class: 'light_infantry',
            home_osid: 'op:zenica:core',
            priority: 1,
            mandatory: false,
            available_from: 0,
            max_personnel: 3000,
        };

        const report = runOngoingRecruitment(state, [], [brigade], new Map([['s1', 'zenica']]), { zenica: 's1' });

        expect(report?.actions).toEqual([]);
        expect(state.military.formations[brigade.id]).toBeUndefined();
        expect(state.military.recruitment_state?.recruited_brigade_ids).not.toContain(brigade.id);
    });

    test('applies per-faction recruit cap deterministically', () => {
        const state = makeState();
        const brigades: OobBrigade[] = [
            {
                id: 'b1',
                faction: 'RBiH',
                name: 'B1',
                home_mun: 'zenica',
                kind: 'brigade',
                manpower_cost: 800,
                capital_cost: 10,
                default_equipment_class: 'light_infantry',
                home_osid: 'op:zenica:core',
                priority: 1,
                mandatory: false,
                available_from: 0,
                max_personnel: 3000
            },
            {
                id: 'b2',
                faction: 'RBiH',
                name: 'B2',
                home_mun: 'zenica',
                kind: 'brigade',
                manpower_cost: 800,
                capital_cost: 10,
                default_equipment_class: 'light_infantry',
                home_osid: 'op:zenica:core',
                priority: 2,
                mandatory: false,
                available_from: 0,
                max_personnel: 3000
            }
        ];
        const report = runOngoingRecruitment(
            state,
            [],
            brigades,
            new Map([['s1', 'zenica']]),
            { zenica: 's1' }
        );
        assert.ok(report);
        assert.strictEqual(report!.elective_recruited, 1);
        assert.strictEqual(report!.actions.length, 1);
        assert.ok(state.military.formations['b1'] || state.military.formations['b2']);
    });

    test('retries mandatory brigade recruitment during ongoing phase', () => {
        const state = makeState();
        const brigades: OobBrigade[] = [
            {
                id: 'mandatory_b1',
                faction: 'RBiH',
                name: 'Mandatory B1',
                home_mun: 'zenica',
                kind: 'brigade',
                manpower_cost: 800,
                capital_cost: 10,
                default_equipment_class: 'light_infantry',
                home_osid: 'op:zenica:core',
                priority: 1,
                mandatory: true,
                available_from: 0,
                max_personnel: 3000
            }
        ];
        const report = runOngoingRecruitment(
            state,
            [],
            brigades,
            new Map([['s1', 'zenica']]),
            { zenica: 's1' }
        );
        assert.ok(report);
        assert.strictEqual(report!.mandatory_recruited, 1);
        assert.strictEqual(report!.actions.length, 1);
        assert.strictEqual(report!.actions[0]!.mandatory, true);
        assert.ok(state.military.formations['mandatory_b1']);
        assert.ok(state.military.formations['mandatory_b1']!.equipment_state, 'ongoing mandatory recruitment should seed equipment_state');
        assert.ok(state.military.formations['mandatory_b1']!.doctrine_state, 'ongoing mandatory recruitment should seed doctrine_state');
    });

    test('applies RS mandatory mobilization accrual across turns', () => {
        const rsPoolKey = militiaPoolKey('prijedor', 'RS');
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 4, seed: 'test', phase: 'war' },
  factions: [
                {
                    id: 'RS',
                    profile: { authority: 60, legitimacy: 60, control: 50, logistics: 50, exhaustion: 0 },
                    areasOfResponsibility: [],
                    supply_sources: [],
                    embargo_profile: {
                        heavy_equipment_access: 1,
                        ammunition_resupply_rate: 1,
                        maintenance_capacity: 1,
                        smuggling_efficiency: 0,
                        external_pipeline_status: 1
                    }
                }
            ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {
                [rsPoolKey]: { mun_id: 'prijedor', faction: 'RS', available: 60, committed: 0, exhausted: 0, updated_turn: 4 }
            },
    recruitment_state: initializeRecruitmentResources(['RS'], { RS: 0 }, { RS: 0 }, { RS: 0 }, { RS: 0 }, 1)
  } as any,
  political: {
    political_controllers: {
                s1: 'RS'
            }
  } as any,
} as unknown as GameState;

        const brigades: OobBrigade[] = [
            {
                id: 'rs_mandatory_1',
                faction: 'RS',
                name: 'RS Mandatory 1',
                home_mun: 'prijedor',
                kind: 'brigade',
                manpower_cost: 800,
                capital_cost: 10,
                default_equipment_class: 'light_infantry',
                home_osid: 'op:prijedor:core',
                priority: 1,
                mandatory: true,
                available_from: 0,
                max_personnel: 3000
            }
        ];

        const reportTurn1 = runOngoingRecruitment(
            state,
            [],
            brigades,
            new Map([['s1', 'prijedor']]),
            { prijedor: 's1' }
        );
        assert.ok(reportTurn1);
        assert.strictEqual(reportTurn1!.mandatory_recruited, 1);
        assert.ok(state.military.formations['rs_mandatory_1']);

        const reportTurn2 = runOngoingRecruitment(
            state,
            [],
            brigades,
            new Map([['s1', 'prijedor']]),
            { prijedor: 's1' }
        );
        assert.ok(reportTurn2);
        assert.strictEqual(reportTurn2!.mandatory_recruited, 0);
        assert.ok(state.military.formations['rs_mandatory_1']);
    });
});
