import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import { resolvePlayerFacingFaction } from '../src/ui/shared/playerVisibility.js';

const SHELL_FILES = [
  'src/ui/map/App.tsx',
  'src/ui/map/components/BottomStatusStrip.tsx',
  'src/ui/map/components/DaytonNegotiationModal.tsx',
  'src/ui/map/components/chronicle/WrappedOverlay.tsx',
  'src/ui/map/components/chronicle/WrappedSlide.tsx',
  'src/ui/map/components/warroom/WarroomShellLayer.tsx',
  'src/ui/map/hooks/useKeyboardShortcuts.ts',
  'src/ui/warroom/ClickableRegionManager.ts',
  'src/ui/warroom/components/NewsTicker.ts',
  'src/ui/warroom/warroom.ts',
];

const FORBIDDEN_PATTERNS = [
  /\?\?\s*'RBiH'/,
  /\?\?\s*'RS'/,
  /\|\|\s*'RBiH'/,
  /\|\|\s*'RS'/,
  /factions\[0\]\?\.id/,
];

function readSource(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

describe('player faction shell boundary truth', () => {
  it('shared player-faction resolver stays null-safe instead of inventing ownership', () => {
    expect(resolvePlayerFacingFaction({ player_faction: 'RBiH' } as LoadedGameState)).toBe('RBiH');
    expect(resolvePlayerFacingFaction({ player_faction: 'RS' } as LoadedGameState)).toBe('RS');
    expect(resolvePlayerFacingFaction({ player_faction: 'HRHB' } as LoadedGameState)).toBe('HRHB');
    expect(resolvePlayerFacingFaction({} as LoadedGameState)).toBeNull();
    expect(resolvePlayerFacingFaction(null)).toBeNull();
  });

  it('shell/bootstrap surfaces no longer synthesize a player faction from local literals or faction array order', () => {
    const violations: string[] = [];
    for (const relPath of SHELL_FILES) {
      const source = readSource(relPath);
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(source)) {
          violations.push(`${relPath}: ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
