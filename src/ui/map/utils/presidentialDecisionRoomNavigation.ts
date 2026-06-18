import type { PresidentialDecisionRoomNavigationTarget } from '../data/presidentialDecisionRoom';
import { useGameStore } from '../store/gameStore';
import { requestDecisionRoomLens } from './decisionRoomLensRequest';
import {
  openArmyHQAftermathRecord,
  openArmyHQBriefingForCorps,
  openArmyHQRecordsSubTab,
  openArmyHQTab,
  openChronicle,
  inspectOnField,
  type ShellNavigationState,
} from './shellNavigation';

export function openPresidentialDecisionRoomNavigationTarget(
  target: PresidentialDecisionRoomNavigationTarget,
  state: ShellNavigationState = useGameStore.getState(),
): boolean {
  if (target.kind === 'army-hq-tab') {
    return openArmyHQTab(state, target.tab);
  }
  if (target.kind === 'army-hq-records') {
    return openArmyHQRecordsSubTab(state, target.recordsSubTab);
  }
  if (target.kind === 'army-hq-aftermath-record') {
    return openArmyHQAftermathRecord(state, target.turn);
  }
  if (target.kind === 'army-hq-corps-briefing') {
    return openArmyHQBriefingForCorps(state, target.corpsId);
  }
  if (target.kind === 'counter-offer') {
    return false;
  }
  if (target.kind === 'decision-room') {
    requestDecisionRoomLens(target.lens, null, target.cardId ?? null);
    return true;
  }
  if (target.kind === 'field') {
    return inspectOnField(state, target.target);
  }
  if (target.kind === 'inbox') {
    state.setCodexOpen(false);
    state.setChronicleOpen(false);
    state.setArmyHQOpen(false);
    state.setIsOperationsPanelOpen?.(false);
    state.setSelectedOsid?.(null);
    state.setSelectedFormationId?.(null);
    state.setSelectedCorpsId?.(null);
    state.setSelectedCorpsFrontSectorId?.(null);
    state.setSelectedArmyId(null);
    state.setSelectedArmyHqId?.(null);
    state.setSelectedOperationKey?.(null);
    state.setSelectedOrbatCorpsId?.(null);
    return true;
  }
  if (target.kind === 'chronicle') {
    return openChronicle(state);
  }
  return false;
}
