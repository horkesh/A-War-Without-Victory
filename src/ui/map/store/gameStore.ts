import { create } from 'zustand';
import type { LoadedGameState } from '../data/types';
import { parseGameState } from '../data/GameStateAdapter';

/** Map overlay mode (HOI §3.1, §6). Ethnic/Supply/Pressure use same as political until data/layers exist. */
export type MapMode = 'political' | 'ethnic' | 'supply' | 'pressure';

/** Single staged order for the current turn (Phase C5). */
export interface StagedOrder {
  id: string;
  type: 'attack' | 'move' | 'posture';
  formationId: string;
  targetOsid?: string;
  postureName?: string;
}

export interface GameStore {
  selectedOsid: string | null;
  setSelectedOsid: (osid: string | null) => void;

  selectedFormationId: string | null;
  setSelectedFormationId: (id: string | null) => void;

  hoveredOsids: string[];
  setHoveredOsids: (osids: string[]) => void;

  /** Tooltip hover target: type + id (osid string, formation id, or front edge_id). */
  tooltipTarget: { type: 'osid' | 'formation' | 'front'; id: string } | null;
  /** Pixel position for tooltip (from map/sidebar hover). */
  tooltipPosition: { x: number; y: number } | null;
  setTooltipTarget: (target: { type: 'osid' | 'formation' | 'front'; id: string } | null) => void;
  /** Set tooltip target and optional pixel position (e.g. from map/sidebar hover event). */
  setTooltipTargetWithPosition: (target: { type: 'osid' | 'formation' | 'front'; id: string } | null, position?: { x: number; y: number }) => void;
  clearTooltipTarget: () => void;

  /** OSID → display name from operational_settlements; null until map data loaded */
  osidDisplayNames: Record<string, string> | null;
  setOsidDisplayNames: (map: Record<string, string> | null) => void;

  /** OSID → feature properties from operational_settlements (for tooltips); null until loaded */
  osidPropertiesMap: Record<string, Record<string, unknown>> | null;
  setOsidPropertiesMap: (map: Record<string, Record<string, unknown>> | null) => void;

  /** Map mode: Political Control / Ethnic / Supply / Front Pressure (Phase C2) */
  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;

  /** Optional callback for Enter key: confirm primary action (e.g. confirm modal). Phase C3/C4. */
  confirmPrimaryAction: (() => void) | null;
  setConfirmPrimaryAction: (fn: (() => void) | null) => void;

  /** Layer visibility toggles (Phase C2). Persisted in store for re-render stability. */
  frontsVisible: boolean;
  formationsVisible: boolean;
  labelsVisible: boolean;
  setFrontsVisible: (v: boolean) => void;
  setFormationsVisible: (v: boolean) => void;
  setLabelsVisible: (v: boolean) => void;

  /** Phase C4: When 'attack', next OSID click opens AttackConfirmation instead of selecting OSID. */
  orderModeForFormation: 'attack' | null;
  setOrderModeForFormation: (mode: 'attack' | null) => void;

  /** Phase C4: When set, show AttackConfirmation modal; cleared on Confirm or Cancel. */
  pendingAttackConfirmation: { attackerFormationId: string; targetOsid: string } | null;
  setPendingAttackConfirmation: (v: { attackerFormationId: string; targetOsid: string } | null) => void;

  loadedGameState: LoadedGameState | null;
  /** Load save: accepts parsed JSON or raw JSON string. Returns Promise that resolves when state is set. Yields before parse so UI can paint loading state. */
  loadSave: (jsonOrText: unknown | string) => Promise<void>;

  /** Staged orders for current turn (Phase C5). */
  stagedOrders: StagedOrder[];
  addStagedOrder: (order: Omit<StagedOrder, 'id'>) => void;
  removeStagedOrder: (id: string) => void;
  clearStagedOrders: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  selectedOsid: null,
  setSelectedOsid: (osid) => set({ selectedOsid: osid, selectedFormationId: null }),

  selectedFormationId: null,
  setSelectedFormationId: (id) => set({ selectedFormationId: id, selectedOsid: null }),

  hoveredOsids: [],
  setHoveredOsids: (osids) => set({ hoveredOsids: [...new Set(osids)].sort((a, b) => a.localeCompare(b)) }),

  tooltipTarget: null,
  tooltipPosition: null,
  setTooltipTarget: (target) => set({ tooltipTarget: target }),
  setTooltipTargetWithPosition: (target, position) =>
    set({ tooltipTarget: target, tooltipPosition: target != null && position ? position : null }),
  clearTooltipTarget: () => set({ tooltipTarget: null, tooltipPosition: null }),

  osidDisplayNames: null,
  setOsidDisplayNames: (map) => set({ osidDisplayNames: map }),

  osidPropertiesMap: null,
  setOsidPropertiesMap: (map) => set({ osidPropertiesMap: map }),

  mapMode: 'political',
  setMapMode: (mode) => set({ mapMode: mode }),

  confirmPrimaryAction: null,
  setConfirmPrimaryAction: (fn) => set({ confirmPrimaryAction: fn }),

  frontsVisible: true,
  formationsVisible: true,
  labelsVisible: true,
  setFrontsVisible: (v) => set({ frontsVisible: v }),
  setFormationsVisible: (v) => set({ formationsVisible: v }),
  setLabelsVisible: (v) => set({ labelsVisible: v }),

  orderModeForFormation: null,
  setOrderModeForFormation: (mode) => set({ orderModeForFormation: mode }),

  pendingAttackConfirmation: null,
  setPendingAttackConfirmation: (v) => set({ pendingAttackConfirmation: v }),

  loadedGameState: null,

  loadSave: (jsonOrText: unknown | string) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        let state: LoadedGameState;
        try {
          const json =
            typeof jsonOrText === 'string'
              ? JSON.parse(jsonOrText as string)
              : jsonOrText;
          state = parseGameState(json);
        } catch (e) {
          console.error('[gameStore] Failed to parse save:', e);
          reject(e);
          return;
        }
        requestAnimationFrame(() => {
          try {
            set({ loadedGameState: state });
            console.log(`[gameStore] Loaded save: ${state.label} — ${state.formations.length} formations, ${Object.keys(state.controlBySettlement).length} control entries`);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }, 0);
    });
  },

  stagedOrders: [],
  addStagedOrder: (order) =>
    set((state) => ({
      stagedOrders: [
        ...state.stagedOrders,
        { ...order, id: `staged_${state.stagedOrders.length}_${order.formationId}_${order.type}` },
      ],
    })),
  removeStagedOrder: (id) =>
    set((state) => ({
      stagedOrders: state.stagedOrders.filter((o) => o.id !== id),
    })),
  clearStagedOrders: () => set({ stagedOrders: [] }),
}));
