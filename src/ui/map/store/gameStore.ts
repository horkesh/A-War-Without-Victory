import { create } from 'zustand';
import type { LoadedGameState } from '../data/types';
import { parseGameState } from '../data/GameStateAdapter';

/** Last turn report shape from desktop (advance-turn). Used for succession in FormationDetail. */
export interface LastTurnReport {
  phase?: string;
  turn?: number;
  player_faction?: string | null;
  probe?: string | null;
  details?: {
    officer_succession?: {
      replacements?: Array<{ corps_id: string; old_officer: string; new_officer: string }>;
      casualties?: string[];
      departures?: string[];
    };
  };
}

function buildStateFingerprint(jsonOrText: unknown | string): string | null {
  if (typeof jsonOrText === 'string') return jsonOrText;
  try {
    return JSON.stringify(jsonOrText);
  } catch {
    return null;
  }
}

function isRuntimeProbeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { __AWWV_RUNTIME_PROBE_ACTIVE?: boolean }).__AWWV_RUNTIME_PROBE_ACTIVE);
}

/** Map overlay mode (HOI §3.1, §6). */
export type MapMode = 'political' | 'ethnic' | 'supply' | 'casualties' | 'morale' | 'operations' | 'defense';

/** Single staged order for the current turn (Phase C5). */
export interface StagedOrder {
  id: string;
  type: 'attack' | 'move' | 'posture' | 'sector';
  formationId: string;
  targetOsid?: string;
  postureName?: string;
}

/** Dev mode: enables load-save tools, run-ID input, all-faction view.
 *  Auto-enabled during Vite dev server; otherwise set via ?dev=1 URL param.
 *  Force live mode during dev with ?live=1. */
export function isDevMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  // ?live=1 forces live mode even during Vite dev
  if (params.get('live') === '1') return false;
  // Auto-enable in Vite dev server; explicit opt-in via ?dev=1 in production
  if (import.meta.env.DEV) return true;
  return params.get('dev') === '1';
}

export interface GameStore {
  /** Dev mode flag — unlocks save loaders, run-ID input, and all-faction inspection tools. */
  devMode: boolean;

  selectedOsid: string | null;
  setSelectedOsid: (osid: string | null) => void;

  selectedFormationId: string | null;
  setSelectedFormationId: (id: string | null) => void;

  hoveredOsids: string[];
  setHoveredOsids: (osids: string[]) => void;

  hoveredCorpsId: string | null;
  setHoveredCorpsId: (id: string | null) => void;

  /** Tooltip hover target: type + id (osid string, formation id, front edge_id, or battle osid). */
  tooltipTarget: { type: 'osid' | 'formation' | 'front' | 'battle'; id: string } | null;
  /** Pixel position for tooltip (from map/sidebar hover). */
  tooltipPosition: { x: number; y: number } | null;
  /** Set tooltip target and optional pixel position (e.g. from map/sidebar hover event). */
  setTooltipTargetWithPosition: (target: { type: 'osid' | 'formation' | 'front' | 'battle'; id: string } | null, position?: { x: number; y: number }) => void;
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

  /** Layer visibility toggles (Phase C2 + Phase 5). Persisted in store for re-render stability. */
  frontsVisible: boolean;
  formationsVisible: boolean;
  labelsVisible: boolean;
  sectorsVisible: boolean;
  fogVisible: boolean;
  battlesVisible: boolean;
  /** OSID polygon outlines (`osid-control-outline`) + 1990 mun boundaries (`mun-borders` / bih_adm3_1990); default off. */
  municipalityBordersVisible: boolean;
  /** Ghost Map (1991 census overlay) visibility. */
  ghostMapVisible: boolean;
  setFrontsVisible: (v: boolean) => void;
  setFormationsVisible: (v: boolean) => void;
  setLabelsVisible: (v: boolean) => void;
  setSectorsVisible: (v: boolean) => void;
  setFogVisible: (v: boolean) => void;
  setBattlesVisible: (v: boolean) => void;
  setMunicipalityBordersVisible: (v: boolean) => void;
  setGhostMapVisible: (v: boolean) => void;

  /** Phase C4: When 'attack'/'move'/'sector', next OSID click opens AttackConfirmation or stages move/sector assignment. */
  orderModeForFormation: 'attack' | 'move' | 'sector' | null;
  setOrderModeForFormation: (mode: 'attack' | 'move' | 'sector' | null) => void;

  /** Phase C4: When set, show AttackConfirmation modal; cleared on Confirm or Cancel. */
  pendingAttackConfirmation: { attackerFormationId: string; targetOsid: string } | null;
  setPendingAttackConfirmation: (v: { attackerFormationId: string; targetOsid: string } | null) => void;

  /** Selected corps front sector (click on front line). Mutual exclusion with selectedOsid/selectedFormationId. */
  selectedCorpsFrontSectorId: string | null;
  setSelectedCorpsFrontSectorId: (id: string | null) => void;

  /** Hovered corps front sector (mouse over territory). */
  hoveredSectorId: string | null;
  setHoveredSectorId: (id: string | null) => void;

  expandedStackOsid: string | null;
  setExpandedStackOsid: (osid: string | null) => void;

  /** Selected corps (click on corps header in sidebar). */
  selectedCorpsId: string | null;
  setSelectedCorpsId: (id: string | null) => void;

  /** Selected army / faction (click on faction header in sidebar). */
  selectedArmyId: string | null;
  setSelectedArmyId: (id: string | null) => void;

  /** Army HQ modal state. */
  armyHQOpen: boolean;
  armyHQTab: 'briefing' | 'summary' | 'records' | 'personnel';
  armyHQRecordsSubTab: 'aar' | 'ops';
  armyHQExpandedCorpsId: string | null;
  armyHQExpandedSections: Record<string, boolean>;
  armyHQOfficerSelectionCorpsId: string | null;
  pauseMenuOpen: boolean;
  /** True when the player clicked the Warroom wall calendar — triggers AdvanceTurnModal. */
  advanceTurnPending: boolean;
  setAdvanceTurnPending: (v: boolean) => void;
  setArmyHQOpen: (open: boolean) => void;
  setArmyHQTab: (tab: 'briefing' | 'summary' | 'records' | 'personnel') => void;
  setArmyHQRecordsSubTab: (subTab: 'aar' | 'ops') => void;
  setArmyHQExpandedCorpsId: (id: string | null) => void;
  toggleArmyHQSection: (key: string) => void;
  setArmyHQOfficerSelectionCorpsId: (id: string | null) => void;

  /** Selected army HQ formation (opens ArmyReservePanel as primary). */
  selectedArmyHqId: string | null;
  setSelectedArmyHqId: (id: string | null) => void;

  /** Selected operation (click on operation card in sidebar). Key: `${corps_id}|${name}`. */
  selectedOperationKey: string | null;
  setSelectedOperationKey: (key: string | null) => void;

  /** Selected corps for ORBAT view (secondary pullout). */
  selectedOrbatCorpsId: string | null;
  setSelectedOrbatCorpsId: (id: string | null) => void;

  /** Whether the Operations Panel modal is open. */
  isOperationsPanelOpen: boolean;
  setIsOperationsPanelOpen: (v: boolean) => void;

  /** Whether the Ops Planning Modal (Staff Map) is open. */
  opsPlanningModalOpen: boolean;
  setOpsPlanningModalOpen: (v: boolean) => void;

  /** Ops planning modal — corps-level context */
  opsPlanningCorpsId: string | null;
  opsPlanningOriginSectorId: string | null;
  opsPlanningSelectedOfficerId: string | null;
  setOpsPlanningContext: (corpsId: string, originSectorId: string) => void;
  setOpsPlanningSelectedOfficerId: (id: string | null) => void;
  clearOpsPlanningContext: () => void;

  /** Whether the Commander Selection Modal is open, and for which corps+operation. */
  commanderSelectionContext: { corpsId: string; operationName: string } | null;
  setCommanderSelectionContext: (v: { corpsId: string; operationName: string } | null) => void;

  /** Last officer selected via CommanderSelectionModal — consumed by OpsPlanningModal. */
  lastSelectedOfficerId: string | null;
  setLastSelectedOfficerId: (id: string | null) => void;

  /** Whether the Operation Briefing Modal is open, and for which corps+operation. */
  operationBriefingContext: { corpsId: string; operationName: string } | null;
  setOperationBriefingContext: (v: { corpsId: string; operationName: string } | null) => void;

  /** Minimap visibility toggle. */
  minimapVisible: boolean;
  setMinimapVisible: (v: boolean) => void;

  /** Main map viewport bounds for minimap sync. */
  mapViewport: { bounds: [number, number, number, number]; center: [number, number]; zoom: number } | null;
  setMapViewport: (v: { bounds: [number, number, number, number]; center: [number, number]; zoom: number } | null) => void;

  /** Callback to pan the main map to a center coordinate (registered by MapContainer). */
  panToCenter: ((center: [number, number]) => void) | null;
  setPanToCenter: (fn: ((center: [number, number]) => void) | null) => void;

  /** Callback to pan the main map to an OSID centroid (registered by MapContainer). */
  panToOsid: ((osid: string) => void) | null;
  setPanToOsid: (fn: ((osid: string) => void) | null) => void;

  /** OSIDs to highlight on the map as operation targets (crosshairs, rings, fill). */
  operationTargetOsids: string[];
  setOperationTargetOsids: (osids: string[]) => void;

  loadedGameState: LoadedGameState | null;
  /** Last turn report from desktop (after advance-turn). Used for succession notifications. */
  lastTurnReport: LastTurnReport | null;
  setLastTurnReport: (report: LastTurnReport | null) => void;
  /** Last load error message (cleared when a new load starts or succeeds). */
  loadError: string | null;
  setLoadError: (message: string | null) => void;
  /** Load save: accepts parsed JSON or raw JSON string. Returns Promise that resolves when state is set. Yields before parse so UI can paint loading state. */
  loadSave: (jsonOrText: unknown | string) => Promise<void>;
  /** Load save only when payload fingerprint differs from last applied desktop/browser payload. Returns true if loaded. */
  loadSaveIfChanged: (jsonOrText: unknown | string) => Promise<boolean>;
  /** Fingerprint for latest loaded payload (used for dedupe in desktop session sync). */
  lastLoadedStateFingerprint: string | null;

  /** Staged orders for current turn (Phase C5). */
  stagedOrders: StagedOrder[];
  addStagedOrder: (order: Omit<StagedOrder, 'id'>) => void;
  removeStagedOrder: (id: string) => void;
  clearStagedOrders: () => void;

  /** Position [lng, lat] for the "Ghost Line" interaction preview (move/attack). */
  ghostLinePoint: [number, number] | null;
  setGhostLinePoint: (pt: [number, number] | null) => void;

  /** Whether the peace-to-war transition overlay has been dismissed. */
  peaceWarTransitionSeen: boolean;
  setPeaceWarTransitionSeen: (v: boolean) => void;

  /** Whether the Game Chronicle panel is open. */
  chronicleOpen: boolean;
  setChronicleOpen: (open: boolean) => void;

  /** Whether the Chronicle Wrapped cinematic overlay is open. */
  wrappedOpen: boolean;
  setWrappedOpen: (open: boolean) => void;

  /** Whether the Codex (historical essays) panel is open. */
  codexOpen: boolean;
  setCodexOpen: (open: boolean) => void;

  /** OSID to flash-highlight on the map (brief pulse, auto-clears). Used by ORBAT-map sync. */
  flashOsid: string | null;
  setFlashOsid: (osid: string | null) => void;

  /** Whether the Strategic Dashboard overlay is open. */
  strategicDashboardOpen: boolean;
  setStrategicDashboardOpen: (open: boolean) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  devMode: isDevMode(),

  selectedOsid: null,
  setSelectedOsid: (osid) => set({ selectedOsid: osid, selectedFormationId: null, selectedCorpsFrontSectorId: null, selectedCorpsId: null, selectedArmyId: null, selectedArmyHqId: null, selectedOrbatCorpsId: null }),

  selectedFormationId: null,
  setSelectedFormationId: (id) => set({ selectedFormationId: id, selectedOperationKey: null, selectedOrbatCorpsId: null }),

  hoveredOsids: [],
  setHoveredOsids: (osids) => set({ hoveredOsids: [...new Set(osids)].sort((a, b) => a.localeCompare(b)) }),

  hoveredCorpsId: null,
  setHoveredCorpsId: (id) => set({ hoveredCorpsId: id }),

  hoveredSectorId: null,
  setHoveredSectorId: (id) => set({ hoveredSectorId: id }),

  expandedStackOsid: null,
  setExpandedStackOsid: (osid) => set({ expandedStackOsid: osid }),

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
  fogVisible: true,
  battlesVisible: false,
  municipalityBordersVisible: false,
  ghostMapVisible: false,
  setFrontsVisible: (v) => set({ frontsVisible: v }),
  setFormationsVisible: (v) => set({ formationsVisible: v }),
  setLabelsVisible: (v) => set({ labelsVisible: v }),
  setSectorsVisible: (v) => set({ sectorsVisible: v }),
  setFogVisible: (v) => set({ fogVisible: v }),
  setBattlesVisible: (v) => set({ battlesVisible: v }),
  setMunicipalityBordersVisible: (v) => set({ municipalityBordersVisible: v }),
  setGhostMapVisible: (v) => set({ ghostMapVisible: v }),

  orderModeForFormation: null,
  setOrderModeForFormation: (mode: 'attack' | 'move' | 'sector' | null) => set({ orderModeForFormation: mode }),

  pendingAttackConfirmation: null,
  setPendingAttackConfirmation: (v) => set({ pendingAttackConfirmation: v }),

  selectedCorpsFrontSectorId: null,
  setSelectedCorpsFrontSectorId: (id) => set({ selectedCorpsFrontSectorId: id, selectedFormationId: null, selectedOperationKey: null, selectedOrbatCorpsId: null }),

  selectedCorpsId: null,
  setSelectedCorpsId: (id) => set({ selectedCorpsId: id, selectedArmyId: null, selectedArmyHqId: null, selectedFormationId: null, selectedCorpsFrontSectorId: null, selectedOperationKey: null, selectedOrbatCorpsId: null }),

  selectedArmyId: null,
  setSelectedArmyId: (id) => set({
    selectedArmyId: id,
    armyHQOpen: !!id,
    selectedArmyHqId: null, selectedCorpsId: null, selectedFormationId: null,
    selectedCorpsFrontSectorId: null, selectedOperationKey: null, selectedOrbatCorpsId: null,
  }),

  armyHQOpen: false,
  armyHQTab: 'briefing',
  armyHQRecordsSubTab: 'aar',
  armyHQExpandedCorpsId: null,
  armyHQExpandedSections: {},
  armyHQOfficerSelectionCorpsId: null,
  pauseMenuOpen: false,
  advanceTurnPending: false,
  setAdvanceTurnPending: (v) => set({ advanceTurnPending: v }),
  setArmyHQOpen: (open) => set({
    armyHQOpen: open,
    ...(open ? {} : {
      armyHQExpandedCorpsId: null,
      armyHQExpandedSections: {},
      armyHQOfficerSelectionCorpsId: null,
    }),
  }),
  setArmyHQTab: (tab) => set({
    armyHQTab: tab,
    ...(tab !== 'records' ? { armyHQRecordsSubTab: 'aar' } : {}),
    armyHQExpandedCorpsId: null,
    armyHQExpandedSections: {},
    armyHQOfficerSelectionCorpsId: null,
  }),
  setArmyHQRecordsSubTab: (subTab) => set({
    armyHQTab: 'records',
    armyHQRecordsSubTab: subTab,
    armyHQExpandedCorpsId: null,
    armyHQExpandedSections: {},
    armyHQOfficerSelectionCorpsId: null,
  }),
  setArmyHQExpandedCorpsId: (id) => set({
    armyHQExpandedCorpsId: id,
    armyHQExpandedSections: {},
    armyHQOfficerSelectionCorpsId: null,
  }),
  toggleArmyHQSection: (key) => set((s) => ({
    armyHQExpandedSections: {
      ...s.armyHQExpandedSections,
      [key]: !s.armyHQExpandedSections[key],
    },
  })),
  setArmyHQOfficerSelectionCorpsId: (id) => set({ armyHQOfficerSelectionCorpsId: id }),

  selectedArmyHqId: null,
  setSelectedArmyHqId: (id: string | null) => set({ selectedArmyHqId: id, selectedArmyId: null, selectedCorpsId: null, selectedCorpsFrontSectorId: null, selectedOperationKey: null, selectedOrbatCorpsId: null }),

  selectedOperationKey: null,
  setSelectedOperationKey: (key) => set((state) => (
    key == null
      ? { selectedOperationKey: null }
      : {
        selectedOperationKey: key,
        isOperationsPanelOpen: true,
        selectedCorpsId: null,
        selectedArmyId: null,
        selectedCorpsFrontSectorId: null,
        selectedFormationId: null,
        selectedOrbatCorpsId: null,
      }
  )),

  selectedOrbatCorpsId: null,
  setSelectedOrbatCorpsId: (id) => set({
    selectedOrbatCorpsId: id,
    selectedFormationId: null,
    selectedOsid: null,
    selectedCorpsId: null,
    selectedArmyId: null,
    selectedOperationKey: null,
    selectedCorpsFrontSectorId: null
  }),

  isOperationsPanelOpen: false,
  setIsOperationsPanelOpen: (v) => set({ isOperationsPanelOpen: v }),

  opsPlanningModalOpen: false,
  setOpsPlanningModalOpen: (v) => set({ opsPlanningModalOpen: v }),

  opsPlanningCorpsId: null,
  opsPlanningOriginSectorId: null,
  opsPlanningSelectedOfficerId: null,
  setOpsPlanningContext: (corpsId, originSectorId) => set({
    opsPlanningModalOpen: true,
    opsPlanningCorpsId: corpsId,
    opsPlanningOriginSectorId: originSectorId,
    opsPlanningSelectedOfficerId: null,
  }),
  setOpsPlanningSelectedOfficerId: (id) => set({ opsPlanningSelectedOfficerId: id }),
  clearOpsPlanningContext: () => set({
    opsPlanningModalOpen: false,
    opsPlanningCorpsId: null,
    opsPlanningOriginSectorId: null,
    opsPlanningSelectedOfficerId: null,
  }),

  commanderSelectionContext: null,
  setCommanderSelectionContext: (v) => set({ commanderSelectionContext: v }),

  lastSelectedOfficerId: null,
  setLastSelectedOfficerId: (id) => set({ lastSelectedOfficerId: id }),

  operationBriefingContext: null,
  setOperationBriefingContext: (v) => set({ operationBriefingContext: v }),

  minimapVisible: true,
  setMinimapVisible: (v) => set({ minimapVisible: v }),

  mapViewport: null,
  setMapViewport: (v) => set({ mapViewport: v }),

  panToCenter: null,
  setPanToCenter: (fn) => set({ panToCenter: fn }),

  panToOsid: null,
  setPanToOsid: (fn) => set({ panToOsid: fn }),

  operationTargetOsids: [],
  setOperationTargetOsids: (osids) => set({ operationTargetOsids: [...new Set(osids)] }),

  loadedGameState: null,

  lastTurnReport: null,
  setLastTurnReport: (report) => set({ lastTurnReport: report }),

  loadError: null,
  lastLoadedStateFingerprint: null,

  setLoadError: (message) => set({ loadError: message }),

  loadSave: (jsonOrText: unknown | string) => {
    return new Promise<void>((resolve, reject) => {
      set({ loadError: null });
      // Yield once so "Loading..." can paint, but do not rely exclusively on
      // requestIdleCallback: Electron can starve idle work during scenario init.
      const schedule = (fn: () => void) => {
        if (isRuntimeProbeActive()) {
          queueMicrotask(fn);
          return;
        }
        let fired = false;
        const run = () => {
          if (fired) return;
          fired = true;
          fn();
        };

        const fallbackTimer = setTimeout(run, 0);
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => {
            clearTimeout(fallbackTimer);
            run();
          }, { timeout: 150 });
          return;
        }
      };

      schedule(() => {
        const fingerprint = buildStateFingerprint(jsonOrText);
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
            set({ loadedGameState: state, loadError: null, lastLoadedStateFingerprint: fingerprint });
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
  loadSaveIfChanged: async (jsonOrText: unknown | string) => {
    const nextFingerprint = buildStateFingerprint(jsonOrText);
    const currentFingerprint = useGameStore.getState().lastLoadedStateFingerprint;
    if (nextFingerprint != null && currentFingerprint === nextFingerprint) {
      return false;
    }
    await useGameStore.getState().loadSave(jsonOrText);
    return true;
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

  ghostLinePoint: null,
  setGhostLinePoint: (pt) => set({ ghostLinePoint: pt }),

  peaceWarTransitionSeen: false,
  setPeaceWarTransitionSeen: (v) => set({ peaceWarTransitionSeen: v }),

  chronicleOpen: false,
  setChronicleOpen: (open) => set({ chronicleOpen: open }),

  wrappedOpen: false,
  setWrappedOpen: (open) => set({ wrappedOpen: open }),

  codexOpen: false,
  setCodexOpen: (open) => set({ codexOpen: open }),

  flashOsid: null,
  setFlashOsid: (osid) => set({ flashOsid: osid }),

  strategicDashboardOpen: false,
  setStrategicDashboardOpen: (open) => set({ strategicDashboardOpen: open }),
}));
