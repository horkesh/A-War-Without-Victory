import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyShellHandoffCommand,
  openArmyHQBriefingForCorps,
  openArmyHQRecordsSubTab,
  openArmyHQTab,
  type ShellNavigationState,
} from '../src/ui/map/utils/shellNavigation.js';
import { decodeShellHandoffCommand, encodeShellHandoffCommand } from '../src/ui/shared/shellHandoff.js';
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
    setCodexOpen: (open) => { calls.push(['setCodexOpen', open]); },
    setChronicleOpen: (open) => { calls.push(['setChronicleOpen', open]); },
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

  it('applies Warroom shell handoff commands through canonical Army HQ navigation', () => {
    const state = createState('RBiH');

    expect(applyShellHandoffCommand(state, { kind: 'army-hq', tab: 'summary' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'army-hq', tab: 'records', recordsSubTab: 'ops' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'army-hq', tab: 'briefing', corpsId: 'arbih_3rd_corps' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'chronicle' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'codex' })).toBe(true);

    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'summary'],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'ops'],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
      ['setArmyHQExpandedCorpsId', 'arbih_3rd_corps'],
      ['setChronicleOpen', true],
      ['setCodexOpen', true],
    ]);
  });

  it('round-trips shared shell handoff commands for cross-shell navigation', () => {
    const encoded = encodeShellHandoffCommand({ kind: 'army-hq', tab: 'records', recordsSubTab: 'aar' });

    expect(decodeShellHandoffCommand(encoded)).toEqual({
      kind: 'army-hq',
      tab: 'records',
      recordsSubTab: 'aar',
    });
    expect(decodeShellHandoffCommand(encodeShellHandoffCommand({ kind: 'chronicle' }))).toEqual({ kind: 'chronicle' });
    expect(decodeShellHandoffCommand(encodeShellHandoffCommand({ kind: 'codex' }))).toEqual({ kind: 'codex' });
    expect(decodeShellHandoffCommand('not-json')).toBeNull();
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

  it('routes Ctrl+S through canonical IPC instead of raw window bridge access', () => {
    const source = readFileSync(
      new URL('../src/ui/map/hooks/useKeyboardShortcuts.ts', import.meta.url),
      'utf8',
    );

    expect(source).toContain('ipc.quickSave()');
    expect(source).not.toContain("window as unknown as { awwv?: { quickSave: () => Promise<unknown> } }");
  });

  it('keeps tactical shell top clearance tight enough that the crest does not tax every rail', () => {
    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );
    const toolbarSource = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );
    const railSource = readFileSync(
      new URL('../src/ui/map/components/panelRail.ts', import.meta.url),
      'utf8',
    );

    expect(appSource).toContain("devMode ? '6.5rem' : '5.5rem'");
    expect(toolbarSource).toContain("className=\"w-[84px] h-[84px]");
    expect(railSource).toContain("var(--awwv-toolbar-clearance, 5.5rem)");
    expect(railSource).not.toContain("var(--awwv-toolbar-clearance, 7.5rem)");
  });

  it('Army HQ back button says FIELD (not MAP) and has a WARROOM return affordance', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/army_hq/ArmyHQModal.tsx', import.meta.url),
      'utf8',
    );

    // Back button uses "FIELD" not "MAP" — the president returns to field observation, not "the map"
    expect(source).toContain("'← FIELD'");
    expect(source).not.toContain("'← MAP'");

    // WARROOM return affordance exists in Army HQ header
    expect(source).toContain('shouldShowWarroomReturn');
    expect(source).toContain('focusWarroom');
    expect(source).toContain("type: 'awwv-back-to-hq'");
    expect(source).toContain('WARROOM');
    expect(source).toContain("title=\"Return to president's desk\"");
  });

  it('routes Warroom staff props through shell handoff instead of opening duplicate local packets', () => {
    const warroomSource = readFileSync(
      new URL('../src/ui/warroom/ClickableRegionManager.ts', import.meta.url),
      'utf8',
    );
    const warroomAppSource = readFileSync(
      new URL('../src/ui/warroom/warroom.ts', import.meta.url),
      'utf8',
    );
    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );

    expect(warroomSource).toContain("this.tacticalShellHandoffHandler({ kind: 'army-hq', tab: 'summary' })");
    expect(warroomSource).toContain("this.tacticalShellHandoffHandler({ kind: 'chronicle' })");
    expect(warroomSource).toContain("this.tacticalShellHandoffHandler({ kind: 'army-hq', tab: 'briefing' })");
    expect(warroomSource).toContain("this.tacticalShellHandoffHandler({ kind: 'army-hq', tab: 'records', recordsSubTab: 'ops' })");
    expect(warroomAppSource).toContain('shellHandoff=');
    expect(appSource).toContain("event.data?.type !== 'awwv-shell:handoff'");
    expect(appSource).toContain('applyShellHandoffCommand');
    expect(appSource).toContain("params.get('shellHandoff')");
  });

  it('routes inbox event_modal actions through App.tsx to existing EventModal', () => {
    // App.tsx is the inbox action routing hub. It reads pendingEventDecisions to
    // build EventDisplayData for the EventModal, and wires onDecisionResponse
    // through ipc.respondToEventDecision. This is intentional — App.tsx owns
    // modal routing for all inbox actions.
    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );

    expect(appSource).toContain('pendingEventDecisions');
    expect(appSource).toContain('respondToEventDecision');
  });
});
