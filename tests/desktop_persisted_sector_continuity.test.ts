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
import { serializeState } from '../src/state/serialize.js';

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

        const { state: loaded } = await loadStateFromPath(savePath);

        expect(serializeState(loaded)).toBe(canonical);
        expect(loaded.military.corps_front_sectors).toEqual(originalSectors);
        expect(persistedAssignments(loaded)).toEqual(originalAssignments);
        expect(queryCorpsSectors(loaded)).toEqual(originalCommandQuery);
        expect(projectPlayerVisibleStateJson(serializeState(loaded), 'RBiH')).toBe(originalVisibleState);
    }, 120_000);
});
