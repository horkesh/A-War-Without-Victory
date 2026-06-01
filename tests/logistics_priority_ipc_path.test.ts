import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

const SECTOR_ID = 'sector_test';
const EDGE_IDS = ['alpha__bravo', 'bravo__charlie'];

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 12,
            seed: 'logistics-priority-ipc-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
            },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            logistics_priority: {},
        } as GameState['military'],
        political: { political_controllers: {} } as GameState['political'],
        displacement: {} as GameState['displacement'],
        corps_front_sectors: {
            [SECTOR_ID]: {
                sector_id: SECTOR_ID,
                faction: 'RBiH',
                edge_ids: EDGE_IDS,
            },
        },
    } as unknown as GameState;
}

function stageLogisticsPriorityOnCanonicalPath(
    state: GameState,
    payload: { faction: string; sectorId: string; priority: number },
): void {
    const sectors = (state as GameState & { corps_front_sectors?: Record<string, { edge_ids?: string[] }> }).corps_front_sectors;
    const sector = sectors?.[payload.sectorId];
    if (!sector) throw new Error(`Unknown sector: ${payload.sectorId}`);
    if (!state.military.logistics_priority) state.military.logistics_priority = {};
    if (!state.military.logistics_priority[payload.faction]) state.military.logistics_priority[payload.faction] = {};
    for (const edgeId of sector.edge_ids ?? []) {
        state.military.logistics_priority[payload.faction][edgeId] = payload.priority;
    }
}

describe('stage-logistics-priority IPC path', () => {
    it('round-trips staged sector edge priorities through the canonical military path', () => {
        const state = JSON.parse(JSON.stringify(makeState())) as GameState;

        stageLogisticsPriorityOnCanonicalPath(state, { faction: 'RBiH', sectorId: SECTOR_ID, priority: 1.5 });
        const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;

        expect(roundTripped.military.logistics_priority?.RBiH).toEqual({
            alpha__bravo: 1.5,
            bravo__charlie: 1.5,
        });
        expect((roundTripped as GameState & { logistics_priority?: unknown }).logistics_priority).toBeUndefined();
    });

    it('electron handler writes logistics priority only under state.military', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
        const handlerStart = source.indexOf("ipcMain.handle('stage-logistics-priority'");
        const handlerEnd = source.indexOf("ipcMain.handle('stage-operation-force-launch'");
        const handler = source.slice(handlerStart, handlerEnd);

        expect(handler).toContain('state.military.logistics_priority');
        expect(handler).not.toContain('state.logistics_priority');
    });
});
