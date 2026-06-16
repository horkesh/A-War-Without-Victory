/**
 * Shell navigation helpers — routes the president between shells.
 *
 * Presidential command doctrine:
 * - Warroom = president's desk (campaign context, return destination)
 * - Army HQ = military command center (command review, records, personnel)
 * - Tactical Map = field situation room (observation, selective intervention)
 *
 * These helpers handle handoffs from Tactical Map into Army HQ tabs.
 */
import type { ArmyHQRecordsSubTab, ArmyHQTab, ShellHandoffCommand } from '../../shared/shellHandoff';

export interface ShellNavigationState {
  loadedGameState?: { player_faction?: string | null } | null;
  setSelectedArmyId: (id: string | null) => void;
  setArmyHQOpen: (open: boolean) => void;
  setArmyHQTab: (tab: ArmyHQTab) => void;
  setArmyHQRecordsSubTab: (subTab: ArmyHQRecordsSubTab) => void;
  setArmyHQExpandedCorpsId: (id: string | null) => void;
  /** Optional: focuses a specific Turn Aftermath record after routing to Army HQ Records. */
  setFocusedAftermathTurn?: (turn: number | null) => void;
  /** Optional: focuses a specific completed operation row after routing to Army HQ Records. */
  setFocusedOperationHistoryId?: (id: string | null) => void;
  /** Optional: focuses a specific decision consequence row after routing to Army HQ Records. */
  setFocusedDecisionConsequenceId?: (id: string | null) => void;
  setCodexOpen: (open: boolean) => void;
  setChronicleOpen: (open: boolean) => void;
  /** Optional: set by gameStore when advance-turn handoff is received from the Warroom shell. */
  setAdvanceTurnPending?: (v: boolean) => void;
  /** Optional: clear tactical selections to return to Presidential Inbox. */
  setSelectedOsid?: (id: string | null) => void;
  setSelectedFormationId?: (id: string | null) => void;
  setSelectedCorpsId?: (id: string | null) => void;
  setSelectedCorpsFrontSectorId?: (id: string | null) => void;
  setSelectedArmyHqId?: (id: string | null) => void;
  setSelectedOperationKey?: (key: string | null) => void;
  setSelectedOrbatCorpsId?: (id: string | null) => void;
}

function getPlayerFaction(state: ShellNavigationState): string | null {
  return state.loadedGameState?.player_faction ?? null;
}

export function openArmyHQTab(state: ShellNavigationState, tab: ArmyHQTab): boolean {
  const faction = getPlayerFaction(state);
  if (!faction) return false;
  state.setSelectedArmyId(faction);
  state.setArmyHQOpen(true);
  state.setArmyHQTab(tab);
  return true;
}

export function openArmyHQRecordsSubTab(state: ShellNavigationState, subTab: ArmyHQRecordsSubTab): boolean {
  const faction = getPlayerFaction(state);
  // The War's Record (RECORDS tab) is read-only campaign history sourced entirely
  // from loadedGameState — it is faction-agnostic. Observer / no-faction saves must
  // still reach it (#122). When there is no player faction we leave selectedArmyId
  // null; ArmyHQModal renders a records-only observer view in that case.
  if (faction) {
    state.setSelectedArmyId(faction);
  }
  state.setArmyHQOpen(true);
  state.setArmyHQRecordsSubTab(subTab);
  // Force the RECORDS tab for observers so the (faction-dependent) default tab
  // does not leave the modal blank when no army is selected.
  if (!faction) {
    state.setArmyHQTab('records');
  }
  return true;
}

export function openArmyHQAftermathRecord(state: ShellNavigationState, turn: number): boolean {
  const faction = getPlayerFaction(state);
  if (!faction) return false;
  state.setSelectedArmyId(faction);
  state.setArmyHQOpen(true);
  state.setArmyHQRecordsSubTab('aftermath');
  state.setFocusedAftermathTurn?.(turn);
  state.setChronicleOpen(false);
  return true;
}

export function openArmyHQOperationHistory(state: ShellNavigationState, operationAarId?: string | null): boolean {
  const faction = getPlayerFaction(state);
  if (!faction) return false;
  state.setSelectedArmyId(faction);
  state.setArmyHQOpen(true);
  state.setArmyHQRecordsSubTab('ops');
  state.setFocusedOperationHistoryId?.(operationAarId ?? null);
  state.setChronicleOpen(false);
  return true;
}

export function openArmyHQDecisionConsequenceRecord(state: ShellNavigationState, recordId?: string | null): boolean {
  const faction = getPlayerFaction(state);
  if (!faction) return false;
  state.setSelectedArmyId(faction);
  state.setArmyHQOpen(true);
  state.setArmyHQRecordsSubTab('decisions');
  state.setFocusedDecisionConsequenceId?.(recordId ?? null);
  state.setChronicleOpen(false);
  return true;
}

export function openArmyHQBriefingForCorps(state: ShellNavigationState, corpsId: string | null): boolean {
  const faction = getPlayerFaction(state);
  if (!faction) return false;
  state.setSelectedArmyId(faction);
  state.setArmyHQOpen(true);
  state.setArmyHQTab('briefing');
  state.setArmyHQExpandedCorpsId(corpsId);
  return true;
}

/**
 * Canonical Tactical → Codex navigation dispatch.
 *
 * Tactical toolbars/keyboard shortcuts MUST route through this helper rather
 * than calling `setCodexOpen(true)` directly. Keeps the Codex entrypoint
 * contract in one place (see `tests/ui_shell_navigation.test.ts`).
 */
export function openCodex(state: ShellNavigationState): boolean {
  state.setChronicleOpen(false);
  state.setCodexOpen(true);
  return true;
}

/**
 * Canonical Tactical → Chronicle navigation dispatch.
 *
 * Same contract as `openCodex` — prefer this helper over direct
 * `setChronicleOpen(true)` in navigation surfaces (toolbars, keyboard
 * shortcuts, hotspot callbacks). Toggle behaviour for keyboard shortcuts
 * should still read/toggle through gameStore since toggling is not a pure
 * navigation dispatch.
 */
export function openChronicle(state: ShellNavigationState): boolean {
  state.setCodexOpen(false);
  state.setChronicleOpen(true);
  return true;
}

export function applyShellHandoffCommand(state: ShellNavigationState, command: ShellHandoffCommand): boolean {
  if (command.kind === 'codex') {
    return openCodex(state);
  }
  if (command.kind === 'chronicle') {
    return openChronicle(state);
  }
  if (command.kind === 'advance-turn') {
    // Warroom wall calendar hotspot — show the React advance-turn confirmation modal.
    // setAdvanceTurnPending is optional on ShellNavigationState; gameStore always provides it.
    if (!state.setAdvanceTurnPending) return false;
    state.setAdvanceTurnPending(true);
    return true;
  }
  if (command.tab === 'records' && command.recordsSubTab) {
    return openArmyHQRecordsSubTab(state, command.recordsSubTab);
  }
  if (command.tab === 'briefing' && command.corpsId !== undefined) {
    return openArmyHQBriefingForCorps(state, command.corpsId ?? null);
  }
  return openArmyHQTab(state, command.tab);
}

/**
 * Returns true for ShellHandoffCommands that are handled entirely within the warroom
 * (no screen transition required). Returns false for commands that navigate away to
 * the game view (army-hq, codex, chronicle).
 *
 * Used by App.tsx onNavigate to gate the `setAppScreen('game')` call.
 */
export function warroomCommandStaysInRoom(command: ShellHandoffCommand | undefined): boolean {
  if (!command) return false;
  return command.kind === 'advance-turn';
}
