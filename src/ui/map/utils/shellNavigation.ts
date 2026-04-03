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
  if (command.tab === 'records' && command.recordsSubTab) {
    return openArmyHQRecordsSubTab(state, command.recordsSubTab);
  }
  if (command.tab === 'briefing' && command.corpsId !== undefined) {
    return openArmyHQBriefingForCorps(state, command.corpsId ?? null);
  }
  return openArmyHQTab(state, command.tab);
}
