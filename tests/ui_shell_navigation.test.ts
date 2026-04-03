import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  openArmyHQBriefingForCorps,
  openArmyHQRecordsSubTab,
  openArmyHQTab,
  type ShellNavigationState,
} from '../src/ui/map/utils/shellNavigation.js';
import { isEmbeddedTacticalMap, shouldShowWarroomReturn } from '../src/ui/map/utils/warroomReturn.js';

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
  };
}

describe('shellNavigation', () => {
  it('opens Army HQ summary for the player faction', () => {
    const state = createState('RS');

    const ok = openArmyHQTab(state, 'summary');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RS'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'summary'],
    ]);
  });

  it('routes records history through Army HQ records sub-tabs', () => {
    const state = createState('RBiH');

    const ok = openArmyHQRecordsSubTab(state, 'ops');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'ops'],
    ]);
  });

  it('opens Army HQ briefing focused on the selected corps', () => {
    const state = createState('HRHB');

    const ok = openArmyHQBriefingForCorps(state, 'hvo_operational_group_north');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'HRHB'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
      ['setArmyHQExpandedCorpsId', 'hvo_operational_group_north'],
    ]);
  });

  it('refuses to navigate when no player faction is loaded', () => {
    const state = createState(null);

    expect(openArmyHQTab(state, 'summary')).toBe(false);
    expect(openArmyHQRecordsSubTab(state, 'aar')).toBe(false);
    expect(openArmyHQBriefingForCorps(state, 'arbih_3rd_corps')).toBe(false);
    expect(state.calls).toEqual([]);
  });

  it('shows a Warroom return affordance for standalone desktop and embedded tactical shells', () => {
    expect(isEmbeddedTacticalMap('?embedded=1')).toBe(true);
    expect(shouldShowWarroomReturn('?embedded=1', false)).toBe(true);
    expect(shouldShowWarroomReturn('', true)).toBe(true);
    expect(shouldShowWarroomReturn('', false)).toBe(false);
  });

  it('keeps the tactical operations panel map-facing only', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/OperationsPanel.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('Army HQ owns command review. This panel stays map-facing.');
    expect(source).not.toContain('Launch Now');
    expect(source).not.toContain('Halt + Dig In');
    expect(source).not.toContain('stageOperationForceLaunch');
    expect(source).not.toContain('stageOperationHalt');
  });

  it('routes Space through canonical advance-turn action instead of shell DOM scans', () => {
    const source = readFileSync(
      new URL('../src/ui/map/hooks/useKeyboardShortcuts.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('advanceTurnAndSync');
    expect(source).not.toContain("document.querySelectorAll('button')");
    expect(source).not.toContain("b.textContent?.includes('ADVANCE TURN')");
  });
});
