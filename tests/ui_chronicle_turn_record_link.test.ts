import { describe, expect, it } from 'vitest';
import { openArmyHQAftermathRecord, type ShellNavigationState } from '../src/ui/map/utils/shellNavigation.js';

function createState(playerFaction: string | null = 'RBiH'): ShellNavigationState & {
  calls: Array<[string, unknown]>;
} {
  const calls: Array<[string, unknown]> = [];
  return {
    loadedGameState: { player_faction: playerFaction },
    calls,
    setSelectedArmyId: (id) => { calls.push(['setSelectedArmyId', id]); },
    setArmyHQOpen: (open) => { calls.push(['setArmyHQOpen', open]); },
    setArmyHQTab: (tab) => { calls.push(['setArmyHQTab', tab]); },
    setArmyHQRecordsSubTab: (subTab) => { calls.push(['setArmyHQRecordsSubTab', subTab]); },
    setArmyHQExpandedCorpsId: (id) => { calls.push(['setArmyHQExpandedCorpsId', id]); },
    setCodexOpen: (open) => { calls.push(['setCodexOpen', open]); },
    setChronicleOpen: (open) => { calls.push(['setChronicleOpen', open]); },
    setFocusedAftermathTurn: (turn) => { calls.push(['setFocusedAftermathTurn', turn]); },
  };
}

describe('Chronicle to turn-record navigation', () => {
  it('routes a Chronicle entry to the matching Army HQ aftermath record', () => {
    const state = createState('RBiH');

    expect(openArmyHQAftermathRecord(state, 113)).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'aftermath'],
      ['setFocusedAftermathTurn', 113],
      ['setChronicleOpen', false],
    ]);
  });

  it('refuses focused record navigation without a loaded player faction', () => {
    const state = createState(null);

    expect(openArmyHQAftermathRecord(state, 113)).toBe(false);
    expect(state.calls).toEqual([]);
  });
});
