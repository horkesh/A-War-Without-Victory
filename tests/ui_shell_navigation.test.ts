import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyShellHandoffCommand,
  openArmyHQBriefingForCorps,
  openArmyHQRecordsSubTab,
  openArmyHQTab,
  openChronicle,
  openCodex,
  type ShellNavigationState,
} from '../src/ui/map/utils/shellNavigation.js';
import { isWarroomLocalCommand } from '../src/ui/map/utils/warroomNavigation.js';
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

  it('routes opportunity records through Army HQ records sub-tabs', () => {
    const state = createState('RBiH');

    const ok = openArmyHQRecordsSubTab(state, 'opportunities');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'opportunities'],
    ]);
  });

  it('routes turn aftermath records through Army HQ records sub-tabs', () => {
    const state = createState('RBiH');

    const ok = openArmyHQRecordsSubTab(state, 'aftermath');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'aftermath'],
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

  it('openCodex routes through canonical shellNavigation helper', () => {
    const state = createState('RBiH');

    expect(openCodex(state)).toBe(true);
    expect(state.calls).toEqual([['setCodexOpen', true]]);
  });

  it('openChronicle routes through canonical shellNavigation helper', () => {
    const state = createState('RS');

    expect(openChronicle(state)).toBe(true);
    expect(state.calls).toEqual([['setChronicleOpen', true]]);
  });

  it('openArmyHQTab supports personnel tab for inbox army_hq_personnel action', () => {
    const state = createState('HRHB');

    const ok = openArmyHQTab(state, 'personnel');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'HRHB'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'personnel'],
    ]);
  });

  it('Tactical shell call sites route Codex/Chronicle/ArmyHQ through shellNavigation helpers', () => {
    // Behavioural proof that App.tsx + PresidentialToolbar + TopToolbar do not
    // reintroduce direct setter sequences for navigation dispatch. shellNavigation.ts
    // is the single chokepoint for Tactical → child-surface navigation.
    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );
    const toolbarSource = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );
    const topToolbarSource = readFileSync(
      new URL('../src/ui/map/components/TopToolbar.tsx', import.meta.url),
      'utf8',
    );

    // App.tsx imports the canonical helpers and uses them for navigation dispatch.
    expect(appSource).toContain('openCodex');
    expect(appSource).toContain('openChronicle');
    expect(appSource).toContain("openCodex(useGameStore.getState())");
    expect(appSource).toContain("openArmyHQTab(gs, 'personnel')");
    expect(appSource).not.toContain('useGameStore.setState({ armyHQTab:');
    expect(appSource).not.toContain('useGameStore.getState().setCodexOpen(true)');

    // PresidentialToolbar: Chronicle button routes through openChronicle.
    expect(toolbarSource).toContain('openChronicle');
    expect(toolbarSource).not.toContain('useGameStore.getState().setChronicleOpen(true)');

    // TopToolbar: Codex buttons route through openCodex and the legacy
    // setCodexOpen binding is gone.
    expect(topToolbarSource).toContain('openCodex');
    expect(topToolbarSource).not.toContain('const setCodexOpen = useGameStore');
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
    expect(applyShellHandoffCommand(state, { kind: 'army-hq', tab: 'records', recordsSubTab: 'aftermath' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'army-hq', tab: 'records', recordsSubTab: 'ops' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'army-hq', tab: 'records', recordsSubTab: 'opportunities' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'army-hq', tab: 'briefing', corpsId: 'arbih_3rd_corps' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'chronicle' })).toBe(true);
    expect(applyShellHandoffCommand(state, { kind: 'codex' })).toBe(true);

    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'summary'],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'aftermath'],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'ops'],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'opportunities'],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
      ['setArmyHQExpandedCorpsId', 'arbih_3rd_corps'],
      ['setChronicleOpen', true],
      ['setCodexOpen', true],
    ]);
  });

  it('round-trips shared shell handoff commands for cross-shell navigation', () => {
    const encoded = encodeShellHandoffCommand({ kind: 'army-hq', tab: 'records', recordsSubTab: 'opportunities' });
    const aftermathEncoded = encodeShellHandoffCommand({ kind: 'army-hq', tab: 'records', recordsSubTab: 'aftermath' });

    expect(decodeShellHandoffCommand(encoded)).toEqual({
      kind: 'army-hq',
      tab: 'records',
      recordsSubTab: 'opportunities',
    });
    expect(decodeShellHandoffCommand(aftermathEncoded)).toEqual({
      kind: 'army-hq',
      tab: 'records',
      recordsSubTab: 'aftermath',
    });
    expect(decodeShellHandoffCommand(encodeShellHandoffCommand({ kind: 'chronicle' }))).toEqual({ kind: 'chronicle' });
    expect(decodeShellHandoffCommand(encodeShellHandoffCommand({ kind: 'codex' }))).toEqual({ kind: 'codex' });
    expect(decodeShellHandoffCommand(encodeURIComponent(JSON.stringify({ kind: 'strategic-overview' })))).toBeNull();
    expect(decodeShellHandoffCommand(encodeURIComponent(JSON.stringify({ kind: 'event-log' })))).toBeNull();
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

  it('keeps Warroom-local overlays out of the shared shell handoff boundary', () => {
    expect(isWarroomLocalCommand({ kind: 'strategic-overview' })).toBe(true);
    expect(isWarroomLocalCommand({ kind: 'event-log' })).toBe(true);
    expect(decodeShellHandoffCommand(encodeURIComponent(JSON.stringify({ kind: 'strategic-overview' })))).toBeNull();
    expect(decodeShellHandoffCommand(encodeURIComponent(JSON.stringify({ kind: 'event-log' })))).toBeNull();
  });

  it('inbox event_modal action routes the president to Army HQ briefing (sole executor)', () => {
    // Behavioral proof: openArmyHQTab(state, 'briefing') is the routing call
    // App.tsx wires the 'event_modal' inbox branch to. It lands the president
    // at PresidentialAttentionPanel, which executes ipc.respondToEventDecision.
    // App.tsx no longer pushes decisions into an EventModal queue and no longer
    // calls ipc.respondToEventDecision itself.
    const state = createState('RBiH');
    const ok = openArmyHQTab(state, 'briefing');
    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
    ]);

    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );
    // App.tsx no longer executes event decisions or reads pendingEventDecisions.
    expect(appSource).not.toContain('respondToEventDecision');
    expect(appSource).not.toContain('pendingEventDecisions');
    // event_modal branch routes to Army HQ briefing.
    expect(appSource).toContain("action === 'event_modal'");
    expect(appSource).toContain("openArmyHQTab(gs, 'briefing')");
    // Identity routing preserved — inbox passes itemId.
    expect(appSource).toContain('itemId');
  });
});
