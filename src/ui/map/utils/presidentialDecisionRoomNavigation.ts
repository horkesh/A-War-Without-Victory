import type { PresidentialDecisionRoomNavigationTarget } from '../data/presidentialDecisionRoom';
import { useGameStore } from '../store/gameStore';
import {
  openArmyHQAftermathRecord,
  openArmyHQBriefingForCorps,
  openArmyHQRecordsSubTab,
  openArmyHQTab,
  openChronicle,
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
  if (target.kind === 'chronicle') {
    return openChronicle(state);
  }
  return false;
}
