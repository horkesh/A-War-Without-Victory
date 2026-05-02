import { useGameStore } from '../store/gameStore';
import type { TurnAftermathView } from '../data/turnAftermath';
import type { LastTurnReport } from '../store/gameStore';
import type { LoadedGameState } from '../data/types';

export interface TurnAftermathAdvanceDeps {
  getCurrentState: () => LoadedGameState | null;
  getOsidNameMap: () => Record<string, string> | null;
  setLastTurnReport: (report: LastTurnReport | null) => void;
  setTurnAftermath: (view: TurnAftermathView | null) => void;
  setTurnAftermathOpen: (open: boolean) => void;
}

export function getTurnAftermathAdvanceDeps(): TurnAftermathAdvanceDeps {
  return {
    getCurrentState: () => useGameStore.getState().loadedGameState,
    getOsidNameMap: () => useGameStore.getState().osidDisplayNames,
    setLastTurnReport: (report) => useGameStore.getState().setLastTurnReport(report),
    setTurnAftermath: (view) => useGameStore.getState().setTurnAftermath(view),
    setTurnAftermathOpen: (open) => useGameStore.getState().setTurnAftermathOpen(open),
  };
}
