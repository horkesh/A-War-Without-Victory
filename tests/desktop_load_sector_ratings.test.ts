import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { loadStateFromPath } from '../src/desktop/desktop_sim.js';
import { computeSectorCombatRatings } from '../src/sim/combat/sector_combat_rating.js';
import { deserializeState, serializeRuntimeState, serializeState } from '../src/state/serialize.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleStateJson } = require('../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleStateJson: (stateJson: string, fallbackFaction?: string) => string;
};

describe('desktop loaded-save sector ratings', () => {
    it('rehydrates authoritative ratings for the player-visible adapter without changing canonical state', async () => {
        const savePath = resolve(process.cwd(), 'data/derived/startup/apr_1992_initial_save.json');
        const source = await readFile(savePath, 'utf8');
        const canonicalState = deserializeState(source);
        const canonicalBefore = serializeState(canonicalState);
        expect(canonicalState.military.sector_combat_ratings).toBeUndefined();

        const expectedState = structuredClone(canonicalState);
        computeSectorCombatRatings(expectedState, null);

        const { state: loaded } = await loadStateFromPath(savePath);
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
});
