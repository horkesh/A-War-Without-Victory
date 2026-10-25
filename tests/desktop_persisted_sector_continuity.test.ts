import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

import {
    advanceTurn,
    loadStateFromPath,
    queryCorpsSectors,
    startNewCampaign,
} from '../src/desktop/desktop_sim.js';
import type { GameState } from '../src/state/game_state.js';
import { serializeRuntimeState, serializeState } from '../src/state/serialize.js';
import { setForestOsidSet, setUrbanOsidSet } from '../src/sim/combat/combat_math.js';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleStateJson } = require('../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleStateJson: (stateJson: string, fallbackFaction?: string) => string;
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function persistedAssignments(state: GameState): unknown {
    return Object.fromEntries(Object.entries(state.military.formations).map(([id, formation]) => [id, {
        assignment: formation.assignment,
        assigned_sub_segment_id: formation.assigned_sub_segment_id,
    }]));
}

describe('desktop persisted sector continuity', () => {
    it('loads the exact standing OG, assignments, command query, and player-visible projection without mutation', async () => {
        const baseDir = process.cwd();
        const started = await startNewCampaign(baseDir, 'RBiH');
        const advanced = await advanceTurn(started.state, baseDir);
        expect(advanced.error).toBeUndefined();

        const canonical = serializeState(advanced.state);
        const originalSectors = structuredClone(advanced.state.military.corps_front_sectors);
        const originalAssignments = persistedAssignments(advanced.state);
        const originalCommandQuery = queryCorpsSectors(advanced.state);
        const originalVisibleState = projectPlayerVisibleStateJson(canonical, 'RBiH');

        const tempDirectory = await mkdtemp(join(tmpdir(), 'awwv-sector-continuity-'));
        temporaryDirectories.push(tempDirectory);
        const savePath = join(tempDirectory, 'save.json');
        await writeFile(savePath, canonical, 'utf8');

        const { state: warmLoaded } = await loadStateFromPath(savePath, baseDir);
        setUrbanOsidSet(new Set());
        setForestOsidSet(new Set());
        const { state: loaded } = await loadStateFromPath(savePath, baseDir);

        expect(serializeState(loaded)).toBe(canonical);
        expect(loaded.military.corps_front_sectors).toEqual(originalSectors);
        expect(persistedAssignments(loaded)).toEqual(originalAssignments);
        expect(queryCorpsSectors(loaded)).toEqual(originalCommandQuery);
        expect(projectPlayerVisibleStateJson(serializeState(loaded), 'RBiH')).toBe(originalVisibleState);

        expect(serializeRuntimeState(loaded)).toBe(serializeRuntimeState(warmLoaded));
        const warmNext = await advanceTurn(warmLoaded, baseDir);
        setUrbanOsidSet(new Set(['stale:urban']));
        setForestOsidSet(new Set(['stale:forest']));
        const coldNext = await advanceTurn(loaded, baseDir);
        expect(coldNext.error).toBeUndefined();
        expect(warmNext.error).toBeUndefined();
        expect(serializeState(coldNext.state)).toBe(serializeState(warmNext.state));
        expect(coldNext.report).toEqual(warmNext.report);
    }, 120_000);
});
