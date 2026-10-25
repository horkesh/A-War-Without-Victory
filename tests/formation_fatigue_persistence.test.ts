import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { advanceTurn, loadStateFromPath, startNewCampaign } from '../src/desktop/desktop_sim.js';
import { applyFatigueRecovery } from '../src/state/formation_fatigue.js';
import type { FactionId, GameState } from '../src/state/game_state.js';
import { deserializeState, serializeRuntimeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

const ALL_FACTIONS: readonly FactionId[] = ['RBiH', 'RS', 'HRHB'];
const FRACTIONAL_FATIGUE: Readonly<Record<FactionId, number>> = {
    RBiH: 0.5,
    RS: 2.5,
    HRHB: 10.5,
};

let canonicalBase: GameState;
const temporaryDirectories: string[] = [];

beforeAll(async () => {
    const started = await startNewCampaign(process.cwd(), 'RBiH');
    canonicalBase = deserializeState(serializeState(started.state));
});

afterAll(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function cloneBase(): GameState {
    return structuredClone(canonicalBase);
}

function representativeFormationIds(state: GameState): Record<FactionId, string> {
    return Object.fromEntries(ALL_FACTIONS.map((faction) => {
        const id = Object.keys(state.military.formations)
            .sort()
            .find((formationId) => state.military.formations[formationId]?.faction === faction);
        if (!id) throw new Error(`Missing ${faction} formation in complete campaign fixture`);
        return [faction, id];
    })) as Record<FactionId, string>;
}

function setRepresentativeFatigue(state: GameState): Record<FactionId, string> {
    const ids = representativeFormationIds(state);
    for (const faction of ALL_FACTIONS) {
        state.military.formations[ids[faction]]!.ops = {
            fatigue: FRACTIONAL_FATIGUE[faction],
            last_supplied_turn: null,
        };
    }
    return ids;
}

function expectRepresentativeFatigue(
    state: GameState,
    ids: Record<FactionId, string>,
): void {
    for (const faction of ALL_FACTIONS) {
        expect(state.military.formations[ids[faction]]?.ops?.fatigue).toBe(FRACTIONAL_FATIGUE[faction]);
    }
}

describe('fractional formation fatigue persistence', () => {
    it('preserves all three factions exactly through canonical and runtime round trips', () => {
        expect.assertions(9);
        const state = cloneBase();
        const ids = setRepresentativeFatigue(state);

        const canonical = deserializeState(serializeState(state));
        const runtime = deserializeState(serializeRuntimeState(state));

        expectRepresentativeFatigue(canonical, ids);
        expectRepresentativeFatigue(runtime, ids);
        for (const faction of ALL_FACTIONS) {
            expect(runtime.military.formations[ids[faction]]?.faction).toBe(faction);
        }
    });

    it('keeps repeated bytes deterministic and does not mutate serializer input', () => {
        expect.assertions(5);
        const state = cloneBase();
        setRepresentativeFatigue(state);
        const before = structuredClone(state);

        const canonical = serializeState(state);
        const runtime = serializeRuntimeState(state);

        expect(serializeState(state)).toBe(canonical);
        expect(serializeRuntimeState(state)).toBe(runtime);
        expect(serializeState(deserializeState(canonical))).toBe(canonical);
        expect(serializeRuntimeState(deserializeState(runtime))).toBe(runtime);
        expect(state).toEqual(before);
    });

    it('preserves legacy integer bytes and keeps malformed formation and militia fatigue fail-closed', () => {
        expect.assertions(14);
        const integerState = cloneBase();
        const ids = representativeFormationIds(integerState);
        const integerValues: Readonly<Record<FactionId, number>> = { RBiH: 0, RS: 4, HRHB: 8 };
        for (const faction of ALL_FACTIONS) {
            integerState.military.formations[ids[faction]]!.ops = {
                fatigue: integerValues[faction],
                last_supplied_turn: null,
            };
        }
        const integerBytes = serializeState(integerState);
        expect(serializeState(deserializeState(integerBytes))).toBe(integerBytes);
        for (const faction of ALL_FACTIONS) {
            expect(deserializeState(integerBytes).military.formations[ids[faction]]?.ops?.fatigue).toBe(integerValues[faction]);
        }

        const malformedValues: unknown[] = ['2.5', { value: 2.5 }, null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.5];
        for (const malformed of malformedValues) {
            const state = cloneBase();
            state.military.formations[ids.RBiH]!.ops!.fatigue = malformed as number;
            expect(deserializeState(serializeState(state)).military.formations[ids.RBiH]?.ops?.fatigue).toBe(0);
        }

        const missing = cloneBase();
        delete missing.military.formations[ids.RBiH]!.ops;
        delete (missing.military.formations[ids.RS]!.ops as Partial<{ fatigue: number }>).fatigue;
        const defaulted = deserializeState(serializeState(missing));
        expect(defaulted.military.formations[ids.RBiH]?.ops?.fatigue).toBe(0);
        expect(defaulted.military.formations[ids.RS]?.ops?.fatigue).toBe(0);

        const militiaState = cloneBase();
        const militiaKey = Object.keys(militiaState.military.militia_pools).sort()[0];
        if (!militiaKey) throw new Error('Missing militia pool in complete campaign fixture');
        militiaState.military.militia_pools[militiaKey]!.fatigue = 2.5;
        expect(deserializeState(serializeState(militiaState)).military.militia_pools[militiaKey]?.fatigue).toBe(0);
    });

    it('preserves the half point emitted by the real frontline fatigue writer', () => {
        expect.assertions(3);
        const state = cloneBase();
        const id = representativeFormationIds(state).RBiH;
        const originalSectors = state.military.corps_front_sectors;
        state.meta.turn = 3;
        state.military.formations[id]!.status = 'active';
        state.military.formations[id]!.ops = { fatigue: 0, last_supplied_turn: 2 };
        state.military.corps_front_sectors = {
            'fatigue-persistence-fixture': {
                sector_id: 'fatigue-persistence-fixture',
                corps_id: 'fatigue-persistence-fixture-corps',
                faction: 'RBiH',
                edge_ids: [],
                assigned_brigade_ids: [id],
                reserve_brigade_ids: [],
                sub_segments: [],
                opposing_factions: ['RS'],
                length_edges: 0,
                density: 0,
                threat_ratio: 0,
                defensive_power: 0,
            },
        } as unknown as GameState['military']['corps_front_sectors'];

        applyFatigueRecovery(state);
        state.military.corps_front_sectors = originalSectors;

        expect(state.military.formations[id]?.ops?.fatigue).toBe(0.5);
        expect(deserializeState(serializeState(state)).military.formations[id]?.ops?.fatigue).toBe(0.5);
        expect(deserializeState(serializeRuntimeState(state)).military.formations[id]?.ops?.fatigue).toBe(0.5);
    });

    it('loads and advances a real fractional save identically after a runtime round trip', async () => {
        expect.assertions(13);
        const baseDir = process.cwd();
        const source = cloneBase();
        const ids = setRepresentativeFatigue(source);
        const tempDirectory = await mkdtemp(join(tmpdir(), 'awwv-fractional-fatigue-'));
        temporaryDirectories.push(tempDirectory);
        const sourcePath = join(tempDirectory, 'source-save.json');
        const runtimePath = join(tempDirectory, 'runtime-save.json');
        await writeFile(sourcePath, serializeGameState(source, 2), 'utf8');

        const loaded = (await loadStateFromPath(sourcePath, baseDir)).state;
        expectRepresentativeFatigue(loaded, ids);
        await writeFile(runtimePath, serializeRuntimeState(loaded), 'utf8');
        const runtimeLoaded = (await loadStateFromPath(runtimePath, baseDir)).state;
        expectRepresentativeFatigue(runtimeLoaded, ids);

        const sourceNext = await advanceTurn(source, baseDir);
        const loadedNext = await advanceTurn(loaded, baseDir);
        const runtimeNext = await advanceTurn(runtimeLoaded, baseDir);
        expect(sourceNext.error).toBeUndefined();
        expect(loadedNext.error).toBeUndefined();
        expect(runtimeNext.error).toBeUndefined();
        expect(serializeRuntimeState(loadedNext.state)).toBe(serializeRuntimeState(sourceNext.state));
        expect(serializeRuntimeState(runtimeNext.state)).toBe(serializeRuntimeState(sourceNext.state));
        expect(loadedNext.report).toEqual(sourceNext.report);
        expect(runtimeNext.report).toEqual(sourceNext.report);
    }, 120_000);
});
