import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
    DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
    EXPLICIT_MINIMAL_FIXTURE_TURN_INPUT_REQUIREMENTS,
    loadSharedTurnInputs,
    prepareSharedTurnInputs,
} from '../src/scenario/turn_inputs.js';
import { buildScenarioStartupState } from '../src/scenario/scenario_runner.js';
import { loadScenario } from '../src/scenario/scenario_loader.js';

const created: string[] = [];

async function writeJson(baseDir: string, relativePath: string, value: unknown): Promise<void> {
    await writeFile(join(baseDir, relativePath), JSON.stringify(value), 'utf8');
}

async function seedValidInputs(population?: unknown): Promise<string> {
    const baseDir = await mkdtemp(join(tmpdir(), 'awwv-shared-turn-inputs-'));
    created.push(baseDir);
    await Promise.all([
        mkdir(join(baseDir, 'data', 'derived'), { recursive: true }),
        mkdir(join(baseDir, 'data', 'source'), { recursive: true }),
    ]);
    await Promise.all([
        writeJson(baseDir, 'data/derived/municipality_population_1991.json', population ?? {
            by_mun1990_id: {
                'mun-z': { total: 900, breakdown: { bosniak: 100, serb: 700, croat: 50, other: 50 } },
                'mun-a': { total: 600, breakdown: { bosniak: 400, serb: 100, croat: 50, other: 50 } },
            },
        }),
        writeJson(baseDir, 'data/derived/census_rolled_up_wgs84.json', {
            by_sid: { sid_z: { p: [90] }, sid_a: { p: [60] } },
        }),
        writeJson(baseDir, 'data/derived/settlement_ethnicity_data.json', {
            by_settlement_id: {
                sid_z: { composition: { bosniak: 10, croat: 5, serb: 80, other: 5 } },
                sid_a: { composition: { bosniak: 70, croat: 10, serb: 10, other: 10 } },
            },
        }),
        writeJson(baseDir, 'data/source/municipalities_1990_registry_110.json', {
            rows: [{ mun1990_id: 'mun-a' }, { mun1990_id: 'mun-z' }],
        }),
        writeJson(baseDir, 'data/source/oob_brigades.json', {
            brigades: [
                { id: 'late-name', faction: 'RBiH', name: 'Zulu Brigade', home_mun: 'mun-a' },
                { id: 'early-name', faction: 'RBiH', name: 'Alpha Brigade', home_mun: 'mun-a', corps: 'corps-a' },
            ],
        }),
        writeJson(baseDir, 'data/derived/municipality_hq_settlement.json', {
            by_mun1990_id: { 'mun-a': 'sid_a', 'mun-z': 'sid_z' },
        }),
    ]);
    return baseDir;
}

async function seedBuilderFixture(populationScheme: 'numeric' | 'direct'): Promise<string> {
    const baseDir = await mkdtemp(join(tmpdir(), 'awwv-shared-turn-builder-'));
    created.push(baseDir);
    const relativePaths = [
        'data/source/settlements_initial_master.json',
        'data/derived/settlement_edges.json',
        'data/derived/municipality_population_1991.json',
        'data/derived/census_rolled_up_wgs84.json',
        'data/derived/settlement_ethnicity_data.json',
        'data/source/oob_brigades.json',
        'data/source/municipalities_1990_registry_110.json',
        'data/derived/municipality_hq_settlement.json',
    ];
    for (const relativePath of relativePaths) {
        await mkdir(join(baseDir, relativePath, '..'), { recursive: true });
        await copyFile(join(process.cwd(), relativePath), join(baseDir, relativePath));
    }
    if (populationScheme === 'direct') {
        await writeJson(baseDir, 'data/derived/municipality_population_1991.json', {
            by_mun1990_id: {
                banovici: { total: 26590, breakdown: { bosniak: 19162, serb: 4514, croat: 550, other: 2364 } },
            },
        });
    }
    return baseDir;
}

afterEach(async () => {
    await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('shared validated turn input contract', () => {
    it('matches the original direct-key transformations and stable historical ordering', async () => {
        const baseDir = await seedValidInputs();
        const sids = ['sid_z', 'sid_a'];
        const before = [...sids];

        const inputs = await prepareSharedTurnInputs({
            baseDir,
            sids,
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        });

        expect(inputs.municipalityPopulation1991).toEqual({
            'mun-z': { total: 900, bosniak: 100, serb: 700, croat: 50, other: 50 },
            'mun-a': { total: 600, bosniak: 400, serb: 100, croat: 50, other: 50 },
        });
        expect(inputs.settlementPopulationBySid).toEqual({ sid_z: 90, sid_a: 60 });
        expect(inputs.settlementDataRaw).toEqual([
            { sid: 'sid_a', ethnicity: { composition: { bosniak: 70, croat: 10, serb: 10, other: 10 } }, population: 60 },
            { sid: 'sid_z', ethnicity: { composition: { bosniak: 10, croat: 5, serb: 80, other: 5 } }, population: 90 },
        ]);
        expect(inputs.historicalNameLookup?.('RBiH', 'mun-a', 1)).toBe('Alpha Brigade');
        expect(inputs.historicalCorpsLookup?.('RBiH', 'mun-a', 1)).toBe('corps-a');
        expect(inputs.historicalOobIdLookup?.('RBiH', 'mun-a', 2)).toBe('late-name');
        expect(sids).toEqual(before);
    });

    it('preserves the numeric municipality census-key scheme', async () => {
        const baseDir = await seedValidInputs({
            by_municipality_id: {
                '001': { mun1990_id: 'mun-a', total: 600, breakdown: { bosniak: 400, serb: 100, croat: 50, other: 50 } },
            },
        });
        const inputs = await prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        });
        expect(inputs.municipalityPopulation1991).toEqual({
            'mun-a': { total: 600, bosniak: 400, serb: 100, croat: 50, other: 50 },
        });
    });

    it('does not mutate already-loaded scenario OOB and HQ objects', async () => {
        const baseDir = await seedValidInputs();
        const full = await prepareSharedTurnInputs({ baseDir, sids: ['sid_a'], requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS });
        const hq = full.municipalityHqSettlement!;
        const oob = [
            { id: 'id', faction: 'RBiH', name: 'Name', home_mun: 'mun-a', kind: 'brigade', manpower_cost: 1, capital_cost: 1, default_equipment_class: 'light_infantry', priority: 1, mandatory: false, available_from: 0 },
        ] as const;
        const before = structuredClone(oob);
        const inputs = await prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
            oobBrigades: oob,
            municipalityHqSettlement: hq,
        });
        expect(oob).toEqual(before);
        expect(inputs.municipalityHqSettlement).toBe(hq);
    });

    it('supports explicitly declared minimal-fixture omissions', async () => {
        const baseDir = await mkdtemp(join(tmpdir(), 'awwv-shared-turn-inputs-empty-'));
        created.push(baseDir);
        const inputs = await prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: EXPLICIT_MINIMAL_FIXTURE_TURN_INPUT_REQUIREMENTS,
        });
        expect(Object.values(inputs).every((value) => value === undefined)).toBe(true);
    });

    it.each([
        'data/derived/municipality_population_1991.json',
        'data/derived/census_rolled_up_wgs84.json',
        'data/derived/settlement_ethnicity_data.json',
        'data/source/oob_brigades.json',
        'data/derived/municipality_hq_settlement.json',
        'data/source/municipalities_1990_registry_110.json',
    ])('attributes missing required data to its source file: %s', async (relativePath) => {
        const baseDir = await seedValidInputs();
        await rm(join(baseDir, relativePath));
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).rejects.toThrow(relativePath.split('/').at(-1));
    });

    it.each([
        'data/derived/municipality_population_1991.json',
        'data/derived/census_rolled_up_wgs84.json',
        'data/derived/settlement_ethnicity_data.json',
        'data/source/oob_brigades.json',
        'data/derived/municipality_hq_settlement.json',
    ])('rejects structurally invalid required data: %s', async (relativePath) => {
        const baseDir = await seedValidInputs();
        await writeJson(baseDir, relativePath, []);
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).rejects.toThrow(relativePath.split('/').at(-1));
    });

    it.each([
        ['malformed', '{'],
        ['structurally invalid', '[]'],
    ])('attributes %s registry failures to the registry file', async (_label, contents) => {
        const baseDir = await seedValidInputs();
        const relativePath = 'data/source/municipalities_1990_registry_110.json';
        await writeFile(join(baseDir, relativePath), contents, 'utf8');
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).rejects.toThrow('municipalities_1990_registry_110.json');
    });

    it.each([
        ['numeric municipality', 'data/derived/municipality_population_1991.json', { by_municipality_id: { good: { mun1990_id: 'mun-a', total: 1 }, bad: { total: 2 } } }],
        ['settlement census', 'data/derived/census_rolled_up_wgs84.json', { by_sid: { sid_a: { p: [1] }, sid_bad: { p: ['bad'] } } }],
        ['settlement ethnicity', 'data/derived/settlement_ethnicity_data.json', { by_settlement_id: { sid_a: { composition: { bosniak: 1, croat: 0, serb: 0, other: 0 } }, sid_bad: { composition: [] } } }],
        ['settlement ethnicity missing composition', 'data/derived/settlement_ethnicity_data.json', { by_settlement_id: { sid_a: { composition: { bosniak: 1, croat: 0, serb: 0, other: 0 } }, sid_bad: {} } }],
        ['historical OOB', 'data/source/oob_brigades.json', { brigades: [{ id: 'good', faction: 'RBiH', name: 'Good', home_mun: 'mun-a' }, { id: 'bad', faction: 'RBiH', home_mun: 'mun-a' }] }],
        ['municipality HQ', 'data/derived/municipality_hq_settlement.json', { by_mun1990_id: { 'mun-a': 'sid_a', 'mun-z': 4 } }],
        ['municipality registry', 'data/source/municipalities_1990_registry_110.json', { rows: [{ mun1990_id: 'mun-a' }, { name: 'bad' }] }],
    ])('rejects a mixed valid/invalid %s row set', async (_label, relativePath, value) => {
        const baseDir = await seedValidInputs();
        await writeJson(baseDir, relativePath, value);
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).rejects.toThrow(relativePath.split('/').at(-1));
    });

    it('does not reuse valid ethnicity rows after the source file becomes invalid', async () => {
        const baseDir = await seedValidInputs();
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).resolves.toMatchObject({ settlementDataRaw: expect.any(Array) });

        const relativePath = 'data/derived/settlement_ethnicity_data.json';
        await writeJson(baseDir, relativePath, {
            by_settlement_id: {
                sid_a: { composition: { bosniak: 1, croat: 0, serb: 0, other: 0 } },
                sid_bad: { composition: [] },
            },
        });
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).rejects.toThrow('settlement_ethnicity_data.json');
    });

    it('accepts corrected ethnicity rows after an invalid read', async () => {
        const baseDir = await seedValidInputs();
        const relativePath = 'data/derived/settlement_ethnicity_data.json';
        await writeJson(baseDir, relativePath, { by_settlement_id: { sid_bad: { composition: [] } } });
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).rejects.toThrow('settlement_ethnicity_data.json');

        await writeJson(baseDir, relativePath, {
            by_settlement_id: { sid_a: { composition: { bosniak: 1, croat: 0, serb: 0, other: 0 } } },
        });
        await expect(prepareSharedTurnInputs({
            baseDir,
            sids: ['sid_a'],
            requirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS,
        })).resolves.toMatchObject({
            settlementDataRaw: [{ sid: 'sid_a', ethnicity: { composition: { bosniak: 1, croat: 0, serb: 0, other: 0 } }, population: 60 }],
        });
    });

    it.each(['numeric', 'direct'] as const)(
        'actual scenario builder and desktop loader prepare identical %s-key inputs',
        async (populationScheme) => {
            const baseDir = await seedBuilderFixture(populationScheme);
            const scenario = await loadScenario(join(process.cwd(), 'data/scenarios/noop_4w.json'));
            const startup = await buildScenarioStartupState(
                scenario,
                baseDir,
                'shared-input-parity',
                { sharedTurnInputRequirements: DESKTOP_PRODUCTION_TURN_INPUT_REQUIREMENTS },
            );
            const desktop = await loadSharedTurnInputs(baseDir, startup.graph.settlements.keys());

            expect(startup.municipalityPopulation1991).toEqual(desktop.municipalityPopulation1991);
            expect(startup.settlementPopulationBySid).toEqual(desktop.settlementPopulationBySid);
            expect(startup.settlementDataRaw).toEqual(desktop.settlementDataRaw);
            expect(startup.municipalityHqSettlement).toEqual(desktop.municipalityHqSettlement);
            const firstOob = JSON.parse(await (await import('node:fs/promises')).readFile(join(baseDir, 'data/source/oob_brigades.json'), 'utf8'))[0] as { faction: string; home_mun: string };
            expect(startup.historicalNameLookup?.(firstOob.faction, firstOob.home_mun, 1)).toBe(
                desktop.historicalNameLookup?.(firstOob.faction, firstOob.home_mun, 1),
            );
            expect(startup.historicalCorpsLookup?.(firstOob.faction, firstOob.home_mun, 1)).toBe(
                desktop.historicalCorpsLookup?.(firstOob.faction, firstOob.home_mun, 1),
            );
            expect(startup.historicalOobIdLookup?.(firstOob.faction, firstOob.home_mun, 1)).toBe(
                desktop.historicalOobIdLookup?.(firstOob.faction, firstOob.home_mun, 1),
            );
        },
        30_000,
    );

    it('actual scenario builder accepts explicitly selected minimal shared-input omissions', async () => {
        const baseDir = await seedBuilderFixture('numeric');
        await Promise.all([
            rm(join(baseDir, 'data/derived/municipality_population_1991.json')),
            rm(join(baseDir, 'data/derived/census_rolled_up_wgs84.json')),
            rm(join(baseDir, 'data/derived/settlement_ethnicity_data.json')),
            rm(join(baseDir, 'data/source/oob_brigades.json')),
            rm(join(baseDir, 'data/source/municipalities_1990_registry_110.json')),
            rm(join(baseDir, 'data/derived/municipality_hq_settlement.json')),
        ]);
        const scenario = await loadScenario(join(process.cwd(), 'data/scenarios/noop_4w.json'));
        const startup = await buildScenarioStartupState(
            scenario,
            baseDir,
            'explicit-minimal-fixture',
            { sharedTurnInputRequirements: EXPLICIT_MINIMAL_FIXTURE_TURN_INPUT_REQUIREMENTS },
        );
        expect(startup.municipalityPopulation1991).toBeUndefined();
        expect(startup.settlementPopulationBySid).toBeUndefined();
        expect(startup.settlementDataRaw).toBeUndefined();
        expect(startup.historicalNameLookup).toBeUndefined();
        expect(startup.historicalCorpsLookup).toBeUndefined();
        expect(startup.historicalOobIdLookup).toBeUndefined();
        expect(startup.municipalityHqSettlement).toEqual({});
    });
});
