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
import { openPresidentialDecisionRoomNavigationTarget } from '../src/ui/map/utils/presidentialDecisionRoomNavigation.js';
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
    setFocusedAftermathTurn: (turn) => { calls.push(['setFocusedAftermathTurn', turn]); },
    setFocusedOperationHistoryId: (id) => { calls.push(['setFocusedOperationHistoryId', id]); },
    setFocusedDecisionConsequenceId: (id) => { calls.push(['setFocusedDecisionConsequenceId', id]); },
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
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
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
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'ops'],
      ['setFocusedAftermathTurn', null],
      ['setFocusedOperationHistoryId', null],
      ['setFocusedDecisionConsequenceId', null],
    ]);
  });

  it('routes opportunity records through Army HQ records sub-tabs', () => {
    const state = createState('RBiH');

    const ok = openArmyHQRecordsSubTab(state, 'opportunities');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'opportunities'],
      ['setFocusedAftermathTurn', null],
      ['setFocusedOperationHistoryId', null],
      ['setFocusedDecisionConsequenceId', null],
    ]);
  });

  it('routes turn aftermath records through Army HQ records sub-tabs', () => {
    const state = createState('RBiH');

    const ok = openArmyHQRecordsSubTab(state, 'aftermath');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'aftermath'],
      ['setFocusedAftermathTurn', null],
      ['setFocusedOperationHistoryId', null],
      ['setFocusedDecisionConsequenceId', null],
    ]);
  });

  it('opens Army HQ briefing focused on the selected corps', () => {
    const state = createState('HRHB');

    const ok = openArmyHQBriefingForCorps(state, 'hvo_operational_group_north');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'HRHB'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
      ['setArmyHQExpandedCorpsId', 'hvo_operational_group_north'],
    ]);
  });

  it('openCodex routes through canonical shellNavigation helper', () => {
    const state = createState('RBiH');

    expect(openCodex(state)).toBe(true);
    expect(state.calls).toEqual([
      ['setChronicleOpen', false],
      ['setArmyHQOpen', false],
      ['setCodexOpen', true],
    ]);
  });

  it('openChronicle routes through canonical shellNavigation helper', () => {
    const state = createState('RS');

    expect(openChronicle(state)).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setArmyHQOpen', false],
      ['setChronicleOpen', true],
    ]);
  });

  it('openArmyHQTab supports personnel tab for inbox army_hq_personnel action', () => {
    const state = createState('HRHB');

    const ok = openArmyHQTab(state, 'personnel');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'HRHB'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'personnel'],
    ]);
  });

  it('refuses faction-command navigation when no player faction is loaded', () => {
    // Command surfaces (summary / corps briefing) require a commanded army; an
    // observer save has none. The read-only RECORDS path is covered separately.
    const state = createState(null);

    expect(openArmyHQTab(state, 'summary')).toBe(false);
    expect(openArmyHQBriefingForCorps(state, 'arbih_3rd_corps')).toBe(false);
    expect(state.calls).toEqual([]);
  });

  it('#122: observer/no-faction saves still reach the read-only RECORDS chart', () => {
    // The War's Record (territory-over-time chart + AAR/ops/decisions archive) is
    // faction-agnostic — it reads only loadedGameState. Observer saves must reach
    // it: the helper opens Army HQ on the records sub-tab WITHOUT selecting an army
    // (no setSelectedArmyId) and forces the RECORDS tab so the modal is not blank.
    const state = createState(null);

    const ok = openArmyHQRecordsSubTab(state, 'aftermath');

    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'aftermath'],
      ['setFocusedAftermathTurn', null],
      ['setFocusedOperationHistoryId', null],
      ['setFocusedDecisionConsequenceId', null],
    ]);
    // Crucially: no army was selected for an observer.
    expect(state.calls.some(([fn]) => fn === 'setSelectedArmyId')).toBe(false);
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
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'summary'],
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'aftermath'],
      ['setFocusedAftermathTurn', null],
      ['setFocusedOperationHistoryId', null],
      ['setFocusedDecisionConsequenceId', null],
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'ops'],
      ['setFocusedAftermathTurn', null],
      ['setFocusedOperationHistoryId', null],
      ['setFocusedDecisionConsequenceId', null],
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'opportunities'],
      ['setFocusedAftermathTurn', null],
      ['setFocusedOperationHistoryId', null],
      ['setFocusedDecisionConsequenceId', null],
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
      ['setArmyHQExpandedCorpsId', 'arbih_3rd_corps'],
      ['setCodexOpen', false],
      ['setArmyHQOpen', false],
      ['setChronicleOpen', true],
      ['setChronicleOpen', false],
      ['setArmyHQOpen', false],
      ['setCodexOpen', true],
    ]);
  });

  it('routes Presidential Decision Room targets through the shared shell helpers', () => {
    const state = createState('RBiH');

    expect(openPresidentialDecisionRoomNavigationTarget({ kind: 'army-hq-aftermath-record', turn: 31 }, state)).toBe(true);
    expect(openPresidentialDecisionRoomNavigationTarget({ kind: 'army-hq-corps-briefing', corpsId: 'arbih_3rd_corps' }, state)).toBe(true);
    expect(openPresidentialDecisionRoomNavigationTarget({ kind: 'chronicle' }, state)).toBe(true);

    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'aftermath'],
      ['setFocusedAftermathTurn', 31],
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
      ['setArmyHQExpandedCorpsId', 'arbih_3rd_corps'],
      ['setCodexOpen', false],
      ['setArmyHQOpen', false],
      ['setChronicleOpen', true],
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

  it('keeps retired Warroom local commands out of both command boundaries', () => {
    expect(isWarroomLocalCommand({ kind: 'strategic-overview' })).toBe(false);
    expect(isWarroomLocalCommand({ kind: 'event-log' })).toBe(false);
    expect(decodeShellHandoffCommand(encodeURIComponent(JSON.stringify({ kind: 'strategic-overview' })))).toBeNull();
    expect(decodeShellHandoffCommand(encodeURIComponent(JSON.stringify({ kind: 'event-log' })))).toBeNull();
  });

  it('inbox event_modal action opens the blocking decision modal in App', () => {
    // Behavioral proof: the old Army HQ briefing route remains available for
    // other handoffs, while App.tsx owns the blocking decision modal surface.
    const state = createState('RBiH');
    const ok = openArmyHQTab(state, 'briefing');
    expect(ok).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'briefing'],
    ]);

    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );
    // event_modal branch surfaces the selected blocking event directly.
    expect(appSource).toContain("action === 'event_modal'");
    expect(appSource).toContain('setActiveEventDecisionId');
    expect(appSource).toContain('pendingEventDecisions');
    expect(appSource).toContain('respondToEventDecision');
    // Identity routing preserved — inbox passes itemId.
    expect(appSource).toContain('itemId');
  });
});
