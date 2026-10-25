import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

import { loadStateFromPath, primeCombatTerrain } from '../src/desktop/desktop_sim.js';
import { computeSectorCombatRatings } from '../src/sim/combat/sector_combat_rating.js';
import {
    getForestMult,
    getUrbanMult,
    setForestOsidSet,
    setUrbanOsidSet,
} from '../src/sim/combat/combat_math.js';
import { deserializeState, serializeRuntimeState, serializeState } from '../src/state/serialize.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleStateJson } = require('../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleStateJson: (stateJson: string, fallbackFaction?: string) => string;
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
    setUrbanOsidSet(new Set());
    setForestOsidSet(new Set());
    await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function makeTerrainRoot(urban: unknown, forest: unknown): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'awwv-load-terrain-'));
    temporaryDirectories.push(root);
    const dataDir = join(root, 'data', 'derived', 'operational');
    await mkdir(dataDir, { recursive: true });
    await writeFile(join(dataDir, 'urban_osids.json'), JSON.stringify(urban));
    await writeFile(join(dataDir, 'forest_osids.json'), JSON.stringify(forest));
    return root;
}

describe('desktop loaded-save sector ratings', () => {
    it('rehydrates authoritative ratings for the player-visible adapter without changing canonical state', async () => {
        const savePath = resolve(process.cwd(), 'data/derived/startup/apr_1992_initial_save.json');
        const source = await readFile(savePath, 'utf8');
        const canonicalState = deserializeState(source);
        const canonicalBefore = serializeState(canonicalState);
        expect(canonicalState.military.sector_combat_ratings).toBeUndefined();

        const expectedState = structuredClone(canonicalState);
        primeCombatTerrain(process.cwd());
        computeSectorCombatRatings(expectedState, null);

        const { state: loaded } = await loadStateFromPath(savePath, process.cwd());
        const ratings = loaded.military.sector_combat_ratings;
        expect(ratings).toEqual(expectedState.military.sector_combat_ratings);
        expect(Object.keys(ratings ?? {}).sort()).toEqual(
            Object.keys(loaded.military.corps_front_sectors).sort(),
        );

        expect(serializeState(loaded)).toBe(canonicalBefore);
        const loadedWithoutRatings = structuredClone(loaded);
        delete loadedWithoutRatings.military.sector_combat_ratings;
        expect(loadedWithoutRatings).toEqual(canonicalState);

        const visibleState = JSON.parse(
            projectPlayerVisibleStateJson(serializeRuntimeState(loaded), 'RBiH'),
        );
        const visibleRatings = visibleState.military.sector_combat_ratings as Record<string, unknown>;
        const ownSectorIds = Object.values(loaded.military.corps_front_sectors)
            .filter((sector) => sector.faction === 'RBiH')
            .map((sector) => sector.sector_id)
            .sort();
        expect(Object.keys(visibleRatings).sort()).toEqual(ownSectorIds);

        const adapted = parseGameState(visibleState);
        const sector = adapted.corpsFrontSectors?.find((candidate) => candidate.faction === 'RBiH');
        expect(sector).toBeDefined();
        const rating = ratings?.[sector!.sector_id];
        expect(rating).toBeDefined();
        expect(sector).toMatchObject({
            combat_offensive_power: rating!.offensive_power,
            combat_defensive_power: rating!.defensive_power,
            combat_defense_per_edge: rating!.defense_per_edge,
            combat_strength_class: rating!.strength_class,
            combat_personnel: rating!.personnel,
        });
    });

    it('reconstructs terrain-aware ratings from the explicit root without inheriting ambient sets', async () => {
        const savePath = resolve(process.cwd(), 'data/derived/startup/apr_1992_initial_save.json');
        const source = await readFile(savePath, 'utf8');
        const canonical = serializeState(deserializeState(source));
        const state = deserializeState(source);
        const sector = Object.values(state.military.corps_front_sectors ?? {}).find((candidate) =>
            candidate.assigned_brigade_ids.some((id) => state.military.formations[id]?.status === 'active')
            && (candidate.sub_segments?.[0]?.friendly_osids?.[0] || candidate.territory_osids?.[0]));
        expect(sector).toBeDefined();
        const representativeOsid = sector!.sub_segments?.[0]?.friendly_osids?.[0]
            ?? sector!.territory_osids?.[0]
            ?? '';
        const rootA = await makeTerrainRoot(['fixture:other-urban'], ['fixture:other-forest']);
        const rootB = await makeTerrainRoot([representativeOsid], []);
        const missingRoot = await mkdtemp(join(tmpdir(), 'awwv-load-terrain-missing-'));
        temporaryDirectories.push(missingRoot);
        const malformedRoot = await makeTerrainRoot({ osids: [representativeOsid] }, { osids: [representativeOsid] });

        setUrbanOsidSet(new Set());
        setForestOsidSet(new Set());
        const freshB = (await loadStateFromPath(savePath, rootB)).state;
        expect(getUrbanMult(representativeOsid)).toBe(2);
        expect(getForestMult(representativeOsid)).toBe(1);

        await loadStateFromPath(savePath, rootA);
        const staleThenB = (await loadStateFromPath(savePath, rootB)).state;
        const warmB = (await loadStateFromPath(savePath, rootB)).state;
        expect(staleThenB.military.sector_combat_ratings).toEqual(freshB.military.sector_combat_ratings);
        expect(warmB.military.sector_combat_ratings).toEqual(freshB.military.sector_combat_ratings);
        expect(serializeRuntimeState(staleThenB)).toBe(serializeRuntimeState(freshB));

        for (const emptyRoot of [missingRoot, malformedRoot]) {
            const loaded = (await loadStateFromPath(savePath, emptyRoot)).state;
            expect(getUrbanMult(representativeOsid)).toBe(1);
            expect(getForestMult(representativeOsid)).toBe(1);
            expect(serializeState(loaded)).toBe(canonical);
        }
        for (const loaded of [freshB, staleThenB, warmB]) expect(serializeState(loaded)).toBe(canonical);
    });
});
