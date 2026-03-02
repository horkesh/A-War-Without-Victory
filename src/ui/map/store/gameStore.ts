import { create } from 'zustand';
import type { LoadedGameState } from '../data/types';
import { parseGameState } from '../data/GameStateAdapter';

/** Map overlay mode (HOI §3.1, §6). */
export type MapMode = 'political' | 'ethnic' | 'supply' | 'pressure' | 'density';

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
  sectorsVisible: boolean;
  setFrontsVisible: (v: boolean) => void;
  setFormationsVisible: (v: boolean) => void;
  setLabelsVisible: (v: boolean) => void;
  setSectorsVisible: (v: boolean) => void;

  /** Phase C4: When 'attack', next OSID click opens AttackConfirmation instead of selecting OSID. */
  orderModeForFormation: 'attack' | null;
  setOrderModeForFormation: (mode: 'attack' | null) => void;

  /** Phase C4: When set, show AttackConfirmation modal; cleared on Confirm or Cancel. */
  pendingAttackConfirmation: { attackerFormationId: string; targetOsid: string } | null;
  setPendingAttackConfirmation: (v: { attackerFormationId: string; targetOsid: string } | null) => void;

  /** Selected corps front sector (click on front line). Mutual exclusion with selectedOsid/selectedFormationId. */
  selectedCorpsFrontSectorId: string | null;
  setSelectedCorpsFrontSectorId: (id: string | null) => void;

  /** Selected corps (click on corps header in sidebar). */
  selectedCorpsId: string | null;
  setSelectedCorpsId: (id: string | null) => void;

  loadedGameState: LoadedGameState | null;
  /** Last load error message (cleared when a new load starts or succeeds). */
  loadError: string | null;
  setLoadError: (message: string | null) => void;
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
  sectorsVisible: true,
  setFrontsVisible: (v) => set({ frontsVisible: v }),
  setFormationsVisible: (v) => set({ formationsVisible: v }),
  setLabelsVisible: (v) => set({ labelsVisible: v }),
  setSectorsVisible: (v) => set({ sectorsVisible: v }),

  orderModeForFormation: null,
  setOrderModeForFormation: (mode) => set({ orderModeForFormation: mode }),

  pendingAttackConfirmation: null,
  setPendingAttackConfirmation: (v) => set({ pendingAttackConfirmation: v }),

  selectedCorpsFrontSectorId: null,
  setSelectedCorpsFrontSectorId: (id) => set({ selectedCorpsFrontSectorId: id, selectedOsid: null, selectedFormationId: null }),

  selectedCorpsId: null,
  setSelectedCorpsId: (id) => set({ selectedCorpsId: id, selectedOsid: null, selectedFormationId: null, selectedCorpsFrontSectorId: null }),

  loadedGameState: null,

  loadError: null,

  setLoadError: (message) => set({ loadError: message }),

  loadSave: (jsonOrText: unknown | string) => {
    return new Promise<void>((resolve, reject) => {
      set({ loadError: null });
      // Yield to the browser so "Loading..." can paint, then parse in idle (or after short timeout).
      const schedule = typeof requestIdleCallback !== 'undefined'
        ? (fn: () => void) => requestIdleCallback(fn, { timeout: 150 })
        : (fn: () => void) => setTimeout(fn, 0);

      schedule(() => {
        let state: LoadedGameState;
        try {
          const json =
            typeof jsonOrText === 'string'
              ? JSON.parse(jsonOrText as string)
              : jsonOrText;
          state = parseGameState(json);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          set({ loadError: message });
          console.error('[gameStore] Failed to parse save:', e);
          reject(e);
          return;
        }
        // Apply state in next tick so we don't block after parse.
        queueMicrotask(() => {
          try {
            set({ loadedGameState: state, loadError: null });
            console.log(`[gameStore] Loaded save: ${state.label} — ${state.formations.length} formations, ${Object.keys(state.controlBySettlement).length} control entries`);
            resolve();
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            set({ loadError: message });
            reject(e);
          }
        });
      });
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
