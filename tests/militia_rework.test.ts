/**
 * Militia/brigade rework tests (MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN).
 * - Spawn at 800 (MIN_BRIGADE_SPAWN); new brigade has personnel 800.
 * - Fragmented mun never spawns.
 * - Minority decay runs only in first 3 turns of Peace phase and reduces pool.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import { reinforceBrigadesFromPools, spawnFormationsFromPools } from '../src/sim/formation_spawn.js';
import { runMinorityMilitiaDecay } from '../src/sim/early_war/minority_militia_decay.js';
import { MIN_BRIGADE_SPAWN } from '../src/state/formation_constants.js';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import { loadOobBrigades, type OobBrigade } from '../src/scenario/oob_loader.js';
import { buildHistoricalOobLookups } from '../src/scenario/turn_inputs.js';
import { evaluateBrigade } from '../src/sim/combat/commander/force_eval.js';
import {
    getEquipmentOffensivePriority,
    resolveEquipmentClass,
} from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

function baseState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'rework-fixture', phase: 'war' },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {},
    municipalities: {}
  } as any,
        displacement: {} as any
    };
}

function defaultSpawnOptions() {
    return {
        batchSize: null,
        factionFilter: null,
        munFilter: null,
        maxPerMun: null,
        customTags: [],
        applyChanges: true,
        formationKind: 'brigade' as const
    };
}

function placementOptions(munId: string, hqOsid: string) {
    const hqSid = `hq:${munId}`;
    return {
        ...defaultSpawnOptions(),
        municipalityHqSettlement: { [munId]: hqSid },
        canonicalToOperational: { [hqSid]: hqOsid },
    };
}

test('spawn at 800: pool with 800 available spawns one brigade with personnel 800', () => {
    const state = baseState();
    state.military.formation_spawn_directive = { kind: 'brigade' };
    const key = militiaPoolKey('MUN_X', 'RBiH');
    state.military.militia_pools![key] = {
        mun_id: 'MUN_X',
        faction: 'RBiH',
        available: 800,
        committed: 0,
        exhausted: 0,
        updated_turn: 10
    };
    state.political.municipalities!['MUN_X'] = { control: 'consolidated' };
    state.political.political_controllers!['op:MUN_X:hq'] = 'RBiH';

    const report = spawnFormationsFromPools(state, placementOptions('MUN_X', 'op:MUN_X:hq'));

    assert.strictEqual(report.formations_created, 1);
    const formation = Object.values(state.military.formations!)[0] as any;
    assert.ok(formation);
    assert.strictEqual(formation.personnel, MIN_BRIGADE_SPAWN);
    assert.strictEqual(formation.faction, 'RBiH');
});

test('spawned historical brigades inherit corps from lookup', () => {
    const state = baseState();
    state.military.formation_spawn_directive = { kind: 'brigade' };
    const key = militiaPoolKey('ilijas', 'RS');
    state.military.militia_pools![key] = {
        mun_id: 'ilijas',
        faction: 'RS',
        available: 2500,
        committed: 0,
        exhausted: 0,
        updated_turn: 10
    };
    state.political.municipalities!['ilijas'] = { control: 'consolidated' };
    state.political.political_controllers!['op:ilijas:ilijas_2'] = 'RS';

    const report = spawnFormationsFromPools(state, {
        ...placementOptions('ilijas', 'op:ilijas:ilijas_2'),
        maxPerMun: 1,
        historicalNameLookup: (faction, mun, ordinal) =>
            faction === 'RS' && mun === 'ilijas' && ordinal === 1 ? '3rd Sarajevo Infantry Brigade (Ilijas)' : null,
        historicalCorpsLookup: (faction, mun, ordinal) =>
            faction === 'RS' && mun === 'ilijas' && ordinal === 1 ? 'vrs_sarajevo_romanija' : null,
        historicalOobIdLookup: (faction, mun, ordinal) =>
            faction === 'RS' && mun === 'ilijas' && ordinal === 1 ? 'rs_ilijas_brigade' : null
    });

    assert.strictEqual(report.formations_created, 1);
    const formation = Object.values(state.military.formations!)[0] as any;
    assert.strictEqual(formation.name, '3rd Sarajevo Infantry Brigade (Ilijas)');
    assert.strictEqual(formation.corps_id, 'vrs_sarajevo_romanija');
    assert.ok(formation.tags.includes('oob:rs_ilijas_brigade'));
});

test('fragmented mun never spawns', () => {
    const state = baseState();
    state.military.formation_spawn_directive = { kind: 'brigade' };
    const key = militiaPoolKey('MUN_FRAG', 'RS');
    state.military.militia_pools![key] = {
        mun_id: 'MUN_FRAG',
        faction: 'RS',
        available: 5000,
        committed: 0,
        exhausted: 0,
        updated_turn: 10
    };
    state.political.municipalities!['MUN_FRAG'] = { control: 'fragmented' };

    const report = spawnFormationsFromPools(state, defaultSpawnOptions());

    assert.strictEqual(report.formations_created, 0, 'fragmented mun must not spawn');
});

test('minority decay runs only in first 3 turns of Peace phase and reduces pool', () => {
    const state = baseState();
    state.meta.phase = 'war';
    state.meta.war_start_turn = 10;
    state.meta.turn = 10;
    state.political.political_controllers = { s1: 'RS', s2: 'RS' };
    const key = militiaPoolKey('MUN_NONURBAN', 'RBiH');
    state.military.militia_pools![key] = {
        mun_id: 'MUN_NONURBAN',
        faction: 'RBiH',
        available: 1000,
        committed: 0,
        exhausted: 0,
        updated_turn: 10
    };
    state.political.municipalities!['MUN_NONURBAN'] = { control: 'consolidated' };
    const settlements = new Map([
        ['s1', { sid: 's1', mun1990_id: 'MUN_NONURBAN', mun_code: 'MUN_NONURBAN' } as any],
        ['s2', { sid: 's2', mun1990_id: 'MUN_NONURBAN', mun_code: 'MUN_NONURBAN' } as any]
    ]);
    const population1991 = {
        MUN_NONURBAN: { total: 10000, bosniak: 2000, serb: 6000, croat: 1500, other: 500 }
    };

    const report = runMinorityMilitiaDecay(state, settlements, population1991);

    assert.ok(report.pools_affected >= 1);
    assert.ok(report.manpower_removed > 0);
    assert.ok(state.military.militia_pools![key].available < 1000);
});

test('minority decay does not run outside first 3 turns of Peace phase', () => {
    const state = baseState();
    state.meta.phase = 'war';
    state.meta.war_start_turn = 10;
    state.meta.turn = 14;
    state.political.political_controllers = { s1: 'RS' };
    const key = militiaPoolKey('MUN_X', 'RBiH');
    state.military.militia_pools![key] = {
        mun_id: 'MUN_X',
        faction: 'RBiH',
        available: 1000,
        committed: 0,
        exhausted: 0,
        updated_turn: 14
    };
    state.political.municipalities!['MUN_X'] = { control: 'consolidated' };
    const settlements = new Map([['s1', { sid: 's1', mun1990_id: 'MUN_X', mun_code: 'MUN_X' } as any]]);

    const report = runMinorityMilitiaDecay(state, settlements);

    assert.strictEqual(report.pools_affected, 0);
    assert.strictEqual(report.manpower_removed, 0);
    assert.strictEqual(state.military.militia_pools![key].available, 1000);
});

test('reinforce uses MIN_BRIGADE_SPAWN (800) when personnel absent', () => {
    const state = baseState();
    state.military.formations!['F1'] = {
        id: 'F1',
        faction: 'RBiH',
        name: 'Test',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        tags: ['mun:MUN_Z']
    } as any;
    state.military.militia_pools![militiaPoolKey('MUN_Z', 'RBiH')] = {
        mun_id: 'MUN_Z',
        faction: 'RBiH',
        available: 2000,
        committed: 0,
        exhausted: 0,
        updated_turn: 10
    };

    reinforceBrigadesFromPools(state);

    const f = state.military.formations!['F1'] as any;
    assert.ok(f.personnel !== undefined);
    assert.ok(f.personnel >= MIN_BRIGADE_SPAWN && f.personnel <= 2500);
});

test('spawn priority: reinforcement reserves one spawn batch when directive is active', () => {
    const state = baseState();
    state.military.formation_spawn_directive = { kind: 'brigade' };
    state.military.formations!['F1'] = {
        id: 'F1',
        faction: 'RBiH',
        name: 'Existing Zenica Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        readiness: 'active',
        personnel: 1000,
        tags: ['mun:zenica']
    } as any;
    state.political.municipalities!['zenica'] = { control: 'consolidated' };
    state.political.political_controllers!['op:zenica:zenica_2'] = 'RBiH';
    state.military.militia_pools![militiaPoolKey('zenica', 'RBiH')] = {
        mun_id: 'zenica',
        faction: 'RBiH',
        available: 850,
        committed: 0,
        exhausted: 0,
        updated_turn: 10
    };

    const reinforce = reinforceBrigadesFromPools(state);
    assert.strictEqual(reinforce.manpower_added, 50, 'reinforcement should keep 800 reserved for spawn');

    const spawn = spawnFormationsFromPools(state, placementOptions('zenica', 'op:zenica:zenica_2'));
    assert.strictEqual(spawn.formations_created, 1, 'reserved manpower should allow one new brigade spawn');
    assert.strictEqual(Object.keys(state.military.formations ?? {}).length, 2, 'existing + newly spawned brigade expected');
});

test('spawn placement prefers a faction-controlled municipality HQ OSID', () => {
    const state = baseState();
    const key = militiaPoolKey('zenica', 'RBiH');
    state.military.militia_pools![key] = {
        mun_id: 'zenica', faction: 'RBiH', available: 800, committed: 0, exhausted: 0, updated_turn: 10,
    };
    state.political.municipalities!['zenica'] = { control: 'consolidated' };
    state.political.political_controllers = {
        'op:zenica:a_controlled': 'RBiH',
        'op:zenica:zenica_2': 'RBiH',
    };

    const report = spawnFormationsFromPools(state, placementOptions('zenica', 'op:zenica:zenica_2'));

    assert.strictEqual(report.formations_created, 1);
    const formation = Object.values(state.military.formations!)[0]!;
    assert.strictEqual(formation.location_osid, 'op:zenica:zenica_2');
});

test('spawn placement falls back to the first sorted faction-controlled OSID in the municipality', () => {
    const state = baseState();
    const key = militiaPoolKey('zenica', 'RBiH');
    state.military.militia_pools![key] = {
        mun_id: 'zenica', faction: 'RBiH', available: 800, committed: 0, exhausted: 0, updated_turn: 10,
    };
    state.political.municipalities!['zenica'] = { control: 'consolidated' };
    state.political.political_controllers = {
        'op:zenica:z_controlled': 'RBiH',
        'op:zenica:enemy_hq': 'RS',
        'op:zenica:a_controlled': 'RBiH',
    };

    const report = spawnFormationsFromPools(state, placementOptions('zenica', 'op:zenica:enemy_hq'));

    assert.strictEqual(report.formations_created, 1);
    const formation = Object.values(state.military.formations!)[0]!;
    assert.strictEqual(formation.location_osid, 'op:zenica:a_controlled');
});

test('spawn rejects an unplaceable combat formation before pool, force, or report mutation', () => {
    const state = baseState();
    const key = militiaPoolKey('zenica', 'RBiH');
    state.military.militia_pools![key] = {
        mun_id: 'zenica', faction: 'RBiH', available: 800, committed: 25, exhausted: 0, updated_turn: 7,
    };
    state.political.municipalities!['zenica'] = { control: 'consolidated' };
    state.political.political_controllers = {
        'op:zenica:enemy_hq': 'RS',
        'op:zenica:enemy_other': 'RS',
    };

    const report = spawnFormationsFromPools(state, placementOptions('zenica', 'op:zenica:enemy_hq'));

    assert.deepStrictEqual(report, {
        formations_created: 0,
        manpower_committed: 0,
        pools_touched: 0,
        created: [],
    });
    assert.deepStrictEqual(state.military.formations, {});
    assert.deepStrictEqual(state.military.militia_pools![key], {
        mun_id: 'zenica', faction: 'RBiH', available: 800, committed: 25, exhausted: 0, updated_turn: 7,
    });
});

// ---------------------------------------------------------------------------
// Historical OOB equipment-class propagation through the shared builder and
// the legacy emergent spawn. These tests use the actual loader, builder,
// spawn and equipment resolver rather than mirroring their rules.
// ---------------------------------------------------------------------------

type SpawnOptions = Parameters<typeof spawnFormationsFromPools>[1];

let realOobCache: Promise<OobBrigade[]> | undefined;

function realOob(): Promise<OobBrigade[]> {
    realOobCache ??= loadOobBrigades(process.cwd());
    return realOobCache;
}

function ordinalFor(
    oob: readonly OobBrigade[],
    lookups: ReturnType<typeof buildHistoricalOobLookups>,
    faction: string,
    mun: string,
    id: string,
): number {
    const count = oob.filter((b) => b.faction === faction && b.home_mun === mun).length;
    for (let ordinal = 1; ordinal <= count; ordinal += 1) {
        if (lookups.historicalOobIdLookup?.(faction, mun, ordinal) === id) return ordinal;
    }
    throw new Error(`No ordinal matched ${faction}:${mun}:${id}`);
}

function spawnHistorical(
    oob: readonly OobBrigade[],
    faction: string,
    mun: string,
    id: string,
    overrides: Partial<SpawnOptions> = {},
): {
    state: GameState;
    formation: FormationState;
    record: OobBrigade;
    ordinal: number;
    lookups: ReturnType<typeof buildHistoricalOobLookups>;
    report: ReturnType<typeof spawnFormationsFromPools>;
} {
    const lookups = buildHistoricalOobLookups(oob);
    const ordinal = ordinalFor(oob, lookups, faction, mun, id);
    const record = oob.find((b) => b.id === id);
    assert.ok(record, `fixture must contain OOB record ${id}`);
    const state = baseState();
    const key = militiaPoolKey(mun, faction);
    state.military.militia_pools![key] = {
        mun_id: mun,
        faction,
        available: 2500,
        committed: 0,
        exhausted: 0,
        updated_turn: 10,
    };
    state.political.municipalities![mun] = { control: 'consolidated' };
    state.political.political_controllers![`op:${mun}:hq`] = faction;

    const report = spawnFormationsFromPools(state, {
        ...placementOptions(mun, `op:${mun}:hq`),
        maxPerMun: 1,
        historicalNameLookup: lookups.historicalNameLookup,
        historicalCorpsLookup: lookups.historicalCorpsLookup,
        historicalOobIdLookup: lookups.historicalOobIdLookup,
        historicalEquipmentClassLookup: lookups.historicalEquipmentClassLookup,
        ...overrides,
    });
    const formation = Object.values(state.military.formations ?? {})[0];
    assert.ok(formation, 'expected one spawned formation');
    return { state, formation, record, ordinal, lookups, report };
}

function equipTags(formation: FormationState): string[] {
    return (formation.tags ?? []).filter((tag) => tag.startsWith('equip:'));
}

const REAL_CLASS_CASES = [
    { faction: 'RS', mun: 'sokolac', id: 'rs_2nd_romanija_brigade', expected: 'motorized' },
    { faction: 'RS', mun: 'ilijas', id: 'rs_ilijas_brigade', expected: 'light_infantry' },
    { faction: 'RBiH', mun: 'hadzici', id: 'arbih_102nd_motorized', expected: 'motorized' },
    { faction: 'HRHB', mun: 'ljubuski', id: 'hrhb_ljubuki_brigade', expected: 'mountain' },
    { faction: 'RS', mun: 'novo_sarajevo', id: 'rs_1st_sarajevo_mechanized', expected: 'mechanized' },
] as const;

for (const testCase of REAL_CLASS_CASES) {
    test(`real OOB ${testCase.id}: same matched record supplies id/name/corps/equipment class`, async () => {
        const spawned = spawnHistorical(
            await realOob(),
            testCase.faction,
            testCase.mun,
            testCase.id,
        );
        const { formation, record, ordinal, lookups, report } = spawned;

        assert.strictEqual(report.formations_created, 1);
        assert.strictEqual(record.default_equipment_class, testCase.expected);
        assert.strictEqual(lookups.historicalOobIdLookup?.(testCase.faction, testCase.mun, ordinal), record.id);
        assert.strictEqual(lookups.historicalNameLookup?.(testCase.faction, testCase.mun, ordinal), record.name);
        assert.strictEqual(
            lookups.historicalCorpsLookup?.(testCase.faction, testCase.mun, ordinal),
            record.corps ?? null,
        );
        assert.strictEqual(
            lookups.historicalEquipmentClassLookup?.(testCase.faction, testCase.mun, ordinal),
            record.default_equipment_class,
        );

        assert.strictEqual(formation.name, record.name);
        assert.strictEqual(formation.corps_id, record.corps);
        assert.ok(formation.tags?.includes(`oob:${record.id}`));
        assert.deepStrictEqual(equipTags(formation), [`equip:${record.default_equipment_class}`]);
        assert.strictEqual(resolveEquipmentClass(formation), record.default_equipment_class);

        const evaluation = evaluateBrigade(formation, null);
        assert.strictEqual(evaluation.equipment_class, record.default_equipment_class);
        assert.strictEqual(
            evaluation.equipment_priority,
            getEquipmentOffensivePriority(record.default_equipment_class),
        );
    });
}

test('matched light infantry stays light infantry rather than inheriting motorized priority', async () => {
    const { formation } = spawnHistorical(
        await realOob(),
        'RS',
        'ilijas',
        'rs_ilijas_brigade',
    );
    assert.strictEqual(resolveEquipmentClass(formation), 'light_infantry');
    assert.notStrictEqual(resolveEquipmentClass(formation), 'motorized');
    assert.strictEqual(evaluateBrigade(formation, null).equipment_priority, 0);
});

test('every valid equipment class is carried by a bounded matched OOB record', () => {
    const classes = [
        'mechanized',
        'motorized',
        'mountain',
        'light_infantry',
        'garrison',
        'police',
        'special',
    ] as const;
    for (const equipmentClass of classes) {
        const oob = [{
            id: `bounded_${equipmentClass}`,
            faction: 'RBiH',
            name: `Bounded ${equipmentClass}`,
            home_mun: `bounded_${equipmentClass}`,
            corps: `corps_${equipmentClass}`,
            kind: 'brigade',
            manpower_cost: 1,
            capital_cost: 1,
            default_equipment_class: equipmentClass,
            priority: 0,
            mandatory: false,
            available_from: 0,
        }] as OobBrigade[];
        const { formation, record } = spawnHistorical(
            oob,
            'RBiH',
            `bounded_${equipmentClass}`,
            `bounded_${equipmentClass}`,
        );
        assert.strictEqual(formation.name, record.name);
        assert.strictEqual(formation.corps_id, record.corps);
        assert.strictEqual(resolveEquipmentClass(formation), equipmentClass);
        assert.deepStrictEqual(equipTags(formation), [`equip:${equipmentClass}`]);
    }
});

test('reordered OOB input keeps the same ordinal for id/name/corps/class without borrowing a neighbour', () => {
    const oob = [
        {
            id: 'alpha_light',
            faction: 'RBiH',
            name: 'Alpha Light',
            home_mun: 'order_mun',
            corps: 'corps_alpha',
            kind: 'brigade',
            manpower_cost: 1,
            capital_cost: 1,
            default_equipment_class: 'light_infantry',
            priority: 0,
            mandatory: false,
            available_from: 0,
        },
        {
            id: 'zulu_motorized',
            faction: 'RBiH',
            name: 'Zulu Motorized',
            home_mun: 'order_mun',
            corps: 'corps_zulu',
            kind: 'brigade',
            manpower_cost: 1,
            capital_cost: 1,
            default_equipment_class: 'motorized',
            priority: 0,
            mandatory: false,
            available_from: 0,
        },
    ] as OobBrigade[];
    const forward = buildHistoricalOobLookups(oob);
    const reversed = buildHistoricalOobLookups([...oob].reverse());

    for (let ordinal = 1; ordinal <= oob.length; ordinal += 1) {
        assert.strictEqual(
            forward.historicalOobIdLookup?.('RBiH', 'order_mun', ordinal),
            reversed.historicalOobIdLookup?.('RBiH', 'order_mun', ordinal),
        );
        assert.strictEqual(
            forward.historicalNameLookup?.('RBiH', 'order_mun', ordinal),
            reversed.historicalNameLookup?.('RBiH', 'order_mun', ordinal),
        );
        assert.strictEqual(
            forward.historicalCorpsLookup?.('RBiH', 'order_mun', ordinal),
            reversed.historicalCorpsLookup?.('RBiH', 'order_mun', ordinal),
        );
        assert.strictEqual(
            forward.historicalEquipmentClassLookup?.('RBiH', 'order_mun', ordinal),
            reversed.historicalEquipmentClassLookup?.('RBiH', 'order_mun', ordinal),
        );
    }
    assert.strictEqual(forward.historicalEquipmentClassLookup?.('RBiH', 'order_mun', 1), 'light_infantry');
    assert.strictEqual(forward.historicalEquipmentClassLookup?.('RBiH', 'order_mun', 2), 'motorized');
    assert.strictEqual(reversed.historicalEquipmentClassLookup?.('RBiH', 'order_mun', 1), 'light_infantry');
    assert.strictEqual(reversed.historicalEquipmentClassLookup?.('RBiH', 'order_mun', 2), 'motorized');
});

test('the matched class fallback requires a non-empty matched OOB identity as well as a class', async () => {
    const oob = await realOob();
    const classWithoutId = spawnHistorical(
        oob,
        'RS',
        'sokolac',
        'rs_2nd_romanija_brigade',
        { historicalOobIdLookup: () => null },
    );
    assert.deepStrictEqual(equipTags(classWithoutId.formation), []);
    assert.strictEqual(resolveEquipmentClass(classWithoutId.formation), undefined);
    assert.strictEqual(evaluateBrigade(classWithoutId.formation, null).equipment_priority, 0);

    const idWithoutClass = spawnHistorical(
        oob,
        'RS',
        'sokolac',
        'rs_2nd_romanija_brigade',
        { historicalEquipmentClassLookup: () => null },
    );
    assert.deepStrictEqual(equipTags(idWithoutClass.formation), []);
    assert.ok(idWithoutClass.formation.tags?.includes('oob:rs_2nd_romanija_brigade'));
});

test('an explicit custom equip tag wins over the matched class and is not duplicated', async () => {
    const { formation } = spawnHistorical(
        await realOob(),
        'RS',
        'sokolac',
        'rs_2nd_romanija_brigade',
        { customTags: ['equip:mountain'] },
    );
    assert.deepStrictEqual(equipTags(formation), ['equip:mountain']);
    assert.strictEqual(resolveEquipmentClass(formation), 'mountain');
    assert.strictEqual(evaluateBrigade(formation, null).equipment_priority, 1);
});

test('an unknown explicit equip tag is preserved as unknown and is not replaced by the matched class', async () => {
    const { formation } = spawnHistorical(
        await realOob(),
        'RS',
        'sokolac',
        'rs_2nd_romanija_brigade',
        { customTags: ['equip:unknown'] },
    );
    assert.deepStrictEqual(equipTags(formation), ['equip:unknown']);
    assert.strictEqual(resolveEquipmentClass(formation), 'unknown');
    assert.strictEqual(evaluateBrigade(formation, null).equipment_priority, 0);
});

test('an unmatched pool retains unknown class and priority 0', async () => {
    const lookups = buildHistoricalOobLookups(await realOob());
    const state = baseState();
    const mun = 'MUN_NOMATCH';
    state.military.militia_pools![militiaPoolKey(mun, 'RS')] = {
        mun_id: mun,
        faction: 'RS',
        available: 2500,
        committed: 0,
        exhausted: 0,
        updated_turn: 10,
    };
    state.political.municipalities![mun] = { control: 'consolidated' };
    state.political.political_controllers![`op:${mun}:hq`] = 'RS';

    const report = spawnFormationsFromPools(state, {
        ...placementOptions(mun, `op:${mun}:hq`),
        maxPerMun: 1,
        historicalNameLookup: lookups.historicalNameLookup,
        historicalCorpsLookup: lookups.historicalCorpsLookup,
        historicalOobIdLookup: lookups.historicalOobIdLookup,
        historicalEquipmentClassLookup: lookups.historicalEquipmentClassLookup,
    });
    const formation = Object.values(state.military.formations ?? {})[0];
    assert.strictEqual(report.formations_created, 1);
    assert.ok(formation);
    assert.deepStrictEqual(equipTags(formation), []);
    assert.strictEqual(resolveEquipmentClass(formation), undefined);
    assert.strictEqual(evaluateBrigade(formation, null).equipment_priority, 0);
    assert.ok(!formation.tags?.some((tag) => tag.startsWith('oob:')));
});

test('equipment metadata changes only the new class tag: personnel, cohesion, caps, composition and existing formations stay put', async () => {
    const oob = await realOob();
    const withClass = spawnHistorical(oob, 'RS', 'sokolac', 'rs_2nd_romanija_brigade');
    const withoutClass = spawnHistorical(
        oob,
        'RS',
        'sokolac',
        'rs_2nd_romanija_brigade',
        { historicalEquipmentClassLookup: null },
    );

    const stripTags = (formation: FormationState) => {
        const { tags: _tags, ...rest } = formation;
        return rest;
    };
    assert.deepStrictEqual(stripTags(withClass.formation), stripTags(withoutClass.formation));
    assert.strictEqual(withClass.formation.personnel, withoutClass.formation.personnel);
    assert.strictEqual(withClass.formation.cohesion, withoutClass.formation.cohesion);
    assert.strictEqual(withClass.formation.max_personnel, withoutClass.formation.max_personnel);
    assert.deepStrictEqual(withClass.formation.composition, withoutClass.formation.composition);
    assert.deepStrictEqual(equipTags(withClass.formation), ['equip:motorized']);
    assert.deepStrictEqual(equipTags(withoutClass.formation), []);

    // Spawn must not backfill an existing formation that already carries no class metadata.
    const state = baseState();
    state.military.formations!['EXISTING'] = {
        id: 'EXISTING',
        faction: 'RS',
        name: 'Existing',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 800,
        cohesion: 60,
        tags: ['mun:ilijas'],
    } as FormationState;
    state.military.militia_pools![militiaPoolKey('sokolac', 'RS')] = {
        mun_id: 'sokolac',
        faction: 'RS',
        available: 2500,
        committed: 0,
        exhausted: 0,
        updated_turn: 10,
    };
    state.political.municipalities!['sokolac'] = { control: 'consolidated' };
    state.political.political_controllers!['op:sokolac:hq'] = 'RS';
    const lookups = buildHistoricalOobLookups(oob);
    spawnFormationsFromPools(state, {
        ...placementOptions('sokolac', 'op:sokolac:hq'),
        maxPerMun: 1,
        historicalNameLookup: lookups.historicalNameLookup,
        historicalCorpsLookup: lookups.historicalCorpsLookup,
        historicalOobIdLookup: lookups.historicalOobIdLookup,
        historicalEquipmentClassLookup: lookups.historicalEquipmentClassLookup,
    });
    assert.deepStrictEqual(equipTags(state.military.formations!['EXISTING'] as FormationState), []);
    assert.ok(!(state.military.formations!['EXISTING'] as FormationState).tags?.includes('oob:rs_2nd_romanija_brigade'));
});

test('canonical roundtrip retains the propagated class and identity', async () => {
    const { state, formation, record } = spawnHistorical(
        await realOob(),
        'RS',
        'sokolac',
        'rs_2nd_romanija_brigade',
    );
    const hydrated = deserializeState(serializeState(state));
    const roundtripped = Object.values(hydrated.military.formations ?? {})[0];
    assert.ok(roundtripped);

    assert.strictEqual(roundtripped.id, formation.id);
    assert.strictEqual(roundtripped.name, record.name);
    assert.strictEqual(roundtripped.corps_id, record.corps);
    assert.strictEqual(resolveEquipmentClass(roundtripped), record.default_equipment_class);
    assert.deepStrictEqual(equipTags(roundtripped), [`equip:${record.default_equipment_class}`]);
    assert.strictEqual(roundtripped.personnel, formation.personnel);
    assert.strictEqual(roundtripped.cohesion, formation.cohesion);
    assert.strictEqual(roundtripped.max_personnel, formation.max_personnel);
    assert.deepStrictEqual(roundtripped.composition, formation.composition);
    assert.deepStrictEqual(
        roundtripped.tags?.filter((tag) => !tag.startsWith('equip:')),
        formation.tags?.filter((tag) => !tag.startsWith('equip:')),
    );
});
