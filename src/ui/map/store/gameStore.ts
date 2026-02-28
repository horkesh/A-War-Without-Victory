import { create } from 'zustand';
import type { LoadedGameState } from '../data/types';
import { parseGameState } from '../data/GameStateAdapter';

export interface GameStore {
  selectedOsid: string | null;
  setSelectedOsid: (osid: string | null) => void;

  selectedFormationId: string | null;
  setSelectedFormationId: (id: string | null) => void;

  hoveredOsids: string[];
  setHoveredOsids: (osids: string[]) => void;

  /** OSID → display name from operational_settlements; null until map data loaded */
  osidDisplayNames: Record<string, string> | null;
  setOsidDisplayNames: (map: Record<string, string> | null) => void;

  loadedGameState: LoadedGameState | null;
  loadSave: (json: unknown) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  selectedOsid: null,
  setSelectedOsid: (osid) => set({ selectedOsid: osid, selectedFormationId: null }),

  selectedFormationId: null,
  setSelectedFormationId: (id) => set({ selectedFormationId: id, selectedOsid: null }),

  hoveredOsids: [],
  setHoveredOsids: (osids) => set({ hoveredOsids: [...new Set(osids)].sort((a, b) => a.localeCompare(b)) }),

  osidDisplayNames: null,
  setOsidDisplayNames: (map) => set({ osidDisplayNames: map }),

  loadedGameState: null,

  loadSave: (json: unknown) => {
    try {
      const state = parseGameState(json);
      set({ loadedGameState: state });
      console.log(`[gameStore] Loaded save: ${state.label} — ${state.formations.length} formations, ${Object.keys(state.controlBySettlement).length} control entries`);
    } catch (e) {
      console.error('[gameStore] Failed to parse save:', e);
    }
  },
}));
