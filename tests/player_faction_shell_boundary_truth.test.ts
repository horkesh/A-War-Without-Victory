import { describe, expect, it } from 'vitest';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import { resolvePlayerFacingFaction } from '../src/ui/shared/playerVisibility.js';

describe('player faction shell boundary truth', () => {
  it('shared player-faction resolver stays null-safe instead of inventing ownership', () => {
    expect(resolvePlayerFacingFaction({ player_faction: 'RBiH' } as LoadedGameState)).toBe('RBiH');
    expect(resolvePlayerFacingFaction({ player_faction: 'RS' } as LoadedGameState)).toBe('RS');
    expect(resolvePlayerFacingFaction({ player_faction: 'HRHB' } as LoadedGameState)).toBe('HRHB');
    expect(resolvePlayerFacingFaction({} as LoadedGameState)).toBeNull();
    expect(resolvePlayerFacingFaction(null)).toBeNull();
  });
});
