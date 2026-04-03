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
  setCodexOpen: (open: boolean) => void;
  setChronicleOpen: (open: boolean) => void;
  /** Optional: set by gameStore when advance-turn handoff is received from the Warroom shell. */
  setAdvanceTurnPending?: (v: boolean) => void;
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
  if (!faction) return false;
  state.setSelectedArmyId(faction);
  state.setArmyHQOpen(true);
  state.setArmyHQRecordsSubTab(subTab);
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

export function applyShellHandoffCommand(state: ShellNavigationState, command: ShellHandoffCommand): boolean {
  if (command.kind === 'codex') {
    state.setCodexOpen(true);
    return true;
  }
  if (command.kind === 'chronicle') {
    state.setChronicleOpen(true);
    return true;
  }
  if (command.kind === 'advance-turn') {
    // Warroom wall calendar hotspot — show the React advance-turn confirmation modal.
    // setAdvanceTurnPending is optional on ShellNavigationState; gameStore always provides it.
    state.setAdvanceTurnPending?.(true);
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
