import { create } from 'zustand';
import type { LoadedGameState } from '../data/types';
import { parseGameState } from '../data/GameStateAdapter';
import { shouldMarkPeaceWarTransitionSeenOnLoad } from '../data/peaceWarTransitionGate';
import type { TurnAftermathView } from '../data/turnAftermath';
import type { ArmyHQRecordsSubTab } from '../../shared/shellHandoff';
import type { FieldInspectionTarget } from '../utils/fieldInspectionTarget';
import type { ReplaySaveManifest } from '../../../sim/replay/replay_manifest';
import type { GameState as RawGameState } from '../../../state/game_state';

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
export type MapMode = 'political' | 'ethnic' | 'supply' | 'casualties' | 'morale' | 'operations' | 'defense' | 'authority' | 'legitimacy';

/** Single staged order for the current turn (Phase C5). */
export interface StagedOrder {
  id: string;
  type: 'attack' | 'posture' | 'sector';
  formationId: string;
  targetOsid?: string;
  targetSectorId?: string;
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

/** Diagnostics mode: surfaces raw internal IDs and unlock diagnostics that must
 *  NEVER leak to players or dev:map playtesters. Distinct from {@link isDevMode}:
 *  it is NOT auto-enabled by the Vite dev server. Requires an explicit `?diag=1`
 *  URL opt-in so the legit developer-diagnostics path stays available while
 *  `dev:map` (which runs with import.meta.env.DEV true) does not expose raw IDs. */
export function isDiagMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('diag') === '1';
}

export interface GameStore {
  /** Dev mode flag — unlocks save loaders, run-ID input, and all-faction inspection tools. */
  devMode: boolean;

  /** Diagnostics flag — surfaces raw internal IDs / unlock diagnostics. Requires explicit
   *  `?diag=1` opt-in; NOT auto-enabled by dev:map. Keep separate from devMode so dev:map
   *  playtesters never see raw event IDs. */
  diagMode: boolean;

  selectedOsid: string | null;
  setSelectedOsid: (osid: string | null) => void;
  setSelectedOsidInSector: (osid: string, sectorId: string) => void;

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

  /** Phase C4: When 'attack'/'sector', next OSID click opens AttackConfirmation or stages sector assignment. */
  orderModeForFormation: 'attack' | 'sector' | null;
  setOrderModeForFormation: (mode: 'attack' | 'sector' | null) => void;

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
  armyHQRecordsSubTab: ArmyHQRecordsSubTab;
  /** Completed operation AAR id to expand in Army HQ Records -> Operation History. */
  focusedOperationHistoryId: string | null;
  /** Decision consequence id to focus in Army HQ Records -> Decision Consequences. */
  focusedDecisionConsequenceId: string | null;
  armyHQExpandedCorpsId: string | null;
  armyHQExpandedSections: Record<string, boolean>;
  armyHQOfficerSelectionCorpsId: string | null;
  pauseMenuOpen: boolean;
  /** True when the player clicked the Warroom wall calendar — triggers AdvanceTurnModal. */
  advanceTurnPending: boolean;
  setAdvanceTurnPending: (v: boolean) => void;

  /** Presidential Inbox: opening brief dismissed flag */
  openingBriefDismissed: boolean;
  openingBriefDismissedFaction: string | null;
  setOpeningBriefDismissed: (v: boolean) => void;
  /** Force inbox panel open (from toolbar badge click) */
  forceInboxOpen: boolean;
  setForceInboxOpen: (v: boolean) => void;
  setArmyHQOpen: (open: boolean) => void;
  setArmyHQTab: (tab: 'briefing' | 'summary' | 'records' | 'personnel') => void;
  setArmyHQRecordsSubTab: (subTab: ArmyHQRecordsSubTab) => void;
  setFocusedOperationHistoryId: (id: string | null) => void;
  setFocusedDecisionConsequenceId: (id: string | null) => void;
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

  /** Atomic tactical-field drilldown. Used when a route must preserve paired context. */
  inspectOnFieldTarget: (target: FieldInspectionTarget) => void;

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
  /** Active replay map-inspection overlay. Null means the map is showing the live/final loaded save. */
  replayInspection: {
    frameIndex: number;
    turn: number;
    date: string | null;
    finalTurn: number;
    finalDate: string | null;
  } | null;
  /** Final/endgame UI state to restore after read-only replay map inspection. */
  replayInspectionReturnState: LoadedGameState | null;
  /** Swap the UI read model to a replay frame for map inspection. Does not advance or mutate sim state. */
  startReplayInspection: (frame: RawGameState, frameIndex: number) => void;
  /** Restore the final/endgame UI state after replay map inspection. */
  exitReplayInspection: () => void;
  /**
   * LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: optional sidecar carrying
   * the per-turn GameState snapshots produced by the scenario harness's
   * `finalizeReplaySaveSequence()` (file: `replay_save_sequence.json`).
   * Set by the desktop IPC channel `replay-sequence-updated` BEFORE
   * `loadSave` runs, then merged into `LoadedGameState.replaySaveSequence`
   * by `parseGameState` so the VerdictScreen Replay tab sees a single
   * coherent loaded state. Null when absent (live sessions, older saves).
   */
  pendingReplaySaveSequence: ReadonlyArray<unknown> | null;
  setPendingReplaySaveSequence: (sequence: ReadonlyArray<unknown> | null) => void;
  pendingReplaySaveManifest: ReplaySaveManifest | null;
  setPendingReplaySaveManifest: (manifest: ReplaySaveManifest | null) => void;
  /** Last turn report from desktop (after advance-turn). Used for succession notifications. */
  lastTurnReport: LastTurnReport | null;
  setLastTurnReport: (report: LastTurnReport | null) => void;
  /** Player-facing after-action bridge opened immediately after a successful turn advance. */
  turnAftermath: TurnAftermathView | null;
  turnAftermathOpen: boolean;
  focusedAftermathTurn: number | null;
  setTurnAftermath: (view: TurnAftermathView | null) => void;
  setTurnAftermathOpen: (open: boolean) => void;
  setFocusedAftermathTurn: (turn: number | null) => void;
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
  /** Decision consequence id to focus after routing from Records into Chronicle. */
  focusedChronicleDecisionRecordId: string | null;
  setFocusedChronicleDecisionRecordId: (id: string | null) => void;

  /** Whether the Chronicle Wrapped cinematic overlay is open. */
  wrappedOpen: boolean;
  setWrappedOpen: (open: boolean) => void;

  /** Whether the Codex (historical essays) panel is open. */
  codexOpen: boolean;
  setCodexOpen: (open: boolean) => void;

  /** OSID to flash-highlight on the map (brief pulse, auto-clears). Used by ORBAT-map sync. */
  flashOsid: string | null;
  setFlashOsid: (osid: string | null) => void;

}

const CLEARED_ENTITY_SELECTIONS = {
  selectedOsid: null,
  selectedFormationId: null,
  selectedCorpsFrontSectorId: null,
  selectedCorpsId: null,
  selectedArmyId: null,
  selectedArmyHqId: null,
  selectedOperationKey: null,
  selectedOrbatCorpsId: null,
} as const;

const CLEARED_OPERATION_CONTEXT = {
  isOperationsPanelOpen: false,
  operationTargetOsids: [] as string[],
};

export const useGameStore = create<GameStore>((set, get) => ({
  devMode: isDevMode(),
  diagMode: isDiagMode(),

  selectedOsid: null,
  setSelectedOsid: (osid) => set(osid == null
    ? { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT }
    : osid.trim().length === 0
      ? { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT }
    : { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT, selectedOsid: osid }),
  setSelectedOsidInSector: (osid, sectorId) => set({
    ...CLEARED_ENTITY_SELECTIONS,
    ...CLEARED_OPERATION_CONTEXT,
    selectedOsid: osid,
    selectedCorpsFrontSectorId: sectorId,
  }),

  selectedFormationId: null,
  setSelectedFormationId: (id) => set(id == null
    ? { selectedFormationId: null }
    : {
      ...CLEARED_ENTITY_SELECTIONS,
      ...CLEARED_OPERATION_CONTEXT,
      selectedFormationId: id,
    }),

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
  setOrderModeForFormation: (mode: 'attack' | 'sector' | null) => set({ orderModeForFormation: mode }),

  pendingAttackConfirmation: null,
  setPendingAttackConfirmation: (v) => set({ pendingAttackConfirmation: v }),

  selectedCorpsFrontSectorId: null,
  setSelectedCorpsFrontSectorId: (id) => set(id == null
    ? { selectedCorpsFrontSectorId: null }
    : { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT, selectedCorpsFrontSectorId: id }),

  selectedCorpsId: null,
  setSelectedCorpsId: (id) => set(id == null
    ? { selectedCorpsId: null }
    : { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT, selectedCorpsId: id }),

  selectedArmyId: null,
  setSelectedArmyId: (id) => set(id == null
    ? { selectedArmyId: null, armyHQOpen: false }
    : { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT, selectedArmyId: id, armyHQOpen: true }),

  armyHQOpen: false,
  armyHQTab: 'briefing',
  armyHQRecordsSubTab: 'aftermath',
  focusedOperationHistoryId: null,
  focusedDecisionConsequenceId: null,
  armyHQExpandedCorpsId: null,
  armyHQExpandedSections: {},
  armyHQOfficerSelectionCorpsId: null,
  pauseMenuOpen: false,
  advanceTurnPending: false,
  setAdvanceTurnPending: (v) => set({ advanceTurnPending: v }),
  openingBriefDismissed: false,
  openingBriefDismissedFaction: null,
  setOpeningBriefDismissed: (v) => set((state) => ({
    openingBriefDismissed: v,
    openingBriefDismissedFaction: v ? state.loadedGameState?.player_faction ?? null : null,
  })),
  forceInboxOpen: false,
  setForceInboxOpen: (v) => set({ forceInboxOpen: v }),
  setArmyHQOpen: (open) => set({
    armyHQOpen: open,
    ...(open ? {} : {
      armyHQTab: 'briefing',
      armyHQExpandedCorpsId: null,
      armyHQExpandedSections: {},
      armyHQOfficerSelectionCorpsId: null,
      focusedAftermathTurn: null,
      focusedOperationHistoryId: null,
      focusedDecisionConsequenceId: null,
      focusedChronicleDecisionRecordId: null,
    }),
  }),
  setArmyHQTab: (tab) => set({
    armyHQTab: tab,
    ...(tab !== 'records' ? { armyHQRecordsSubTab: 'aftermath' } : {}),
    ...(tab !== 'records' ? { focusedAftermathTurn: null } : {}),
    ...(tab !== 'records' ? { focusedOperationHistoryId: null } : {}),
    ...(tab !== 'records' ? { focusedDecisionConsequenceId: null } : {}),
    armyHQExpandedCorpsId: null,
    armyHQExpandedSections: {},
    armyHQOfficerSelectionCorpsId: null,
  }),
  setArmyHQRecordsSubTab: (subTab) => set({
    armyHQTab: 'records',
    armyHQRecordsSubTab: subTab,
    ...(subTab === 'aftermath' ? {} : { focusedAftermathTurn: null }),
    ...(subTab === 'ops' ? {} : { focusedOperationHistoryId: null }),
    ...(subTab === 'decisions' ? {} : { focusedDecisionConsequenceId: null }),
    armyHQExpandedCorpsId: null,
    armyHQExpandedSections: {},
    armyHQOfficerSelectionCorpsId: null,
  }),
  setFocusedOperationHistoryId: (id) => set({ focusedOperationHistoryId: id }),
  setFocusedDecisionConsequenceId: (id) => set({ focusedDecisionConsequenceId: id }),
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
  setSelectedArmyHqId: (id: string | null) => set(id == null
    ? { selectedArmyHqId: null }
    : { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT, selectedArmyHqId: id }),

  selectedOperationKey: null,
  setSelectedOperationKey: (key) => set((
    key == null
      ? { selectedOperationKey: null, ...CLEARED_OPERATION_CONTEXT }
      : {
        ...CLEARED_ENTITY_SELECTIONS,
        selectedOperationKey: key,
        isOperationsPanelOpen: true,
      }
  )),

  selectedOrbatCorpsId: null,
  setSelectedOrbatCorpsId: (id) => set(id == null
    ? { selectedOrbatCorpsId: null }
    : { ...CLEARED_ENTITY_SELECTIONS, ...CLEARED_OPERATION_CONTEXT, selectedOrbatCorpsId: id }),

  inspectOnFieldTarget: (target) => {
    const base = {
      ...CLEARED_ENTITY_SELECTIONS,
      armyHQOpen: false,
      armyHQTab: 'briefing' as const,
      armyHQExpandedCorpsId: null,
      armyHQExpandedSections: {},
      armyHQOfficerSelectionCorpsId: null,
      focusedAftermathTurn: null,
      focusedOperationHistoryId: null,
      focusedDecisionConsequenceId: null,
      focusedChronicleDecisionRecordId: null,
      codexOpen: false,
      chronicleOpen: false,
      opsPlanningModalOpen: false,
      operationTargetOsids: [] as string[],
    };
    if (target.kind === 'field-settlement') {
      set({ ...base, isOperationsPanelOpen: false, selectedOsid: target.osid });
      return;
    }
    if (target.kind === 'field-sector') {
      set({
        ...base,
        isOperationsPanelOpen: false,
        selectedCorpsFrontSectorId: target.sectorId,
        selectedOsid: target.osid ?? null,
      });
      return;
    }
    if (target.kind === 'field-sector-in-corps') {
      set({
        ...base,
        isOperationsPanelOpen: false,
        selectedCorpsFrontSectorId: target.sectorId,
        selectedCorpsId: target.corpsId,
        selectedOsid: target.osid ?? null,
      });
      return;
    }
    if (target.kind === 'field-formation') {
      set({ ...base, isOperationsPanelOpen: false, selectedFormationId: target.formationId });
      return;
    }
    if (target.kind === 'field-formation-at-settlement') {
      set({
        ...base,
        isOperationsPanelOpen: false,
        selectedFormationId: target.formationId,
        selectedOsid: target.osid,
      });
      return;
    }
    if (target.kind === 'field-formation-in-sector') {
      set({
        ...base,
        isOperationsPanelOpen: false,
        selectedFormationId: target.formationId,
        selectedCorpsFrontSectorId: target.sectorId,
      });
      return;
    }
    if (target.kind === 'field-formation-in-corps') {
      set({
        ...base,
        isOperationsPanelOpen: false,
        selectedFormationId: target.formationId,
        selectedCorpsId: target.corpsId,
      });
      return;
    }
    if (target.kind === 'field-formation-in-army-reserve') {
      set({
        ...base,
        isOperationsPanelOpen: false,
        selectedFormationId: target.formationId,
        selectedArmyHqId: target.armyHqId,
      });
      return;
    }
    set({
      ...base,
      isOperationsPanelOpen: true,
      selectedOperationKey: target.operationKey,
    });
  },

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
  replayInspection: null,
  replayInspectionReturnState: null,
  startReplayInspection: (frame, frameIndex) => {
    const current = get().loadedGameState;
    if (!current) return;
    const finalState = get().replayInspectionReturnState ?? current;
    let inspected: LoadedGameState;
    try {
      inspected = parseGameState(frame, {
        ...(finalState.replaySaveSequence ? { replaySaveSequence: finalState.replaySaveSequence } : {}),
        ...(finalState.replaySaveManifest ? { replaySaveManifest: finalState.replaySaveManifest } : {}),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ loadError: message });
      return;
    }

    set({
      loadedGameState: inspected,
      replayInspectionReturnState: finalState,
      replayInspection: {
        frameIndex,
        turn: inspected.turn,
        date: inspected.metadata?.date ?? null,
        finalTurn: finalState.turn,
        finalDate: finalState.metadata?.date ?? null,
      },
      selectedOsid: null,
      selectedFormationId: null,
      selectedCorpsId: null,
      selectedCorpsFrontSectorId: null,
      selectedArmyId: null,
      selectedArmyHqId: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
      orderModeForFormation: null,
      pendingAttackConfirmation: null,
      stagedOrders: [],
      operationTargetOsids: [],
      ghostLinePoint: null,
      flashOsid: null,
      tooltipTarget: null,
      tooltipPosition: null,
      loadError: null,
    });
  },
  exitReplayInspection: () => {
    const finalState = get().replayInspectionReturnState;
    if (!finalState) {
      set({ replayInspection: null });
      return;
    }
    set({
      loadedGameState: finalState,
      replayInspection: null,
      replayInspectionReturnState: null,
      selectedOsid: null,
      selectedFormationId: null,
      selectedCorpsId: null,
      selectedCorpsFrontSectorId: null,
      selectedArmyId: null,
      selectedArmyHqId: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
      orderModeForFormation: null,
      pendingAttackConfirmation: null,
      stagedOrders: [],
      operationTargetOsids: [],
      ghostLinePoint: null,
      flashOsid: null,
      tooltipTarget: null,
      tooltipPosition: null,
    });
  },

  // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: sidecar staging slot. The
  // desktop IPC layer pushes this before/with `loadSave`; `loadSave` merges
  // it into the resulting LoadedGameState via `parseGameState(json, opts)`.
  pendingReplaySaveSequence: null,
  setPendingReplaySaveSequence: (sequence) => set({ pendingReplaySaveSequence: sequence }),
  pendingReplaySaveManifest: null,
  setPendingReplaySaveManifest: (manifest) => set({ pendingReplaySaveManifest: manifest }),

  lastTurnReport: null,
  setLastTurnReport: (report) => set({ lastTurnReport: report }),
  turnAftermath: null,
  turnAftermathOpen: false,
  focusedAftermathTurn: null,
  setTurnAftermath: (view) => set({ turnAftermath: view }),
  setTurnAftermathOpen: (open) => set({ turnAftermathOpen: open }),
  setFocusedAftermathTurn: (turn) => set({ focusedAftermathTurn: turn }),

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
        const previousLoadedGameState = get().loadedGameState;
        let state: LoadedGameState;
        try {
          const json =
            typeof jsonOrText === 'string'
              ? JSON.parse(jsonOrText as string)
              : jsonOrText;
          // Pre-check: verify basic GameState shape before full adapter parse.
          // This gives a clearer error than a deep adapter crash on malformed input.
          if (json == null || typeof json !== 'object' || Array.isArray(json)) {
            throw new Error('Save file does not contain a valid game state object.');
          }
          const candidate = json as Record<string, unknown>;
          if (!candidate.meta || typeof candidate.meta !== 'object') {
            throw new Error('Save file is missing required game data (no meta block). Ensure this is a valid AWWV save.');
          }
          // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: read sidecar from
          // store (set by IPC `replay-sequence-updated` channel) and merge.
          // Validated minimally — must be an array; deeper shape is checked by
          // the read-only `replayPlayer()` consumer downstream.
          const pendingSequence = (get().pendingReplaySaveSequence ?? null) as ReadonlyArray<unknown> | null;
          const pendingManifest = get().pendingReplaySaveManifest;
          state = parseGameState(json, {
            ...(pendingSequence ? { replaySaveSequence: pendingSequence } : {}),
            ...(pendingManifest ? { replaySaveManifest: pendingManifest } : {}),
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          set({
            loadError: message,
            pendingReplaySaveSequence: null,
            pendingReplaySaveManifest: null,
          });
          console.error('[gameStore] Failed to parse save:', e);
          reject(e);
          return;
        }
        // Apply state in next tick so we don't block after parse.
        queueMicrotask(() => {
          try {
            const previousOpeningBriefFaction = get().openingBriefDismissedFaction;
            const keepOpeningBriefDismissed =
              get().openingBriefDismissed &&
              previousOpeningBriefFaction != null &&
              previousOpeningBriefFaction === (state.player_faction ?? null);
            set({
              loadedGameState: state,
              replayInspection: null,
              replayInspectionReturnState: null,
              pendingReplaySaveSequence: null,
              pendingReplaySaveManifest: null,
              loadError: null,
              lastLoadedStateFingerprint: fingerprint,
              // ── Post-load UI state reset ──
              // Selection state holds references to entities from the previous save.
              // A different save may not contain those IDs — stale references cause
              // ghost panels, broken detail views, and confusing player state.
              openingBriefDismissed: keepOpeningBriefDismissed,
              openingBriefDismissedFaction: keepOpeningBriefDismissed ? previousOpeningBriefFaction : null,
              selectedOsid: null,
              selectedFormationId: null,
              selectedCorpsId: null,
              selectedCorpsFrontSectorId: null,
              selectedArmyId: null,
              selectedArmyHqId: null,
              selectedOperationKey: null,
              selectedOrbatCorpsId: null,
              hoveredOsids: [],
              hoveredCorpsId: null,
              hoveredSectorId: null,
              expandedStackOsid: null,
              // Modal state: close all modals that reference save-specific entities
              orderModeForFormation: null,
              pendingAttackConfirmation: null,
              armyHQOpen: false,
              armyHQExpandedCorpsId: null,
              armyHQExpandedSections: {},
              armyHQOfficerSelectionCorpsId: null,
              opsPlanningModalOpen: false,
              opsPlanningCorpsId: null,
              opsPlanningOriginSectorId: null,
              opsPlanningSelectedOfficerId: null,
              commanderSelectionContext: null,
              operationBriefingContext: null,
              isOperationsPanelOpen: false,
              // Staged orders are for the old save's turn — invalid after load
              stagedOrders: [],
              // Transition overlay: only a live peace->war handoff should arm it.
              peaceWarTransitionSeen: shouldMarkPeaceWarTransitionSeenOnLoad(previousLoadedGameState, state),
              // Tooltip: clear to avoid stale hover references
              tooltipTarget: null,
              tooltipPosition: null,
              // Operation target highlights from the old save
              operationTargetOsids: [],
              // Ghost line from stale interaction
              ghostLinePoint: null,
              // Flash highlight from stale ORBAT-map sync
              flashOsid: null,
              // Turn aftermath belongs to the previous save/turn payload.
              turnAftermath: null,
              turnAftermathOpen: false,
              focusedAftermathTurn: null,
              focusedOperationHistoryId: null,
              // #244: a stale focused-decision id from the previous save makes
              // DecisionConsequenceRecordsPanel fall back to the unbounded
              // (MAX_SAFE_INTEGER) ledger build. The id is cleared on tab/subtab/
              // close but NOT on save-load/replay reset — clear it here too.
              focusedDecisionConsequenceId: null,
              focusedChronicleDecisionRecordId: null,
            });
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
    const store = useGameStore.getState();
    const currentFingerprint = store.lastLoadedStateFingerprint;
    const hasPendingReplaySidecar =
      store.pendingReplaySaveSequence != null
      || store.pendingReplaySaveManifest != null;
    if (nextFingerprint != null && currentFingerprint === nextFingerprint && !hasPendingReplaySidecar) {
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
  setChronicleOpen: (open) => set({
    chronicleOpen: open,
    ...(open ? {} : { focusedChronicleDecisionRecordId: null }),
  }),
  focusedChronicleDecisionRecordId: null,
  setFocusedChronicleDecisionRecordId: (id) => set({ focusedChronicleDecisionRecordId: id }),

  wrappedOpen: false,
  setWrappedOpen: (open) => set({ wrappedOpen: open }),

  codexOpen: false,
  setCodexOpen: (open) => set({ codexOpen: open }),

  flashOsid: null,
  setFlashOsid: (osid) => set({ flashOsid: osid }),
}));
