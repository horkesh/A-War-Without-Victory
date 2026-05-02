import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openArmyHQAftermathRecord, type ShellNavigationState } from '../src/ui/map/utils/shellNavigation.js';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

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

  it('wires Chronicle dossier entries to the focused record route', () => {
    const chronicle = read('../src/ui/map/components/chronicle/ChronicleOverlay.tsx');

    expect(chronicle).toContain('openArmyHQAftermathRecord');
    expect(chronicle).toContain('handleOpenTurnRecord(entry.turn)');
    expect(chronicle).toContain('Open Turn Record');
  });

  it('persists and renders the focused aftermath turn in Army HQ records', () => {
    const store = read('../src/ui/map/store/gameStore.ts');
    const records = read('../src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx');

    expect(store).toContain('focusedAftermathTurn');
    expect(store).toContain('setFocusedAftermathTurn');
    expect(records).toContain('focusedAftermathTurn');
    expect(records).toContain('data-focused-aftermath-turn');
  });
});
