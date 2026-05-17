import { describe, expect, it } from 'vitest';

import type { GameState } from '../../src/state/game_state.js';
import { getPlayerFaction } from '../../src/ui/warroom/components/warroom_utils.js';

function gameState(meta: Record<string, unknown>, factions: Array<{ id: string }> = []): GameState {
    return {
        schema_version: 13,
        meta: { turn: 0, phase: 'war', ...meta },
        factions,
        military: { formations: {}, militia_pools: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {} },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

describe('warroom player faction helper', () => {
    it('returns the configured faction without falling back to RBiH or factions[0]', () => {
        expect(getPlayerFaction(gameState({ player_faction: 'HRHB' }, [{ id: 'RBiH' }]))).toBe('HRHB');
        expect(() => getPlayerFaction(gameState({}, [{ id: 'RS' }]))).toThrow(/player_faction/);
    });
});
