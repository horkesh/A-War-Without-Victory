import { useEffect, useRef, useState } from 'react';
import { MapContainer } from './map/MapContainer';
import { PresidentialToolbar } from './components/PresidentialToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { CorpsFrontPanel } from './components/CorpsFrontPanel';
import { FormationDetail } from './components/FormationDetail';
import { ArmyReservePanel } from './components/ArmyReservePanel';
import { CorpsDetail } from './components/CorpsDetail';
// ArmyDetail retired — faction click opens Army HQ modal directly
import { ArmyHQModal } from './components/army_hq/ArmyHQModal';
import { Minimap } from './components/Minimap';
import { BottomStatusStrip } from './components/BottomStatusStrip';
import { OOBSidebar } from './components/OOBSidebar';
import { OperationsPanel } from './components/OperationsPanel';
import { OrbatPanel } from './components/OrbatPanel';
import { OrderQueue } from './components/OrderQueue';
import { Tooltip } from './components/Tooltip';
import { AttackConfirmation } from './components/AttackConfirmation';
import { SidePickerOverlay } from './components/SidePickerOverlay';
import { RecruitmentModal } from './components/RecruitmentModal';
import { WarSummaryModal } from './components/WarSummaryModal';
import { TurnAftermathModal } from './components/TurnAftermathModal';
import { OpsPlanningModal } from './components/ops_modal/OpsPlanningModal';
import { CommanderSelectionModal } from './components/CommanderSelectionModal';
import { OperationBriefingModal } from './components/OperationBriefingModal';
import { SupplyPanel } from './components/SupplyPanel';
import { EconomyPanel } from './components/EconomyPanel';
import { EnclaveDashboard } from './components/EnclaveDashboard';
import { EventModal } from './components/EventModal';
import { EventLogPanel } from './components/EventLogPanel';
import { AiAdvisorPanel } from './components/AiAdvisorPanel';
import { AiSettingsPanel } from './components/AiSettingsPanel';
import { AutonomyPanel } from './components/AutonomyPanel';
import { PresidentialInbox } from './components/PresidentialInbox';
import type { EventDisplayData } from './components/EventModal';
import type { EventLogEntry } from './components/EventLogPanel';
import { CommandBriefingLayer } from './components/CommandBriefingLayer';
import { PeacePlanModal } from './components/PeacePlanModal';
import { ParamilitaryReviewModal } from './components/ParamilitaryReviewModal';
import { EventDecisionModal } from './components/EventDecisionModal';
import { ConvoyDecisionModal } from './components/ConvoyDecisionModal';
import { ReserveRequestModal } from './components/ReserveRequestModal';
import { OfficerMatterModal } from './components/OfficerMatterModal';
import { IntelligenceBriefModal } from './components/IntelligenceBriefModal';
import { CounterOfferModal } from './components/CounterOfferModal';
import { DaytonNegotiationModal } from './components/DaytonNegotiationModal';
import { DiplomacyPanel } from './components/DiplomacyPanel';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import { SettingsScreen } from './components/SettingsScreen';
import { CreditsScreen } from './components/CreditsScreen';
import { MapModeLegend } from './components/MapModeLegend';
import { PeaceStatusPanel } from './components/PeaceStatusPanel';
import { PeaceWarTransition } from './components/PeaceWarTransition';
import { ChronicleOverlay } from './components/chronicle/ChronicleOverlay';
import { WrappedOverlay } from './components/chronicle/WrappedOverlay';
import { CodexPanel } from './components/CodexPanel';
import { CoachmarkLayer } from './components/CoachmarkLayer';
import { OnboardingOverlay, shouldShowOnboarding } from './components/onboarding';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { LoadErrorToast } from './components/LoadErrorToast';
import { VerdictScreen } from './components/VerdictScreen';
import { ReplayInspectionBanner } from './components/replay/ReplayInspectionBanner';
import { StrategicDashboard } from './components/StrategicDashboard';
import { AudioCueObserver } from './components/AudioCueObserver';
import { WarroomShellLayer } from './components/warroom/WarroomShellLayer';
import { AdvanceTurnModal } from './components/warroom/AdvanceTurnModal';
import { WarroomStatusBar } from './components/warroom/WarroomStatusBar';
import { PresidentDeskShell } from './components/presidential_desk/PresidentDeskShell';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { derivePanelRailState, shouldRenderInboxPanel, shouldRenderTacticalDetailRails } from './components/panelRail';
import { useGameStore, isDevMode } from './store/gameStore';
import { loadLatestRunSaveAsText, loadEventDefinitions, loadEventDefinitionsFull } from './data/DataLoader';
import type { EventDefinition } from '../../sim/events/event_types';
import { getOsidDisplayName } from './utils/osidDisplayName';
import { getFormationsAtOsid } from './utils/formationAtOsid';
import { getPlayerSafeMilitaryFactionName } from './utils/playerSafeText';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDesktopSession } from './hooks/useDesktopSession';
import { useIPC } from './desktop/useIPC';
import { resolvePlayerFacingFaction } from '../shared/playerVisibility';
import type { RecruitmentCatalogBrigade, StartNewCampaignPayload } from './desktop/types';
import type { LoadedGameState, SummaryFocusSection } from './data/types';
import type { InboxItem } from './data/inboxItems';
import type { PreAdvanceCommandReviewItem } from './data/preAdvanceCommandReview';
import type { PresidentialDecisionRoomNavigationTarget } from './data/presidentialDecisionRoom';
import { shouldShowPeaceWarTransition } from './data/peaceWarTransitionGate';
import { applyShellHandoffCommand, openArmyHQRecordsSubTab, openArmyHQTab, openChronicle, openCodex, warroomCommandStaysInRoom } from './utils/shellNavigation';
import { openPresidentialDecisionRoomNavigationTarget } from './utils/presidentialDecisionRoomNavigation';
import { isWarroomLocalCommand } from './utils/warroomNavigation';
import { getPeacePlanDismissalKey, shouldShowPeacePlanModal } from './utils/peacePlanDismissal';
import { decodeShellHandoffCommand, isShellHandoffCommand, type ArmyHQRecordsSubTab } from '../shared/shellHandoff';
import {
  applyRecruitmentAndSync,
  fetchRecruitmentCatalog,
  startCampaignFromSidePicker,
} from './desktop/campaignRecruitmentActions';

declare global {
  interface Window {
    handleManualSaveLoad?: (json: unknown) => Promise<void>;
    handleContinueLastRun?: () => Promise<void>;
  }
}

type PendingEventDecisionView = NonNullable<LoadedGameState['pendingEventDecisions']>[number];

function comparePendingEventDecisionPriority(a: PendingEventDecisionView, b: PendingEventDecisionView): number {
  const aRequired = a.requires_player_response === true ? 0 : 1;
  const bRequired = b.requires_player_response === true ? 0 : 1;
  if (aRequired !== bRequired) return aRequired - bRequired;
  if (a.turn_fired !== b.turn_fired) return a.turn_fired - b.turn_fired;
  if (a.event_id < b.event_id) return -1;
  if (a.event_id > b.event_id) return 1;
  return 0;
}

function selectNextPendingEventDecision(
  decisions: LoadedGameState['pendingEventDecisions'],
  playerFaction: string | null,
  excludedEventId: string | null = null,
): PendingEventDecisionView | null {
  if (!playerFaction) return null;
  const playerDecisions = (decisions ?? [])
    .filter((decision) => decision.faction === playerFaction)
    .filter((decision) => decision.event_id !== excludedEventId)
    .sort(comparePendingEventDecisionPriority);
  return playerDecisions[0] ?? null;
}

function CommanderSelectionModalWrapper() {
  const ctx = useGameStore((s) => s.commanderSelectionContext);
  const setCtx = useGameStore((s) => s.setCommanderSelectionContext);
  const ipc = useIPC();

  const handleSelect = async (officerId: string) => {
    if (!ctx) return;
    useGameStore.getState().setLastSelectedOfficerId(officerId);
    try {
      const result = await ipc.stageAssignOperationCommander({
        corpsId: ctx.corpsId,
        operationName: ctx.operationName,
        officerId,
      });
      if (!result.ok) {
        console.warn('[CommanderSelection] assign failed (likely safe if draft):', result.error);
      }
    } catch (err) {
      console.warn('[CommanderSelection] assign error:', err);
    }
    setCtx(null);
  };

  return (
    <CommanderSelectionModal
      isOpen={!!ctx}
      onClose={() => setCtx(null)}
      onSelect={handleSelect}
    />
  );
}

function OperationBriefingModalWrapper() {
  const ctx = useGameStore((s) => s.operationBriefingContext);
  const close = useGameStore((s) => s.setOperationBriefingContext);
  const ipc = useIPC();

  if (!ctx) return <OperationBriefingModal isOpen={false} onClose={() => close(null)} />;

  const handleDecision = (decision: 'launch' | 'postpone' | 'abort' | 'probe') => {
    ipc.stageOperationDecision({ corpsId: ctx.corpsId, operationName: ctx.operationName, decision });
    close(null);
  };

  const handleForceLaunch = async () => {
    const result = await ipc.stageOperationForceLaunch({ corpsId: ctx.corpsId, operationName: ctx.operationName });
    if (!result.ok) useGameStore.getState().setLoadError(result.error ?? 'Failed to force-launch operation.');
    close(null);
  };

  return (
    <OperationBriefingModal
      isOpen
      onClose={() => close(null)}
      onLaunch={() => handleDecision('launch')}
      onPostpone={() => handleDecision('postpone')}
      onAbort={() => handleDecision('abort')}
      onOrderProbe={() => handleDecision('probe')}
      onForceLaunch={() => void handleForceLaunch()}
    />
  );
}

function CodexPanelWrapper({
  eventCatalog,
}: {
  eventCatalog?: ReadonlyMap<string, EventDefinition>;
}) {
  const codexOpen = useGameStore((s) => s.codexOpen);
  const setCodexOpen = useGameStore((s) => s.setCodexOpen);
  // Phase H Packet 7 — supply the catalog + raw GameState to activate the
  // H5 Unlock State section. Both inputs are required; when either is
  // absent the section gracefully degrades and the panel renders exactly
  // as before.
  const rawGameState = useGameStore((s) => s.loadedGameState?.rawGameState);
  return (
    <CodexPanel
      isOpen={codexOpen}
      onClose={() => setCodexOpen(false)}
      eventCatalog={eventCatalog}
      state={rawGameState}
    />
  );
}

function StrategicDashboardWrapper() {
  const open = useGameStore((s) => s.strategicDashboardOpen);
  if (!open) return null;
  return <StrategicDashboard />;
}

function OnboardingOverlayWrapper() {
  // v0.9.2 tutorial onboarding skeleton (LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON).
  //
  // Single-owner mount of the OnboardingOverlay. Reads `tutorial_state` from
  // the loaded UI state shape (mirrored from `meta.tutorial_state`); writes
  // through the canonical IPC bridge so persistence flows through the same
  // serializer as autonomy/proposal writes.
  //
  // Faction-agnostic: no `player_faction` gate. Visibility is owned by
  // `shouldShowOnboarding` inside OnboardingOverlay (treats absent state as
  // "not yet dismissed").
  const tutorialState = useGameStore((s) => s.loadedGameState?.tutorial_state);
  const ipc = useIPC();
  // LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1: bridge now exposes restart action.
  const bridge = ipc.isAvailable
    ? {
        dismissTutorial: () => ipc.dismissTutorial(),
        advanceStep: (stepId: string) => ipc.advanceTutorialStep(stepId),
        restartTutorial: () => ipc.restartTutorial(),
      }
    : null;
  return <OnboardingOverlay tutorialState={tutorialState} ipc={bridge} />;
}

function PeaceWarTransitionOverlay() {
  const state = useGameStore((s) => s.loadedGameState);
  const seen = useGameStore((s) => s.peaceWarTransitionSeen);
  const setSeen = useGameStore((s) => s.setPeaceWarTransitionSeen);

  if (!state || !shouldShowPeaceWarTransition(state, seen)) return null;

  return <PeaceWarTransition state={state} onDismiss={() => setSeen(true)} />;
}

function App() {
  // Phase C3: single key handler (Enter, 1–5, Escape)
  useKeyboardShortcuts();
  useDesktopSession();
  const ipc = useIPC();
  const devMode = useGameStore((s) => s.devMode);

  const pendingAttackConfirmation = useGameStore((s) => s.pendingAttackConfirmation);
  const setPendingAttackConfirmation = useGameStore((s) => s.setPendingAttackConfirmation);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const selectedArmyHqId = useGameStore((s) => s.selectedArmyHqId);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedCorpsFrontSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedOperationKey = useGameStore((s) => s.selectedOperationKey);
  const selectedOrbatCorpsId = useGameStore((s) => s.selectedOrbatCorpsId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const setConfirmPrimaryAction = useGameStore((s) => s.setConfirmPrimaryAction);
  const loadSave = useGameStore((s) => s.loadSave);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const loadError = useGameStore((s) => s.loadError);
  const turnAftermath = useGameStore((s) => s.turnAftermath);
  const turnAftermathOpen = useGameStore((s) => s.turnAftermathOpen);
  const setTurnAftermathOpen = useGameStore((s) => s.setTurnAftermathOpen);
  const peaceWarTransitionSeen = useGameStore((s) => s.peaceWarTransitionSeen);
  const playerFaction = resolvePlayerFacingFaction(loadedGameState);
  const peaceWarTransitionActive = shouldShowPeaceWarTransition(loadedGameState, peaceWarTransitionSeen);
  const onboardingActive = Boolean(
    loadedGameState
      && !peaceWarTransitionActive
      && shouldShowOnboarding(loadedGameState.tutorial_state),
  );
  const mapMode = useGameStore((s) => s.mapMode);
  const isOperationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const armyHQOpen = useGameStore((s) => s.armyHQOpen);
  const codexOpen = useGameStore((s) => s.codexOpen);
  const chronicleOpen = useGameStore((s) => s.chronicleOpen);
  const railState = derivePanelRailState({
    selectedOsid,
    selectedArmyId,
    selectedArmyHqId,
    selectedCorpsId,
    selectedCorpsFrontSectorId,
    selectedFormationId,
    selectedOperationKey,
    selectedOrbatCorpsId,
  });
  const tacticalDetailRailsVisible = shouldRenderTacticalDetailRails({
    operationsPanelOpen: isOperationsPanelOpen,
    armyHQOpen,
    codexOpen,
    chronicleOpen,
  });

  const [appScreen, setAppScreen] = useState<'game' | 'mainMenu' | 'warroom'>('game');
  const pauseOpen = useGameStore((s) => s.pauseMenuOpen);
  const setPauseOpen = (v: boolean) => useGameStore.setState({ pauseMenuOpen: v });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [sidePickerOpen, setSidePickerOpen] = useState(false);
  const [sidePickerDismissed, setSidePickerDismissed] = useState(false);
  const [campaignStarting, setCampaignStarting] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocusSection>('overview');
  const [enclaveDashboardOpen, setEnclaveDashboardOpen] = useState(false);
  const [eventLogOpen, setEventLogOpen] = useState(false);
  const [economyOpen, setEconomyOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [autonomyPanelOpen, setAutonomyPanelOpen] = useState(false);
  const [diplomacyOpen, setDiplomacyOpen] = useState(false);
  const [aiAdvisorOpen, setAiAdvisorOpen] = useState(false);
  const [aiAdvisorResponse, setAiAdvisorResponse] = useState<any>(null);
  const [eventQueue, setEventQueue] = useState<EventDisplayData[]>([]);
  const [eventQueueIndex, setEventQueueIndex] = useState(0);
  const [acknowledgedEventIds, setAcknowledgedEventIds] = useState<Set<string>>(new Set());
  const [dismissedPeacePlanKey, setDismissedPeacePlanKey] = useState<string | null>(null);
  const [paramilitaryReviewOpen, setParamilitaryReviewOpen] = useState(false);
  /** Active blocking event decision id surfaced as a modal. `null` = no modal.
   *  Set by (a) inbox click on `event_modal` action, or (b) the auto-launch effect
   *  below when a new turn surfaces pending decisions for the player faction. */
  const [activeEventDecisionId, setActiveEventDecisionId] = useState<string | null>(null);
  const [selectedReserveRequestId, setSelectedReserveRequestId] = useState<string | null>(null);
  const [selectedOfficerMatterId, setSelectedOfficerMatterId] = useState<string | null>(null);
  const [selectedIntelligenceBriefId, setSelectedIntelligenceBriefId] = useState<string | null>(null);
  const [selectedCounterOfferId, setSelectedCounterOfferId] = useState<string | null>(null);
  const [recentlyAcceptedEventDecisionId, setRecentlyAcceptedEventDecisionId] = useState<string | null>(null);
  const [selectedConvoyDecisionId, setSelectedConvoyDecisionId] = useState<string | null>(null);
  const [recruitmentLoading, setRecruitmentLoading] = useState(false);
  const [recruitmentApplying, setRecruitmentApplying] = useState(false);
  const [recruitmentCatalog, setRecruitmentCatalog] = useState<RecruitmentCatalogBrigade[]>([]);
  const recruitmentCatalogRequestId = useRef(0);
  const initialShellHandoffApplied = useRef(false);

  /**
   * Phase H Packet 7 — runtime catalog of full canonical `EventDefinition`
   * records, loaded once at app boot from
   * `/data/scenarios/events/{war_1992..war_1995,consequences}.json`.
   * Used by the four Phase H bridges:
   *   - EventDecisionModal (H3 Decision Context family/source/dossier)
   *   - CodexPanel (H5 Unlock State family/source-tier per row)
   *   - BranchTagBadgeRow (H4 sets_flags walk; mounted in BottomStatusStrip)
   *   - generateWrappedSlides (H6 causality slides — F1/F2/F3)
   * `undefined` until the fetch resolves; bridges degrade gracefully.
   */
  const [eventCatalogFull, setEventCatalogFull] = useState<ReadonlyMap<string, EventDefinition> | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    loadEventDefinitionsFull()
      .then((catalog) => {
        if (cancelled) return;
        setEventCatalogFull(catalog);
      })
      .catch((err) => {
        // Non-fatal: bridges already degrade gracefully when catalog is absent.
        console.warn('[PhaseH] Failed to load event catalog:', err);
      });
    return () => { cancelled = true; };
  }, []);

  // Reset dismissal/acknowledgement state when a new save is loaded.
  // Without this, stale flags from a previous save hide real pending items.
  const stateFingerprint = useGameStore((s) => s.lastLoadedStateFingerprint);
  useEffect(() => {
    setDismissedPeacePlanKey(null);
    setAcknowledgedEventIds(new Set());
    setActiveEventDecisionId(null);
    setRecentlyAcceptedEventDecisionId(null);
  }, [stateFingerprint]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('panel') === 'diplomacy' || params.get('diplomacy') === '1') {
      setDiplomacyOpen(true);
    }
  }, []);

  // C4.3: Combat odds — call existing query-combat-estimate when modal opens; show "—" if unavailable.
  // Phase 5 could add a dedicated combat-estimate IPC if needed; we use existing query-combat-estimate only.
  const [combatOdds, setCombatOdds] = useState('—');
  useEffect(() => {
    if (!pendingAttackConfirmation) {
      setCombatOdds('—');
      setConfirmPrimaryAction(null);
      return;
    }
    const { attackerFormationId, targetOsid } = pendingAttackConfirmation;
    setCombatOdds('—');
    ipc.queryCombatEstimate(attackerFormationId, targetOsid).then((r) => {
      if (r?.ok && r.win_probability != null) {
        setCombatOdds(`${Math.round(r.win_probability * 100)}% win`);
      } else {
        setCombatOdds('—');
      }
    }).catch(() => setCombatOdds('—'));
  }, [pendingAttackConfirmation, setConfirmPrimaryAction]);

  useEffect(() => {
    if (loadedGameState) {
      setSidePickerOpen(false);
      setSidePickerDismissed(false);
      return;
    }
    // Show side picker automatically if no state is loaded and not already dismissed
    if (!sidePickerDismissed) {
      setSidePickerOpen(true);
    }
  }, [ipc.isAvailable, loadedGameState, sidePickerDismissed]);

  // Live mode: auto-load latest run save on startup (browser-only, not Electron)
  useEffect(() => {
    if (isDevMode()) return;
    if (ipc.isAvailable) return; // Electron — useDesktopSession handles state
    if (loadedGameState) return; // already loaded
    (async () => {
      try {
        const text = await loadLatestRunSaveAsText();
        const json = JSON.parse(text);
        await loadSave(json);
      } catch (err) {
        console.error('[Live] Failed to auto-load latest save:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  // Dev: ?showPanel=1 shows the selection panel with a placeholder OSID for layout verification
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('showPanel') === '1') {
      useGameStore.getState().setSelectedOsid('S1');
    }
  }, []);

  // Global handler for manual save load (called by SidePickerOverlay)
  useEffect(() => {
    window.handleManualSaveLoad = async (json: unknown) => {
      try {
        await loadSave(json);
        setSidePickerOpen(false);
        setSidePickerDismissed(false);
      } catch (err) {
        console.error('Failed to load manual save:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    };
    window.handleContinueLastRun = async () => {
      try {
        const text = await loadLatestRunSaveAsText();
        const json: unknown = JSON.parse(text);
        await loadSave(json);
        setSidePickerOpen(false);
        setSidePickerDismissed(false);
      } catch (err) {
        console.error('Failed to continue last run:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    };
    return () => {
      delete window.handleManualSaveLoad;
      delete window.handleContinueLastRun;
    };
  }, [loadSave, setLoadError]);

  // v0.4.1 Phase 5: detect new events from game state and queue for display
  // Only show in live gameplay (Electron IPC), not dev map inspection
  useEffect(() => {
    if (!ipc.isAvailable) return;
    if (!loadedGameState) return;
    const fired = loadedGameState.firedEvents;
    if (!fired || fired.length === 0) return;

    // Find events not yet acknowledged
    const newEvents = fired.filter(e => !acknowledgedEventIds.has(e.id) && !e.isDecision);
    if (newEvents.length === 0) return;

    // Load full definitions to enrich title/narrative/category
    let stale = false;
    loadEventDefinitions().then(defs => {
      if (stale) return; // Effect re-ran before promise resolved — discard
      const displayData: EventDisplayData[] = newEvents.map(e => {
        const def = defs.get(e.id);
        return {
          id: e.id,
          title: def?.title ?? e.title,
          narrative: def?.narrative ?? e.narrative ?? '',
          category: def?.category ?? e.category ?? 'military',
          effects: def?.effects?.map(eff => ({
            kind: eff.kind,
            description: eff.text ?? (eff.faction ? `${getPlayerSafeMilitaryFactionName(eff.faction)} ${eff.kind} ${(eff.delta ?? 0) > 0 ? '+' : ''}${eff.delta ?? ''}` : eff.kind),
          })) ?? e.effects,
          isDecision: false,
        };
      });

      // Only show if we have new events that aren't already in queue
      if (displayData.length > 0 && eventQueue.length === 0) {
        setEventQueue(displayData);
        setEventQueueIndex(0);
      }
    });
    return () => { stale = true; };
  }, [loadedGameState?.turn, loadedGameState?.firedEvents?.length]);

  const pendingPeacePlan = loadedGameState?.pendingPeacePlan;
  const showPeacePlanModal = shouldShowPeacePlanModal(pendingPeacePlan, dismissedPeacePlanKey);

  // v0.9 presidential design: auto-launch the EventDecisionModal for the first
  // blocking event decision when a new turn surfaces one. Memory:
  // [[player_identity_and_command]] — "Goal is to play as president, making such
  // decisions that then impact the war through different modifiers." The modal
  // is dismissible only via response, so the IPC respond path is the only exit.
  useEffect(() => {
    if (activeEventDecisionId !== null) return;
    if (showPeacePlanModal) return;
    const nextDecision = selectNextPendingEventDecision(
      loadedGameState?.pendingEventDecisions,
      playerFaction,
      recentlyAcceptedEventDecisionId,
    );
    if (nextDecision) setActiveEventDecisionId(nextDecision.event_id);
  }, [loadedGameState?.pendingEventDecisions, playerFaction, activeEventDecisionId, showPeacePlanModal, recentlyAcceptedEventDecisionId]);

  useEffect(() => {
    if (activeEventDecisionId === null) return;
    const stillPending = (loadedGameState?.pendingEventDecisions ?? [])
      .some((decision) => decision.event_id === activeEventDecisionId && decision.faction === playerFaction);
    if (!stillPending) {
      setActiveEventDecisionId(null);
    }
  }, [loadedGameState?.pendingEventDecisions, playerFaction, activeEventDecisionId]);

  useEffect(() => {
    if (recentlyAcceptedEventDecisionId === null) return;
    const stillPending = (loadedGameState?.pendingEventDecisions ?? [])
      .some((decision) => decision.event_id === recentlyAcceptedEventDecisionId && decision.faction === playerFaction);
    if (!stillPending) {
      setRecentlyAcceptedEventDecisionId(null);
    }
  }, [loadedGameState?.pendingEventDecisions, playerFaction, recentlyAcceptedEventDecisionId]);

  // Auto-dismiss non-decision events after 4 seconds
  useEffect(() => {
    if (eventQueue.length === 0) return;
    const current = eventQueue[eventQueueIndex];
    if (!current || current.isDecision) return;
    const timer = setTimeout(() => {
      // Inline dismiss logic to avoid stale closure over handleEventAcknowledge
      setAcknowledgedEventIds(prev => new Set(prev).add(current.id));
      if (eventQueueIndex < eventQueue.length - 1) {
        setEventQueueIndex(eventQueueIndex + 1);
      } else {
        setEventQueue([]);
        setEventQueueIndex(0);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [eventQueue, eventQueueIndex]);

  const handleEventAcknowledge = () => {
    const current = eventQueue[eventQueueIndex];
    if (current) {
      setAcknowledgedEventIds(prev => new Set(prev).add(current.id));
    }
    if (eventQueueIndex < eventQueue.length - 1) {
      setEventQueueIndex(eventQueueIndex + 1);
    } else {
      setEventQueue([]);
      setEventQueueIndex(0);
    }
  };

  // Build event log entries from fired events
  const eventLogEntries: EventLogEntry[] = (loadedGameState?.firedEvents ?? []).map(e => ({
    turn: e.turn,
    title: e.title,
    category: e.category || 'military',
    effectsSummary: e.effects.map(ef => ef.description).filter(Boolean).join('; '),
  }));

  // Phase C4: Attack confirmation modal payload and render
  const attackerFormation = pendingAttackConfirmation && loadedGameState
    ? loadedGameState.formations.find((f) => f.id === pendingAttackConfirmation.attackerFormationId)
    : null;
  const targetDisplayName = pendingAttackConfirmation
    ? getOsidDisplayName(pendingAttackConfirmation.targetOsid, osidDisplayNames)
    : '';
  const defendersAtTarget = pendingAttackConfirmation && loadedGameState
    ? getFormationsAtOsid(loadedGameState.formations, pendingAttackConfirmation.targetOsid).sort((a, b) => a.id.localeCompare(b.id))
    : [];
  const defenderFormation = defendersAtTarget[0] ?? null;
  const terrainSummary = pendingAttackConfirmation && osidPropertiesMap?.[pendingAttackConfirmation.targetOsid]
    ? String((osidPropertiesMap[pendingAttackConfirmation.targetOsid].terrain ?? osidPropertiesMap[pendingAttackConfirmation.targetOsid].zone_type) ?? '—')
    : '—';

  const submitAttackOrder = (attackerFormationId: string, targetOsid: string, onDone: () => void) => {
    ipc.stageAttackOrder(attackerFormationId, targetOsid).then((r) => {
      if (!r.ok) console.warn('[AttackConfirmation] stageAttackOrder failed:', r.error);
      onDone();
    }).catch((err) => {
      console.warn('[AttackConfirmation] stageAttackOrder error:', err);
      onDone();
    });
  };

  const handleAttackConfirm = () => {
    if (!pendingAttackConfirmation) return;
    const { attackerFormationId, targetOsid } = pendingAttackConfirmation;
    submitAttackOrder(attackerFormationId, targetOsid, () => setPendingAttackConfirmation(null));
  };

  const handleAttackCancel = () => {
    setPendingAttackConfirmation(null);
  };

  // When modal is open, Enter confirms (read from store to avoid stale closure)
  useEffect(() => {
    if (!pendingAttackConfirmation) {
      setConfirmPrimaryAction(null);
      return;
    }
    setConfirmPrimaryAction(() => {
      const state = useGameStore.getState();
      const pending = state.pendingAttackConfirmation;
      if (!pending) return;
      submitAttackOrder(
        pending.attackerFormationId,
        pending.targetOsid,
        () => useGameStore.getState().setPendingAttackConfirmation(null)
      );
    });
    return () => setConfirmPrimaryAction(null);
  }, [pendingAttackConfirmation, setConfirmPrimaryAction, ipc]);

  const refreshRecruitmentCatalog = async () => {
    if (!ipc.isAvailable) return;
    const requestId = ++recruitmentCatalogRequestId.current;
    setRecruitmentLoading(true);
    const catalog = await fetchRecruitmentCatalog({ ipc, setLoadError });
    if (requestId !== recruitmentCatalogRequestId.current) return;
    setRecruitmentCatalog(catalog);
    setRecruitmentLoading(false);
  };

  const openRecruitmentModal = () => {
    setRecruitmentOpen(true);
    void refreshRecruitmentCatalog();
  };

  const handleSelectFaction = async (faction: StartNewCampaignPayload['playerFaction']) => {
    setCampaignStarting(true);
    // Use scenarioKey 'apr_1992' as default for dev map, mirroring Warroom fix
    const ok = await startCampaignFromSidePicker({ ipc, loadSave, setLoadError }, faction, 'apr_1992');
    setCampaignStarting(false);
    if (ok) {
      setSidePickerOpen(false);
      setSidePickerDismissed(false);
      setRecruitmentCatalog([]);
    }
  };

  const handleApplyRecruitment = async (brigadeId: string, equipmentClass: string) => {
    setRecruitmentApplying(true);
    const ok = await applyRecruitmentAndSync({
      ipc,
      loadSave,
      setLoadError,
      brigadeId,
      equipmentClass,
    });
    setRecruitmentApplying(false);
    if (ok) {
      setRecruitmentOpen(false);
      void refreshRecruitmentCatalog();
    }
  };

  const openSummary = (focus: SummaryFocusSection = 'overview') => {
    setSummaryFocus(focus);
    setSummaryOpen(true);
    setEventLogOpen(false);
  };

  // Keyboard shortcuts for Army HQ tabs + orphaned modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger in input/select/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        const gs = useGameStore.getState();
        if (gs.armyHQOpen) { gs.setArmyHQOpen(false); return; }
        // Route through canonical shellNavigation helper — no direct setter sequences.
        openArmyHQTab(gs, 'briefing');
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const gs = useGameStore.getState();
        if (gs.armyHQOpen) { gs.setArmyHQTab('summary'); return; }
        // Map-first: open WarSummaryModal on the tactical map instead of Army HQ
        openSummary();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEventLogOpen(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const gs = useGameStore.getState();
        gs.setChronicleOpen(!gs.chronicleOpen);
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        const gs = useGameStore.getState();
        gs.setCodexOpen(!gs.codexOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openOrbat = () => {
    // If no corps selected for orbat, pick the first player corps
    if (!useGameStore.getState().selectedOrbatCorpsId && loadedGameState && playerFaction) {
      const firstCorps = loadedGameState.formations.find(f => (f.kind === 'corps' || f.kind === 'corps_asset') && f.faction === playerFaction);
      if (firstCorps) useGameStore.getState().setSelectedOrbatCorpsId(firstCorps.id);
    }
    setSummaryOpen(false);
  };

  const openArmyHQRecords = (subTab: ArmyHQRecordsSubTab) => {
    openArmyHQRecordsSubTab(useGameStore.getState(), subTab);
    setSummaryOpen(false);
    setEventLogOpen(false);
  };

  const reviewPreAdvancePriorities = () => {
    const gs = useGameStore.getState();
    openArmyHQTab(gs, 'briefing');
    setAppScreen('game');
    setSummaryOpen(false);
    setEventLogOpen(false);
  };

  const reviewPreAdvanceItem = (item: PreAdvanceCommandReviewItem) => {
    if (item.navigationTarget.kind === 'counter-offer') {
      setSelectedCounterOfferId(item.navigationTarget.counterOfferId);
      setAppScreen('game');
      setSummaryOpen(false);
      setEventLogOpen(false);
      return;
    }
    openPresidentialDecisionRoomNavigationTarget(item.navigationTarget, useGameStore.getState());
    setAppScreen('game');
    setSummaryOpen(false);
    setEventLogOpen(false);
  };

  const reviewPreAdvanceTarget = (target: PresidentialDecisionRoomNavigationTarget) => {
    if (target.kind === 'counter-offer') {
      setSelectedCounterOfferId(target.counterOfferId);
      setAppScreen('game');
      setSummaryOpen(false);
      setEventLogOpen(false);
      return;
    }
    openPresidentialDecisionRoomNavigationTarget(target, useGameStore.getState());
    setAppScreen('game');
    setSummaryOpen(false);
    setEventLogOpen(false);
  };

  const openReservePanelFromDesk = () => {
    const hqId = playerFaction === 'RS'
      ? 'vrs_main_staff'
      : playerFaction === 'HRHB'
        ? 'hvo_main_staff'
        : 'arbih_general_staff';
    useGameStore.getState().setSelectedArmyHqId(hqId);
    setSelectedReserveRequestId(null);
    setAppScreen('game');
    setSummaryOpen(false);
    setEventLogOpen(false);
  };

  const openPersonnelFromDesk = () => {
    openArmyHQTab(useGameStore.getState(), 'personnel');
    setSelectedOfficerMatterId(null);
    setAppScreen('game');
    setSummaryOpen(false);
    setEventLogOpen(false);
  };

  const handlePresidentialInboxAction = (action: InboxItem['action'], itemId: string) => {
    const gs = useGameStore.getState();
    setSummaryOpen(false);
    setEventLogOpen(false);
    if (action === 'army_reserve') {
      setSelectedReserveRequestId(itemId);
    }
    if (action === 'army_hq_personnel') {
      setSelectedOfficerMatterId(itemId);
    }
    if (action === 'event_modal') {
      const eventId = itemId.startsWith('event:') ? itemId.slice('event:'.length) : itemId;
      setActiveEventDecisionId(eventId);
    }
    if (action === 'army_hq_opportunity') {
      openArmyHQTab(gs, 'briefing');
      setAppScreen('game');
    }
    if (action === 'army_hq_briefing') {
      openArmyHQTab(gs, 'briefing');
      setAppScreen('game');
    }
    if (action === 'peace_plan_modal') {
      setDismissedPeacePlanKey(null);
    }
    if (action === 'dayton_modal') {
      setDismissedPeacePlanKey(null);
    }
    if (action === 'paramilitary_review') {
      setParamilitaryReviewOpen(true);
    }
    if (action === 'convoy_decision_modal') {
      setSelectedConvoyDecisionId(itemId.startsWith('convoy:') ? itemId.slice('convoy:'.length) : itemId);
    }
    if (action === 'autonomy_panel') {
      setAutonomyPanelOpen(true);
      setAppScreen('game');
    }
    if (action === 'dismiss_intelligence_notification') {
      setSelectedIntelligenceBriefId(itemId);
    }
  };

  const openInboxHome = () => {
    const gs = useGameStore.getState();
    setTurnAftermathOpen(false);
    setSummaryOpen(false);
    setEventLogOpen(false);
    gs.setSelectedOsid(null);
    gs.setSelectedFormationId(null);
    gs.setSelectedCorpsId(null);
    gs.setSelectedCorpsFrontSectorId(null);
    gs.setSelectedArmyId(null);
    gs.setSelectedArmyHqId(null);
    gs.setSelectedOperationKey(null);
    gs.setSelectedOrbatCorpsId(null);
  };

  useEffect(() => {
    const handleShellHandoff = (event: MessageEvent) => {
      // warroom.ts posts this when REACT_SHELL_ENABLED and the player clicks "back to HQ"
      // from the game view — React switches back to the warroom screen without an iframe reload.
      if (event.data?.type === 'awwv-shell:show-warroom') {
        setAppScreen('warroom');
        return;
      }

      if (event.data?.type !== 'awwv-shell:handoff') return;
      const command = event.data?.command;
      if (!isShellHandoffCommand(command)) return;

      const handled = applyShellHandoffCommand(useGameStore.getState(), command);
      if (!handled) return;
      // Transition from warroom view to game view when a shell handoff arrives.
      setAppScreen('game');
      setSummaryOpen(false);
      setEventLogOpen(false);
    };

    window.addEventListener('message', handleShellHandoff);
    return () => window.removeEventListener('message', handleShellHandoff);
  }, []);

  useEffect(() => {
    if (initialShellHandoffApplied.current || !loadedGameState) return;
    const params = new URLSearchParams(window.location.search);
    const command = decodeShellHandoffCommand(params.get('shellHandoff'));
    if (!command) return;
    applyShellHandoffCommand(useGameStore.getState(), command);

    params.delete('shellHandoff');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
    initialShellHandoffApplied.current = true;
  }, [loadedGameState]);

  // Activate Warroom React shell when ?view=warroom is present in the URL.
  // warroom.ts canvas rendering remains the active runtime path; this is
  // the foundation component for progressive React shell ownership.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'warroom') {
      setAppScreen('warroom');
    }
  }, []);

  return (
    <div
      className="h-screen w-screen relative"
      style={{
        ['--awwv-toolbar-clearance' as string]: devMode ? '6.5rem' : '5.5rem',
        ['--awwv-bottom-bar-clearance' as string]: '2.5rem',
      }}
    >
      <AudioCueObserver />
      {/* LANE-NIGHTSHIFT-V093-A11Y-LANE-B: semantic landmarks.
          - <main>: MapContainer (the primary tactical-map view; landmark
            authored inside MapContainer.tsx, also tutorial spotlight target).
          - <header>: PresidentialToolbar (top-of-screen command bar).
          - <aside>: OOBSidebar (order-of-battle accordion).
          - <nav>: BottomStatusStrip (map-mode pills + layer controls; below).
          Each wrapper uses display:contents so the wrapped components retain
          their existing absolute/fixed positioning unaffected by the new tag.
          Faction-agnostic; UI-only; no sim path touched. */}
      {appScreen === 'game' && (
      <>
      <RootErrorBoundary zone="map">
        <MapContainer />
      </RootErrorBoundary>
      <header
        role="banner"
        aria-label="Presidential command toolbar"
        style={{ display: 'contents' }}
      >
        <RootErrorBoundary zone="toolbar">
          <PresidentialToolbar
            pendingReviews={loadedGameState?.presidentialReviewQueue?.pendingCount ?? 0}
            reserveAttention={loadedGameState?.armyReserveQueue
              ? {
                pendingCount: loadedGameState.armyReserveQueue.pendingCount,
                criticalCount: loadedGameState.armyReserveQueue.criticalCount,
                leadCriticalReason: loadedGameState.armyReserveQueue.leadCriticalReason,
                leadCriticalPurpose: loadedGameState.armyReserveQueue.leadCriticalPurpose,
                leadCriticalWhyNeeded: loadedGameState.armyReserveQueue.leadCriticalWhyNeeded,
                leadCriticalDescription: loadedGameState.armyReserveQueue.leadCriticalDescription,
              }
              : null}
            pressureWarning={loadedGameState?.pressureWarning ?? false}
            onOpenDesk={() => setAppScreen('warroom')}
            onOpenSummary={() => openSummary()}
            onOpenRecords={() => openArmyHQRecords('aar')}
            onOpenOpsHistory={() => useGameStore.getState().setIsOperationsPanelOpen(true)}
            onOpenCodex={() => openCodex(useGameStore.getState())}
            onOpenEventLog={() => setEventLogOpen(true)}
          />
        </RootErrorBoundary>
      </header>
      <CommandBriefingLayer
        onOpenSummary={openSummary}
        onOpenEnclaves={() => setEnclaveDashboardOpen(true)}
      />
      <aside
        aria-label="Order of Battle"
        style={{ display: 'contents' }}
      >
        <RootErrorBoundary zone="sidebar">
          <OOBSidebar />
        </RootErrorBoundary>
      </aside>
      {/* Tactical Detail Panels (Nested Rail Architecture) */}
      <RootErrorBoundary zone="right panel">
        <OperationsPanel />
        <OrderQueue />
        {tacticalDetailRailsVisible && shouldRenderInboxPanel(railState.primary, isOperationsPanelOpen) && (
          <PresidentialInbox onAction={handlePresidentialInboxAction} />
        )}
        {tacticalDetailRailsVisible && railState.primary === 'settlement' && <SelectionPanel railSlot="primary" />}
        {tacticalDetailRailsVisible && railState.primary === 'sector' && <CorpsFrontPanel railSlot="primary" />}
        {tacticalDetailRailsVisible && railState.primary === 'corps' && <CorpsDetail railSlot="primary" />}
        {/* ArmyDetail retired — faction click opens Army HQ modal */}
        {tacticalDetailRailsVisible && railState.primary === 'army_reserve' && <ArmyReservePanel railSlot="primary" />}
        {tacticalDetailRailsVisible && railState.primary === 'formation' && <FormationDetail railSlot="primary" />}
        {tacticalDetailRailsVisible && railState.primary === 'orbat' && <OrbatPanel />}

        {tacticalDetailRailsVisible && railState.secondary === 'settlement' && <SelectionPanel railSlot="secondary" />}
        {tacticalDetailRailsVisible && railState.secondary === 'sector' && <CorpsFrontPanel railSlot="secondary" />}
        {tacticalDetailRailsVisible && railState.secondary === 'corps' && <CorpsDetail railSlot="secondary" />}
        {tacticalDetailRailsVisible && railState.secondary === 'formation' && <FormationDetail railSlot="secondary" />}
      </RootErrorBoundary>
      <Tooltip />
      </>
      )}
      {pendingAttackConfirmation && attackerFormation && (
        <AttackConfirmation
          attacker={{ id: attackerFormation.id, name: attackerFormation.name, faction: attackerFormation.faction }}
          targetOsid={pendingAttackConfirmation.targetOsid}
          targetDisplayName={targetDisplayName}
          defender={defenderFormation ? { id: defenderFormation.id, name: defenderFormation.name, faction: defenderFormation.faction, strength: defenderFormation.personnel ?? '—' } : null}
          terrainSummary={terrainSummary}
          combatOdds={combatOdds}
          onConfirm={handleAttackConfirm}
          onCancel={handleAttackCancel}
        />
      )}
      <SidePickerOverlay
        isOpen={sidePickerOpen && !loadedGameState}
        starting={campaignStarting}
        errorMessage={loadError}
        onClose={() => {
          setSidePickerOpen(false);
          setSidePickerDismissed(true);
        }}
        onSelectFaction={handleSelectFaction}
      />
      <RecruitmentModal
        isOpen={recruitmentOpen}
        loading={recruitmentLoading}
        applying={recruitmentApplying}
        playerFaction={playerFaction}
        brigades={recruitmentCatalog}
        onRefresh={() => void refreshRecruitmentCatalog()}
        onApply={(brigadeId, equipmentClass) => void handleApplyRecruitment(brigadeId, equipmentClass)}
        onClose={() => setRecruitmentOpen(false)}
      />
      <WarSummaryModal
        isOpen={summaryOpen}
        focusSection={summaryFocus}
        onClose={() => setSummaryOpen(false)}
      />
      <TurnAftermathModal
        isOpen={turnAftermathOpen}
        view={turnAftermath}
        onClose={() => setTurnAftermathOpen(false)}
        onOpenInbox={openInboxHome}
        onOpenSummary={() => {
          setTurnAftermathOpen(false);
          openSummary();
        }}
        onOpenRecords={() => {
          setTurnAftermathOpen(false);
          openArmyHQRecords('aftermath');
        }}
        onOpenChronicle={() => {
          setTurnAftermathOpen(false);
          openChronicle(useGameStore.getState());
        }}
        onOpenCodex={() => {
          setTurnAftermathOpen(false);
          openCodex(useGameStore.getState());
        }}
      />
      <RootErrorBoundary zone="army hq">
        <ArmyHQModal />
      </RootErrorBoundary>
      <ChronicleOverlay />
      <WrappedOverlay eventCatalog={eventCatalogFull} />
      <CodexPanelWrapper eventCatalog={eventCatalogFull} />
      <StrategicDashboardWrapper />
      <RootErrorBoundary zone="ops planning">
        <OpsPlanningModal />
      </RootErrorBoundary>
      <CommanderSelectionModalWrapper />
      <OperationBriefingModalWrapper />
      {loadedGameState && (
        <EnclaveDashboard
          state={loadedGameState}
          open={enclaveDashboardOpen}
          onClose={() => setEnclaveDashboardOpen(false)}
        />
      )}
      {mapMode === 'supply' && loadedGameState && (
        <SupplyPanel state={loadedGameState} />
      )}
      {economyOpen && loadedGameState && (
        <EconomyPanel state={loadedGameState} onClose={() => setEconomyOpen(false)} />
      )}
      {aiSettingsOpen && (
        <AiSettingsPanel onClose={() => setAiSettingsOpen(false)} />
      )}
      {/* v0.8.4 Phase C: Command Autonomy panel */}
      {autonomyPanelOpen && (
        <AutonomyPanel
          onClose={() => setAutonomyPanelOpen(false)}
          playerFaction={playerFaction}
        />
      )}
      {diplomacyOpen && loadedGameState?.diplomacyView && (
        <DiplomacyPanel
          view={loadedGameState.diplomacyView}
          onClose={() => setDiplomacyOpen(false)}
        />
      )}
      {aiAdvisorOpen && (
        <AiAdvisorPanel
          response={aiAdvisorResponse}
          loading={!aiAdvisorResponse}
          onClose={() => { setAiAdvisorOpen(false); setAiAdvisorResponse(null); }}
        />
      )}
      {loadedGameState?.phase === 'peace' && <PeaceStatusPanel />}
      {/* v0.4.1 Phase 5: Event modal (queue-based).
          Non-decision fired events only — acknowledgement flash with auto-dismiss.
          Presidential event DECISIONS are owned by PresidentialAttentionPanel
          (Army HQ briefing); this modal never executes IPC for them. */}
      {eventQueue.length > 0 && eventQueue[eventQueueIndex] && (
        <EventModal
          event={eventQueue[eventQueueIndex]}
          queuePosition={eventQueueIndex + 1}
          queueTotal={eventQueue.length}
          onAcknowledge={handleEventAcknowledge}
        />
      )}
      {/* v0.5.0: Peace Plan Modal — blocks turn progression until player responds */}
      {showPeacePlanModal && pendingPeacePlan && (
        <PeacePlanModal
          plan={pendingPeacePlan}
          onDismiss={() => setDismissedPeacePlanKey(getPeacePlanDismissalKey(pendingPeacePlan))}
        />
      )}
      <ParamilitaryReviewModal
        isOpen={paramilitaryReviewOpen}
        onClose={() => setParamilitaryReviewOpen(false)}
      />
      {/* v0.9 presidential blocking decision modal.
          Source: state.military.pending_event_decisions[] filtered by player faction.
          Surfaced (a) automatically when a new turn brings a new decision (see
          auto-launch effect above), or (b) when the player clicks the inbox item
          (event_modal action handler routes here). The modal is non-dismissible;
          the only exit is to respond, which calls ipc.respondToEventDecision and
          the engine clears the entry from pending_event_decisions. */}
      {activeEventDecisionId !== null && (() => {
        const decision = (loadedGameState?.pendingEventDecisions ?? [])
          .find((d) => d.event_id === activeEventDecisionId && d.faction === playerFaction);
        if (!decision) return null;
        return (
          <EventDecisionModal
            decision={decision}
            eventCatalog={eventCatalogFull}
            state={loadedGameState?.rawGameState}
            onRespond={async (eventId, responseId) => {
              if (ipc.isAvailable) {
                const result = await ipc.respondToEventDecision(eventId, responseId);
                if (result.ok === true) {
                  setRecentlyAcceptedEventDecisionId(eventId);
                  setActiveEventDecisionId(null);
                } else {
                  setLoadError(result.error ?? 'Failed to record event decision.');
                }
                return;
              }
              setLoadError('Event decisions are available in desktop mode only.');
            }}
          />
        );
      })()}
      <ConvoyDecisionModal
        convoy={loadedGameState?.pendingConvoyDecisions?.find((convoy) => convoy.id === selectedConvoyDecisionId) ?? null}
        onClose={() => setSelectedConvoyDecisionId(null)}
        onDecide={(convoyId, decision) => (
          ipc.isAvailable
            ? ipc.stageConvoyDecision(convoyId, decision)
            : Promise.resolve({ ok: false, error: 'Convoy decisions are available in desktop mode only.' })
        )}
      />
      <ReserveRequestModal
        requestId={selectedReserveRequestId}
        state={loadedGameState}
        onClose={() => setSelectedReserveRequestId(null)}
        onOpenReservePanel={openReservePanelFromDesk}
      />
      <OfficerMatterModal
        itemId={selectedOfficerMatterId}
        state={loadedGameState}
        onClose={() => setSelectedOfficerMatterId(null)}
        onOpenPersonnel={openPersonnelFromDesk}
      />
      <IntelligenceBriefModal
        notificationId={selectedIntelligenceBriefId}
        state={loadedGameState}
        onClose={() => setSelectedIntelligenceBriefId(null)}
      />
      <CounterOfferModal
        offerId={selectedCounterOfferId}
        state={loadedGameState}
        onClose={() => setSelectedCounterOfferId(null)}
      />
      {/* v0.4.1 Phase 5: Event log panel */}
      {eventLogOpen && (
        <EventLogPanel events={eventLogEntries} onClose={() => setEventLogOpen(false)} />
      )}
      {/* v0.5.0: Dayton Negotiation Modal — blocks when Dayton trigger fires */}
      {loadedGameState?.pendingDayton && !loadedGameState?.gameOver && (
        <DaytonNegotiationModal dayton={loadedGameState.pendingDayton} />
      )}
      <PeaceWarTransitionOverlay />
      <VerdictScreen />
      <ReplayInspectionBanner />
      <CoachmarkLayer />
      {/* Warroom shell: advance-turn confirmation modal — triggered by wall_calendar_area hotspot */}
      <AdvanceTurnModal
        onReviewPriorities={reviewPreAdvancePriorities}
        onReviewItem={reviewPreAdvanceItem}
        onResolveBlocker={handlePresidentialInboxAction}
      />
      {appScreen === 'game' && <MapModeLegend />}
      {appScreen === 'game' && <Minimap />}
      {appScreen === 'game' && (
        <nav
          aria-label="Map controls and status"
          style={{ display: 'contents' }}
        >
          <BottomStatusStrip eventCatalog={eventCatalogFull} />
        </nav>
      )}

      {/* Warroom React shell — foundation layer, activated by ?view=warroom */}
      {appScreen === 'warroom' && (
        <div className="fixed inset-0 z-50 bg-black">
          <WarroomShellLayer
            onOpenSidePicker={() => {
              setAppScreen('game');
              setSidePickerOpen(true);
              setSidePickerDismissed(false);
            }}
            onNavigate={(command) => {
              if (isWarroomLocalCommand(command)) {
                if (command.kind === 'strategic-overview') {
                  useGameStore.getState().setStrategicDashboardOpen(true);
                } else if (command.kind === 'diplomacy') {
                  setDiplomacyOpen(true);
                } else if (command.kind === 'event-log') {
                  setEventLogOpen(true);
                }
                return;
              }
              if (command) {
                applyShellHandoffCommand(
                  { ...useGameStore.getState(), setEventLogOpen },
                  command,
                );
              }
              if (!warroomCommandStaysInRoom(command)) {
                setAppScreen('game');
              }
            }}
          />
          <PresidentDeskShell
            state={loadedGameState}
            osidNameMap={osidDisplayNames}
            onAction={handlePresidentialInboxAction}
            onAdvance={() => useGameStore.getState().setAdvanceTurnPending(true)}
            onOpenArmyHQ={() => {
              openArmyHQTab(useGameStore.getState(), 'briefing');
              setAppScreen('game');
            }}
            onOpenMap={() => setAppScreen('game')}
            onOpenRecords={() => {
              openArmyHQRecordsSubTab(useGameStore.getState(), 'aftermath');
              setAppScreen('game');
            }}
          />
          <WarroomStatusBar
            onReviewPriorities={reviewPreAdvancePriorities}
            onReviewItem={reviewPreAdvanceItem}
            onReviewTarget={reviewPreAdvanceTarget}
          />
        </div>
      )}

      {/* v0.5.1: Menu system overlays */}
      {appScreen === 'mainMenu' && (
        <MainMenu
          hasSave={!!loadedGameState}
          onNewGame={() => { setAppScreen('game'); setSidePickerOpen(true); }}
          onContinue={() => setAppScreen('game')}
          onLoadGame={() => { setAppScreen('game'); setSidePickerOpen(true); }}
          onSettings={() => setSettingsOpen(true)}
          onCredits={() => setCreditsOpen(true)}
          onQuit={() => { if (typeof window !== 'undefined') window.close(); }}
        />
      )}
      {pauseOpen && (
        <PauseMenu
          onResume={() => setPauseOpen(false)}
          onSave={() => { void ipc.quickSave(); setPauseOpen(false); }}
          onSettings={() => { setPauseOpen(false); setSettingsOpen(true); }}
          onMainMenu={() => { setPauseOpen(false); setAppScreen('mainMenu'); }}
          onQuit={() => { if (typeof window !== 'undefined') window.close(); }}
        />
      )}
      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
      {creditsOpen && <CreditsScreen onClose={() => setCreditsOpen(false)} />}
      {/* v0.9.2 tutorial onboarding skeleton — mounted at app root.
          Only visible on the in-game screen with a loaded save; hidden during
          main menu / side picker. The overlay's own predicate handles the
          dismissed-state branch. */}
      {appScreen === 'game' && loadedGameState && !peaceWarTransitionActive && <OnboardingOverlayWrapper />}
      {/* LANE-V094-LOADING-AND-ERROR — first-paint scenario-load skeleton.
          Shown when the in-game shell has been requested but no save has
          loaded yet. Auto-dismisses when `loadedGameState` resolves. We
          deliberately exclude the `mainMenu` / `warroom` screens (those have
          their own UI) and the side-picker overlay (the overlay itself is
          the entry surface). */}
      {appScreen === 'game' && !loadedGameState && !sidePickerOpen && (
        <LoadingSkeleton />
      )}
      {/* LANE-V094-LOADING-AND-ERROR — save-load error toast.
          Mounted at App root reading the canonical `loadError` slice of
          the game store. Dismiss clears the slice so the next failure
          surfaces a fresh toast. Suppressed while the SidePickerOverlay
          is open — that overlay already renders `errorMessage={loadError}`
          inline, so we avoid a duplicate consumer. */}
      {!sidePickerOpen && (
        <LoadErrorToast
          message={loadError}
          onDismiss={() => setLoadError(null)}
        />
      )}
    </div>
  );
}

export default App;
