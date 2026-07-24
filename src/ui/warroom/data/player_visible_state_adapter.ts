import type { FactionId, GameState } from '../../../state/game_state.js';

export type PlayerVisibleWarroomState = GameState & {
    meta: GameState['meta'] & {
        player_visible_projection: 1;
        player_faction: FactionId;
    };
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPlayerFaction(value: unknown): value is FactionId {
    return value === 'RBiH' || value === 'RS' || value === 'HRHB';
}

function assertPlayerVisibleWarroomState(state: unknown): asserts state is PlayerVisibleWarroomState {
    if (!isRecord(state)) throw new Error('Invalid player-visible state: expected an object');
    if (!isRecord(state.meta)) throw new Error('Invalid player-visible state: missing meta');
    if (state.meta.player_visible_projection !== 1) {
        throw new Error('Invalid player-visible state: missing projection contract marker');
    }
    if (!isPlayerFaction(state.meta.player_faction)) {
        throw new Error('Invalid player-visible state: missing active player faction');
    }
    if (typeof state.meta.turn !== 'number' || !Number.isFinite(state.meta.turn)) {
        throw new Error('Invalid player-visible state: meta.turn must be a number');
    }
    if (!isRecord(state.military)) throw new Error('Invalid player-visible state: missing military read model');
    if (!isRecord(state.military.formations)) {
        throw new Error('Invalid player-visible state: missing formation read model');
    }
    if (!isRecord(state.military.corps_command)) {
        throw new Error('Invalid player-visible state: missing corps command read model');
    }
    if (!isRecord(state.political)) throw new Error('Invalid player-visible state: missing political read model');
    if (!Array.isArray(state.factions)) throw new Error('Invalid player-visible state: missing faction read model');
}

/**
 * Parse the desktop renderer read model. This deliberately does not invoke the
 * canonical GameState deserializer: projected state omits hidden simulation
 * truth and is read-only input for Warroom display extractors.
 */
export function parsePlayerVisibleWarroomState(stateJson: string): PlayerVisibleWarroomState {
    let state: unknown;
    try {
        state = JSON.parse(stateJson);
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid player-visible state JSON: ${detail}`);
    }

    assertPlayerVisibleWarroomState(state);
    return state;
}
