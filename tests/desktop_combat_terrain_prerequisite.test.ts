import {SimpleGeneralBot} from '../src/sim/bot/simple_general_bot.js';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import {
    getForestMult,
    getUrbanMult,
    setForestOsidSet,
    setUrbanOsidSet,
} from '../src/sim/combat/combat_math.js';

const terrainProbe = vi.hoisted(() => ({
    observations: [] as Array<{ stage: string; urban: number; forest: number }>,
    urbanOsid: 'fixture:urban',
    forestOsid: 'fixture:forest',
    read: () => ({ urban: 1, forest: 1 }),
    observe(stage: string): void {
        const { urban, forest } = this.read();
        this.observations.push({
            stage,
            urban,
            forest,
        });
    },
}));

vi.mock('../src/map/settlements.js', () => ({
    loadSettlementGraph: vi.fn(async () => ({ settlements: new Map(), edges: [] })),
}));

vi.mock('../src/data/operational_data.js', () => ({
    loadOperationalData: vi.fn(async () => ({
        canonicalToOperational: {},
        operationalToCanonical: null,
        edges: [],
    })),
    loadOperationalCentroids: vi.fn(async () => new Map()),
    loadOperationalEdges: vi.fn(async () => []),
}));

vi.mock('../src/scenario/turn_inputs.js', () => ({
    loadSharedTurnInputs: vi.fn(async () => ({
        municipalityPopulation1991: {},
        settlementPopulationBySid: {},
        settlementDataRaw: [],
        municipalityHqSettlement: {},
        historicalNameLookup: {},
        historicalCorpsLookup: {},
        historicalOobIdLookup: {},
    })),
}));

vi.mock('../src/sim/events/event_loader.js', () => ({
    loadEventDefinitionsFromDir: vi.fn(() => []),
}));

vi.mock('../src/map/front_edges.js', () => ({
    computeFrontEdges: vi.fn(() => []),
}));

vi.mock('../src/sim/bot/bot_manager.js', async importOriginal => {
    const {BotManager: Actual}=await importOriginal<typeof import('../src/sim/bot/bot_manager.js')>();
    return {BotManager: class extends Actual {
        constructor(...args: ConstructorParameters<typeof Actual>) {
            super(...args);
            terrainProbe.observe('BotManager.constructor');
        }

        runBots(...args: Parameters<InstanceType<typeof Actual>['runBots']>) {
            terrainProbe.observe('BotManager.runBots');
            return super.runBots(...args);
        }
    }};
});

vi.mock('../src/sim/turn_pipeline.js', () => ({
    assertTurnSuccess: vi.fn(),
    runTurn: vi.fn(async (state: GameState, input: {dataBaseDir?:string}) => {
        expect(input.dataBaseDir).toBeDefined();
        terrainProbe.observe('runTurn');
        const nextState = structuredClone(state);
        nextState.meta.turn += 1;
        return { nextState, report: {} };
    }),
}));

import { advanceTurn } from '../src/desktop/desktop_sim.js';
import {runTurn} from '../src/sim/turn_pipeline.js';
import { loadForestOsidSet, loadUrbanOsidSet } from '../src/sim/combat/combat_terrain_sets_node.js';

terrainProbe.read = () => ({
    urban: getUrbanMult(terrainProbe.urbanOsid),
    forest: getForestMult(terrainProbe.forestOsid),
});

beforeEach(()=>{vi.spyOn(SimpleGeneralBot.prototype,'makeDecisions').mockReturnValue({});});

const tempRoots: string[] = [];

function makeTempRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'awwv-terrain-prerequisite-'));
    tempRoots.push(root);
    return root;
}

function writeTerrainRoot(root: string, urban: unknown, forest: unknown): void {
    const operationalDir = join(root, 'data', 'derived', 'operational');
    mkdirSync(operationalDir, { recursive: true });
    writeFileSync(join(operationalDir, 'urban_osids.json'), JSON.stringify(urban));
    writeFileSync(join(operationalDir, 'forest_osids.json'), JSON.stringify(forest));
}

function makeDesktopState(playerFaction: 'RBiH' | 'RS' | 'HRHB'): GameState {
    return {
        schema_version: 1,
        meta: {
            turn: 16,
            seed: 'desktop-terrain-prerequisite',
            phase: 'war',
            player_faction: playerFaction,
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

function observedAtEveryConsumer(urban: number, forest: number): void {
    expect(terrainProbe.observations).toEqual([
        { stage: 'BotManager.constructor', urban, forest },
        { stage: 'BotManager.runBots', urban, forest },
        { stage: 'runTurn', urban, forest },
    ]);
}

afterEach(() => {
    vi.restoreAllMocks();
    setUrbanOsidSet(new Set());
    setForestOsidSet(new Set());
    terrainProbe.observations = [];
    for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('combat terrain set loaders', () => {
    it('uses an explicit base directory and retains process.cwd() as the default', () => {
        const explicitRoot = makeTempRoot();
        const cwdRoot = makeTempRoot();
        writeTerrainRoot(explicitRoot, ['explicit:urban'], ['explicit:forest']);
        writeTerrainRoot(cwdRoot, ['cwd:urban'], ['cwd:forest']);
        const originalCwd = process.cwd();

        try {
            process.chdir(cwdRoot);
            expect([...loadUrbanOsidSet(explicitRoot)]).toEqual(['explicit:urban']);
            expect([...loadForestOsidSet(explicitRoot)]).toEqual(['explicit:forest']);
            expect([...loadUrbanOsidSet()]).toEqual(['cwd:urban']);
            expect([...loadForestOsidSet()]).toEqual(['cwd:forest']);
        } finally {
            process.chdir(originalCwd);
        }
    });

    it('preserves empty-set compatibility for missing and malformed files', () => {
        const missingRoot = makeTempRoot();
        const malformedRoot = makeTempRoot();
        const operationalDir = join(malformedRoot, 'data', 'derived', 'operational');
        mkdirSync(operationalDir, { recursive: true });
        writeFileSync(join(operationalDir, 'urban_osids.json'), '{');
        writeFileSync(join(operationalDir, 'forest_osids.json'), 'not-json');

        expect(loadUrbanOsidSet(missingRoot).size).toBe(0);
        expect(loadForestOsidSet(missingRoot).size).toBe(0);
        expect(loadUrbanOsidSet(malformedRoot).size).toBe(0);
        expect(loadForestOsidSet(malformedRoot).size).toBe(0);
    });
});

describe('desktop combat terrain prerequisite', () => {
    it.each(['RBiH', 'RS', 'HRHB'] as const)(
        'primes both actual terrain lookups before bot and turn consumers for %s player metadata',
        async (playerFaction) => {
            const selectedRoot = makeTempRoot();
            const conflictingCwdRoot = makeTempRoot();
            writeTerrainRoot(selectedRoot, ['selected:urban'], ['selected:forest']);
            writeTerrainRoot(conflictingCwdRoot, ['cwd:urban'], ['cwd:forest']);
            terrainProbe.urbanOsid = 'selected:urban';
            terrainProbe.forestOsid = 'selected:forest';
            const state = makeDesktopState(playerFaction);
            const inputBytes = JSON.stringify(state);
            const originalCwd = process.cwd();

            try {
                process.chdir(conflictingCwdRoot);
                const result = await advanceTurn(state, selectedRoot);

                expect(result.error).toBeUndefined();
                observedAtEveryConsumer(2, 1.15);
                expect(JSON.stringify(state)).toBe(inputBytes);
                expect(result.state).toEqual({ ...state, meta: { ...state.meta, turn: 17 } });
                expect(JSON.stringify(result.state)).not.toContain('terrain_osid');
            } finally {
                process.chdir(originalCwd);
            }
        },
    );

    it('replaces stale sets across complete, alternate, missing, and malformed roots', async () => {
        const firstRoot = makeTempRoot();
        const secondRoot = makeTempRoot();
        const missingRoot = makeTempRoot();
        const malformedRoot = makeTempRoot();
        writeTerrainRoot(firstRoot, ['first:urban'], ['first:forest']);
        writeTerrainRoot(secondRoot, ['second:urban'], ['second:forest']);
        writeTerrainRoot(malformedRoot, { osids: ['ignored:urban'] }, { osids: ['ignored:forest'] });
        const state = makeDesktopState('RBiH');

        terrainProbe.urbanOsid = 'first:urban';
        terrainProbe.forestOsid = 'first:forest';
        await advanceTurn(state, firstRoot);
        observedAtEveryConsumer(2, 1.15);

        terrainProbe.observations = [];
        terrainProbe.urbanOsid = 'second:urban';
        terrainProbe.forestOsid = 'second:forest';
        await advanceTurn(state, secondRoot);
        observedAtEveryConsumer(2, 1.15);
        expect(getUrbanMult('first:urban')).toBe(1);
        expect(getForestMult('first:forest')).toBe(1);

        for (const emptyRoot of [missingRoot, malformedRoot]) {
            terrainProbe.observations = [];
            await advanceTurn(state, emptyRoot);
            observedAtEveryConsumer(1, 1);
            expect(getUrbanMult('second:urban')).toBe(1);
            expect(getForestMult('second:forest')).toBe(1);
        }
    });
});

describe('actual desktop smart-bot prepass authority',()=>{
 it.each([0,1,2,3] as const)('respects player autonomy %s before the shared turn',async level=>{
  const root=makeTempRoot();writeTerrainRoot(root,[],[]);
  const state=makeDesktopState('RS');state.meta.autonomy_level=level;
  state.military.formations={manual:{id:'manual',faction:'RS',status:'active',assignment:{kind:'sector',sector_id:'manual-sector'}},npc:{id:'npc',faction:'RBiH',status:'active',assignment:null}} as any;
  state.military.front_posture={RS:{assignments:{edge:{edge_id:'edge',posture:'hold',weight:1}}}} as any;
  vi.spyOn(SimpleGeneralBot.prototype,'makeDecisions').mockImplementation(function(this: SimpleGeneralBot){const assignments:Record<string,string>={};if(this.factionId==='RS')assignments.manual='edge';if(this.factionId==='RBiH')assignments.npc='edge';return {posture_assignments:{edge:'push'},formation_assignments:assignments};});
  const original=JSON.stringify(state);const result=await advanceTurn(state,root);
  expect(result.error).toBeUndefined();expect(JSON.stringify(state)).toBe(original);
  expect(vi.mocked(runTurn).mock.lastCall?.[1]).toMatchObject({dataBaseDir:root});
  expect(result.state.military.formations.manual.assignment).toEqual(level===0?{kind:'sector',sector_id:'manual-sector'}:{kind:'edge',edge_id:'edge'});
  expect(result.state.military.front_posture?.RS?.assignments.edge.posture).toBe(level===0?'hold':'push');
  expect(result.state.military.formations.npc.assignment).toEqual({kind:'edge',edge_id:'edge'});
 });
});
