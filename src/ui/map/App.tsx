import { useEffect, useMemo, useRef, useState } from 'react';
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
import { HumanitarianLedgerPanel } from './components/HumanitarianLedgerPanel';
import { EnclaveDashboard } from './components/EnclaveDashboard';
import { EventModal } from './components/EventModal';
import { AiAdvisorPanel } from './components/AiAdvisorPanel';
import { AiSettingsPanel } from './components/AiSettingsPanel';
import { PresidentialInbox } from './components/PresidentialInbox';
import type { EventDisplayData } from './components/EventModal';
import { CommandBriefingLayer } from './components/CommandBriefingLayer';
import { PeacePlanModal } from './components/PeacePlanModal';
import { OnboardingOverlay, type TutorialStateShape } from './components/onboarding/OnboardingOverlay';
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
import { PeaceWarTransitionOverlay } from './components/PeaceWarTransitionOverlay';
import { ChronicleOverlay } from './components/chronicle/ChronicleOverlay';
import { WrappedOverlay } from './components/chronicle/WrappedOverlay';
import { CodexPanel } from './components/CodexPanel';
import { DecisionHistoryOverlay } from './components/DecisionHistoryOverlay';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { LoadErrorToast } from './components/LoadErrorToast';
import { VerdictScreen } from './components/VerdictScreen';
import { ReplayInspectionBanner } from './components/replay/ReplayInspectionBanner';
import { AudioCueObserver } from './components/AudioCueObserver';
import { WarroomShellLayer } from './components/warroom/WarroomShellLayer';
import { AdvanceTurnModal } from './components/warroom/AdvanceTurnModal';
import { WarroomStatusBar } from './components/warroom/WarroomStatusBar';
import { CommandCardStrip } from './components/warroom/CommandCardStrip';
import type { PresidentialCommandCategoryId } from './data/presidentialCategories';
import { PresidentDeskShell } from './components/presidential_desk/PresidentDeskShell';
import { PresidentialDecisionRoomPanel } from './components/army_hq/PresidentialDecisionRoomPanel';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { PanelBreadcrumb } from './components/PanelBreadcrumb';
import { derivePanelRailState, shouldRenderInboxPanel, shouldRenderTacticalDetailRails } from './components/panelRail';
import { useGameStore, isDevMode } from './store/gameStore';
import { loadLatestRunSaveAsText, loadEventDefinitions, loadEventDefinitionsFull } from './data/DataLoader';
import type { EventDefinition } from '../../sim/events/event_types';
import { buildConsequenceReceipts, receiptsRealizedOnTurn } from './data/consequenceReceipts';
import { buildForcedOpReceipts, forcedOpReceiptsRealizedOnTurn } from './data/forcedOpReceipts';
import {
  buildOfficerResentmentReceipts,
  officerResentmentReceiptsRealizedOnTurn,
} from './data/officerResentmentReceipts';
import { getOsidDisplayName } from './utils/osidDisplayName';
import { t } from './i18n';
import { getFormationsAtOsid } from './utils/formationAtOsid';
import { getPlayerSafeMilitaryFactionName } from './utils/playerSafeText';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDesktopSession } from './hooks/useDesktopSession';
import { useIPC } from './desktop/useIPC';
import { advanceTurnAndSync } from './desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from './desktop/turnAftermathAdvanceDeps';
import { resolvePlayerFacingFaction } from '../shared/playerVisibility';
import type { RecruitmentCatalogBrigade, StartNewCampaignPayload } from './desktop/types';
import type { LoadedGameState, SummaryFocusSection } from './data/types';
import type { InboxItem } from './data/inboxItems';
import { isRequiredPendingEventDecision } from './data/eventDecisionRouting';
import type { PreAdvanceCommandReviewItem } from './data/preAdvanceCommandReview';
import type { PresidentialDecisionRoomNavigationTarget } from './data/presidentialDecisionRoom';
import { shouldShowPeaceWarTransition } from './data/peaceWarTransitionGate';
import { applyShellHandoffCommand, openArmyHQDecisionConsequenceRecord, openArmyHQRecordsSubTab, openArmyHQTab, openChronicle, openChronicleDecisionRecord, openCodex, warroomCommandStaysInRoom } from './utils/shellNavigation';
import { openPresidentialDecisionRoomNavigationTarget } from './utils/presidentialDecisionRoomNavigation';
import { requestDecisionRoomLens } from './utils/decisionRoomLensRequest';
import { isKeyboardEventFromInteractiveControl } from './utils/interactiveFocus';
import { isWarroomLocalCommand, type WarroomOverlaySurface } from './utils/warroomNavigation';
import { getPeacePlanDismissalKey, shouldShowPeacePlanModal } from './utils/peacePlanDismissal';
import { decodeShellHandoffCommand, isShellHandoffCommand, type ArmyHQRecordsSubTab, type ShellHandoffCommand } from '../shared/shellHandoff';
import { shouldShowOpeningBrief } from './data/openingBriefGate';
import {
  applyRecruitmentAndSync,
  fetchRecruitmentCatalog,
  resolveBrowserEventDecision,
  startCampaignFromSidePicker,
} from './desktop/campaignRecruitmentActions';

declare global {
  interface Window {
    handleManualSaveLoad?: (json: unknown) => Promise<void>;
    handleContinueLastRun?: () => Promise<void>;
  }
}

type PendingEventDecisionView = NonNullable<LoadedGameState['pendingEventDecisions']>[number];

type AcknowledgementEventEffect = {
  kind: string;
  text?: string;
  faction?: string;
  delta?: number;
  duration_turns?: number;
  war_crimes_delta?: number;
  osids?: string[];
  pool_multiplier?: number;
  multiplier?: number;
  mode?: string;
  value?: number;
};

function formatSignedEventDelta(delta: number | undefined): string {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return '';
  return ` ${delta > 0 ? '+' : ''}${delta}`;
}

function formatEventDuration(turns: number | undefined): string {
  return typeof turns === 'number' && Number.isFinite(turns) && turns > 0
    ? t('eventModal.effect.duration', { turns })
    : '';
}

export function formatAcknowledgementEventEffect(effect: AcknowledgementEventEffect): string {
  if (effect.text) return effect.text;
  const faction = effect.faction ? getPlayerSafeMilitaryFactionName(effect.faction) : null;
  const factionPrefix = faction ? `${faction} ` : '';
  const delta = formatSignedEventDelta(effect.delta);
  const duration = formatEventDuration(effect.duration_turns);

  switch (effect.kind) {
    case 'morale_change':
      return t('eventModal.effect.moraleChange', { faction: factionPrefix, delta });
    case 'supply_delta':
      return t('eventModal.effect.supplyDelta', { faction: factionPrefix, delta });
    case 'cohesion_change':
      return t('eventModal.effect.cohesionChange', { faction: factionPrefix, delta });
    case 'humanitarian_impact':
      return t('eventModal.effect.humanitarianImpact', { faction: factionPrefix, delta: formatSignedEventDelta(effect.war_crimes_delta) });
    case 'patron_pressure':
      return t('eventModal.effect.patronPressure', { faction: factionPrefix, delta });
    case 'alliance_change':
      return t('eventModal.effect.allianceChange', { delta });
    case 'negotiation_capital':
      return t('eventModal.effect.negotiationCapital', { faction: factionPrefix, delta });
    case 'equipment_grant':
      return t('eventModal.effect.equipmentGrant', { faction: factionPrefix });
    case 'aggression_modifier':
      return t('eventModal.effect.aggressionModifier', { faction: factionPrefix, delta, duration });
    case 'control_change': {
      const count = effect.osids?.length ?? 0;
      return count > 0
        ? t(count === 1 ? 'eventModal.effect.controlChange.one' : 'eventModal.effect.controlChange.many', { faction: factionPrefix, count })
        : t('eventModal.effect.controlChange.recorded', { faction: factionPrefix });
    }
    case 'guerrilla_threat':
      return t('eventModal.effect.guerrillaThreat', { faction: factionPrefix, duration });
    case 'offensive_ops_suppression':
      return t('eventModal.effect.offensiveSuppression', { faction: factionPrefix, duration });
    case 'alliance_lock':
      return t('eventModal.effect.allianceLock', { duration });
    default:
      return t('eventModal.effect.default', { faction: factionPrefix });
  }
}

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
    .filter(isRequiredPendingEventDecision)
    .filter((decision) => decision.event_id !== excludedEventId)
    .sort(comparePendingEventDecisionPriority);
  return playerDecisions[0] ?? null;
}

/**
 * Phase 2 slice 1 "Back the Officer": resolve the named advisor whose voice
 * frames an operation/corps-scoped event decision ('command' / 'military'
 * category). Pending event decisions carry no corps/op linkage, so the advisor
 * is the player faction's senior acting commander from the same officer roster
 * the back-the-officer card reads (`namedOfficerData`). Deterministic: officers
 * are sorted by id and the acting commander is preferred; the first match wins.
 * Returns undefined when no officer resolves OR the event is not officer-scoped,
 * so the modal keeps its generic "Staff assessment" fallback (see
 * `deriveAssessmentLabel`).
 */
function resolveEventDecisionAdvisor(
  decision: PendingEventDecisionView,
  officers: LoadedGameState['namedOfficerData'],
  playerFaction: string | null,
): { name: string | null | undefined; rank?: string } | undefined {
  const category = (decision as { category?: string }).category;
  if (category !== 'command' && category !== 'military') return undefined;
  if (!playerFaction || !officers || officers.length === 0) return undefined;
  const factionOfficers = officers
    .filter((o) => o.faction === playerFaction)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (factionOfficers.length === 0) return undefined;
  const advisor = factionOfficers.find((o) => o.acting_commander) ?? factionOfficers[0];
  return { name: advisor.name, rank: advisor.rank };
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
  const setLoadError = useGameStore((s) => s.setLoadError);
  const ipc = useIPC();

  if (!ctx) return <OperationBriefingModal isOpen={false} onClose={() => close(null)} />;

  const handleDecision = async (decision: 'launch' | 'postpone' | 'abort' | 'probe') => {
    if (!ipc.isAvailable) {
      setLoadError(t('attention.bridgeUnavailableReadOnly'));
      return;
    }
    const result = await ipc.stageOperationDecision({ corpsId: ctx.corpsId, operationName: ctx.operationName, decision });
    if (!result.ok) {
      setLoadError(result.error ?? t('attention.bridgeUnavailableReadOnly'));
      return;
    }
    close(null);
  };

  // Force-launch (Level 3 Direct Intervention) is issued ONLY from the Presidential
  // Decision Room (DirectiveCard, force_launch directive). This review modal stays
  // read-only — it surfaces the commander's go/no-go callbacks but no override.
  return (
    <OperationBriefingModal
      isOpen
      onClose={() => close(null)}
      onLaunch={() => handleDecision('launch')}
      onPostpone={() => handleDecision('postpone')}
      onAbort={() => handleDecision('abort')}
      onOrderProbe={() => handleDecision('probe')}
      commandBridgeAvailable={ipc.isAvailable}
    />
  );
}

function CodexPanelWrapper({
  eventCatalog,
  requestedEventId,
}: {
  eventCatalog?: ReadonlyMap<string, EventDefinition>;
  requestedEventId?: string | null;
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
      requestedEventId={requestedEventId}
      eventCatalog={eventCatalog}
      state={rawGameState}
    />
  );
}

/**
 * Task #77 — first-run auto-mount of the 8-step teaching deck.
 *
 * Re-enables auto-show of `OnboardingOverlay` on a fresh campaign's first run.
 * (A prior "Track-D" consolidation removed the `<OnboardingOverlay>` mount, so
 * the deck was reachable only via "Restart Tutorial" in Settings — a new player
 * never saw the thesis lesson.)
 *
 * First-run / dismissal / reload semantics are driven ENTIRELY by the existing
 * persisted `meta.tutorial_state` (surfaced as `loadedGameState.tutorial_state`
 * by `normalizeTutorialState` in GameStateAdapter). NO new persisted field:
 *   - Fresh campaign (turn 0, no `meta.tutorial_state`) → adapter returns
 *     `undefined` → `shouldShowOnboarding(undefined) === true` → deck shows.
 *   - Player dismisses/completes → IPC writes `tutorial_state.dismissed = true`
 *     → deck hidden, and not re-shown on reload of the same campaign.
 *   - Continue on a progressed save (turn > 0, no field) → adapter defaults to
 *     `{ dismissed: true }` → deck does NOT replay.
 * The overlay's own `shouldShowOnboarding` predicate is the single visibility
 * gate; this wrapper only supplies state + the IPC bridge and the screen gate.
 *
 * Ordering vs the opening brief: the first-hour presidential sequence owns
 * the foreground before the tutorial deck. War-start briefing, opening brief,
 * and foundational event decisions must clear before the teaching deck mounts,
 * so the player's first authored choice is framed before general instruction.
 *
 * Faction-agnostic (mirrors the overlay + restart-button single-owner contract).
 */
let browserPreviewTutorialStateMemory: TutorialStateShape | null = null;

function OnboardingOverlayWrapper() {
  const tutorialState = useGameStore((s) => s.loadedGameState?.tutorial_state);
  const ipc = useIPC();
  const [browserPreviewTutorialState, setBrowserPreviewTutorialState] = useState<TutorialStateShape | null>(
    browserPreviewTutorialStateMemory,
  );
  const commitBrowserPreviewTutorialState = (nextState: TutorialStateShape) => {
    browserPreviewTutorialStateMemory = nextState;
    setBrowserPreviewTutorialState(nextState);
  };
  // Codex #347 (P2) — preserve dismissal when IPC is unavailable. In
  // browser/dev-map builds (or when the tutorial ipcMain handlers are not
  // registered) `ipc.isAvailable` is false but `useIPC()` still exposes noop
  // `dismissTutorial`/`advanceTutorialStep`. Passing that non-null bridge made
  // `OnboardingOverlay` take its persisted-state path: Skip/Next only resolved
  // the noops while `loadedGameState.tutorial_state` stayed undefined, so the
  // HARD_MODAL deck stayed stuck over the game. Mirror `SettingsScreen` and
  // pass `null` unless IPC is available, so the overlay uses its in-memory
  // `previewTutorialState` fallback (dismissal/advance take effect for the
  // current session). Default Electron-with-IPC behavior is unchanged.
  const onboardingBridge = useMemo(
    () =>
      ipc.isAvailable
        ? {
            dismissTutorial: () => ipc.dismissTutorial(),
            advanceStep: (stepId: string) => ipc.advanceTutorialStep(stepId),
            restartTutorial: () => ipc.restartTutorial(),
          }
        : null,
    [ipc],
  );
  return (
    <OnboardingOverlay
      tutorialState={ipc.isAvailable ? tutorialState : (browserPreviewTutorialState ?? tutorialState)}
      ipc={onboardingBridge}
      onPreviewTutorialStateChange={commitBrowserPreviewTutorialState}
    />
  );
}

type NativeWarroomOverlaySurface = Extract<WarroomOverlaySurface, 'intelligence' | 'staff' | 'faction'>;

const WARROOM_OVERLAY_COPY: Record<NativeWarroomOverlaySurface, {
  titleKey: Parameters<typeof t>[0];
  eyebrowKey: Parameters<typeof t>[0];
  bodyKey: Parameters<typeof t>[0];
  drillInLabelKey: Parameters<typeof t>[0];
}> = {
  intelligence: {
    titleKey: 'warroom.overlay.intelligence.title',
    eyebrowKey: 'warroom.overlay.intelligence.eyebrow',
    bodyKey: 'warroom.overlay.intelligence.body',
    drillInLabelKey: 'warroom.overlay.intelligence.drillIn',
  },
  staff: {
    titleKey: 'warroom.overlay.staff.title',
    eyebrowKey: 'warroom.overlay.staff.eyebrow',
    bodyKey: 'warroom.overlay.staff.body',
    drillInLabelKey: 'warroom.overlay.staff.drillIn',
  },
  faction: {
    titleKey: 'warroom.overlay.faction.title',
    eyebrowKey: 'warroom.overlay.faction.eyebrow',
    bodyKey: 'warroom.overlay.faction.body',
    drillInLabelKey: 'warroom.overlay.faction.drillIn',
  },
};

function WarroomNativeOverlay({
  surface,
  onClose,
  onDrillIn,
}: {
  surface: NativeWarroomOverlaySurface;
  onClose: () => void;
  onDrillIn: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const copy = WARROOM_OVERLAY_COPY[surface];
  const title = t(copy.titleKey);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [surface]);

  return (
    <section
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-label={t('warroom.overlay.ariaLabel', { title })}
      tabIndex={-1}
      data-testid={`warroom-overlay-${surface}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="pointer-events-auto absolute left-4 top-24 z-[7] w-[min(30rem,calc(100vw-2rem))] border border-panel-border/80 bg-panel-bg/94 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-md md:left-6 xl:left-10"
    >
      <div className="flex items-start justify-between gap-4 border-b border-panel-border/70 pb-3">
        <div>
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-accent-gold">{t(copy.eyebrowKey)}</div>
          <h2 className="mt-1 text-[18px] font-bold leading-tight text-text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('warroom.overlay.closeAria', { title })}
          data-testid={`warroom-overlay-${surface}-close`}
          className="border border-panel-border/80 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
        >
          {t('warroom.overlay.close')}
        </button>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-text-secondary">{t(copy.bodyKey)}</p>
      <button
        type="button"
        onClick={onDrillIn}
        data-testid={`warroom-overlay-${surface}-drill-in`}
        className="mt-4 border border-accent-gold/45 bg-accent-gold/12 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-accent-gold transition-colors hover:bg-accent-gold/20"
      >
        {t(copy.drillInLabelKey)}
      </button>
    </section>
  );
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
  const openingBriefDismissed = useGameStore((s) => s.openingBriefDismissed);
  const setOpeningBriefDismissed = useGameStore((s) => s.setOpeningBriefDismissed);
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
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const loadError = useGameStore((s) => s.loadError);
  const turnAftermath = useGameStore((s) => s.turnAftermath);
  const turnAftermathOpen = useGameStore((s) => s.turnAftermathOpen);
  const setTurnAftermathOpen = useGameStore((s) => s.setTurnAftermathOpen);
  const peaceWarTransitionSeen = useGameStore((s) => s.peaceWarTransitionSeen);
  const setPeaceWarTransitionSeen = useGameStore((s) => s.setPeaceWarTransitionSeen);
  const playerFaction = resolvePlayerFacingFaction(loadedGameState);
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
  const panelBreadcrumb = <PanelBreadcrumb railState={railState} />;

  // Task #80 — boot to the Main Menu first. Faction choice is offered ONLY via
  // the menu (New Game / Load → SidePicker), never an auto-popping modal. The
  // `?view=warroom` / `?view=game` URL-param overrides below (~:1022) still let
  // dev/automation deep-link past the menu.
  const [appScreen, setAppScreen] = useState<'game' | 'mainMenu' | 'warroom'>('mainMenu');
  // Command-surface card strip: open state + optional category highlight.
  // Warroom hotspots keep literal room meanings; the strip opens from the Desk.
  const [commandStripOpen, setCommandStripOpen] = useState(false);
  const [commandStripCategoryId, setCommandStripCategoryId] = useState<PresidentialCommandCategoryId | null>(null);
  const [warroomDeskOpen, setWarroomDeskOpen] = useState(false);
  const [warroomDecisionRoomOpen, setWarroomDecisionRoomOpen] = useState(false);
  const [warroomOverlaySurface, setWarroomOverlaySurface] = useState<NativeWarroomOverlaySurface | null>(null);
  const warroomFocusReturnRef = useRef<HTMLElement | null>(null);
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
  const [economyOpen, setEconomyOpen] = useState(false);
  // Item 2: National Humanitarian Ledger surface (read-model; 'U' hotkey toggle).
  const [humanitarianLedgerOpen, setHumanitarianLedgerOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [diplomacyOpen, setDiplomacyOpen] = useState(false);
  const [aiAdvisorOpen, setAiAdvisorOpen] = useState(false);
  const [aiAdvisorResponse, setAiAdvisorResponse] = useState<any>(null);
  const [eventQueue, setEventQueue] = useState<EventDisplayData[]>([]);
  const [eventQueueIndex, setEventQueueIndex] = useState(0);
  const [acknowledgedEventIds, setAcknowledgedEventIds] = useState<Set<string>>(new Set());
  const [shownEventModalIds, setShownEventModalIds] = useState<Set<string>>(new Set());
  const [requestedCodexEventId, setRequestedCodexEventId] = useState<string | null>(null);
  const [dismissedPeacePlanKey, setDismissedPeacePlanKey] = useState<string | null>(null);
  const [paramilitaryReviewOpen, setParamilitaryReviewOpen] = useState(false);
  /**
   * Phase H Packet 8 — Decision History overlay open state. Owned at App
   * root because the overlay is full-screen and may be triggered from
   * multiple places (currently: 'D' hotkey + future inbox / records
   * actions). Default closed. See `DecisionHistoryOverlay.tsx`.
   */
  const [isDecisionHistoryOpen, setIsDecisionHistoryOpen] = useState(false);
  /** Active blocking event decision id surfaced as a modal. `null` = no modal.
   *  Set by (a) inbox click on `event_modal` action, or (b) the auto-launch effect
   *  below when a new turn surfaces pending decisions for the player faction. */
  const [activeEventDecisionId, setActiveEventDecisionId] = useState<string | null>(null);
  const activeEventDecisionIdRef = useRef<string | null>(null);
  activeEventDecisionIdRef.current = activeEventDecisionId;
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

  useEffect(() => {
    if (!loadedGameState || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('intro') === 'war_start') {
      const view = params.get('view');
      setAppScreen(view === 'warroom' ? 'warroom' : 'game');
      setOpeningBriefDismissed(false);
      setPeaceWarTransitionSeen(false);
      setActiveEventDecisionId(null);
      setRecentlyAcceptedEventDecisionId(null);
      setLoadError(null);
      params.delete('intro');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);
    }
  }, [loadedGameState, setLoadError, setOpeningBriefDismissed, setPeaceWarTransitionSeen]);

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

  // Promise→receipt loop (consequence-receipt read-model). All realized
  // receipts derived from the persisted causality substrate + full catalog;
  // the aftermath modal surfaces only those whose CONFIRMED firing landed on
  // the just-advanced turn. Read-only; collapses to [] pre-substrate.
  const consequenceReceipts = useMemo(
    () => buildConsequenceReceipts(loadedGameState?.rawGameState, eventCatalogFull),
    [loadedGameState?.rawGameState, eventCatalogFull],
  );
  const aftermathConsequences = useMemo(
    () => (turnAftermath ? receiptsRealizedOnTurn(consequenceReceipts, turnAftermath.turn) : []),
    [consequenceReceipts, turnAftermath],
  );

  // Force-op AFTER-loop: when an operation the president force-launched over the
  // corps commander's objection RESOLVES, surface the outcome the president
  // authored. Player-origin by construction (the force_launched flag can only
  // come from a player force-launch); bot/historical → []. Read-only.
  const forcedOpReceipts = useMemo(
    () => buildForcedOpReceipts(loadedGameState?.rawGameState),
    [loadedGameState?.rawGameState],
  );
  const aftermathForcedOps = useMemo(
    () => (turnAftermath ? forcedOpReceiptsRealizedOnTurn(forcedOpReceipts, turnAftermath.turn) : []),
    [forcedOpReceipts, turnAftermath],
  );

  // Force-op HUMAN-COST half: when the president forces an op past a corps
  // commander's objection, the engine bumps that CO's override/cowed substrate.
  // Surface the command-loyalty cost. Player-origin by construction (the override
  // fields can only be written by a player force-launch over objection);
  // bot/historical → []. Read-only.
  const officerResentmentReceipts = useMemo(
    () => buildOfficerResentmentReceipts(loadedGameState?.rawGameState),
    [loadedGameState?.rawGameState],
  );
  const aftermathOfficerResentment = useMemo(
    () =>
      turnAftermath
        ? officerResentmentReceiptsRealizedOnTurn(officerResentmentReceipts, turnAftermath.turn)
        : [],
    [officerResentmentReceipts, turnAftermath],
  );

  // Reset dismissal/acknowledgement state when a new save is loaded.
  // Without this, stale flags from a previous save hide real pending items.
  const stateFingerprint = useGameStore((s) => s.lastLoadedStateFingerprint);
  useEffect(() => {
    setDismissedPeacePlanKey(null);
    setAcknowledgedEventIds(new Set());
    setShownEventModalIds(new Set());
    setRequestedCodexEventId(null);
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
    // Task #80 — when a save/state loads, close the SidePicker. We deliberately
    // do NOT auto-open it when no state is loaded: faction choice is offered
    // only via explicit user actions (MainMenu New Game / Load, warroom
    // handoff), never an auto-popping modal on boot.
    if (loadedGameState) {
      setSidePickerOpen(false);
      setSidePickerDismissed(false);
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
    // Task #80 — do not queue acknowledgement flashes while booted to the Main
    // Menu; they would pop the EventModal over it (and the auto-dismiss timer
    // would clear them unseen). Defer until past the menu — the effect re-runs
    // when `appScreen` leaves 'mainMenu' (it is in the dep list below).
    if (appScreen === 'mainMenu') return;
    const fired = loadedGameState.firedEvents;
    if (!fired || fired.length === 0) return;

    // Find current-turn events not yet shown in this campaign session.
    const newEvents = fired.filter(e => e.turn === loadedGameState.turn && !shownEventModalIds.has(e.id) && !e.isDecision);
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
            description: formatAcknowledgementEventEffect(eff),
          })) ?? e.effects,
          isDecision: false,
          image: def?.image,
        };
      });

      // Only show if we have new events that aren't already in queue
      if (displayData.length > 0 && eventQueue.length === 0) {
        setShownEventModalIds(prev => {
          const next = new Set(prev);
          for (const event of displayData) next.add(event.id);
          return next;
        });
        setEventQueue(displayData);
        setEventQueueIndex(0);
      }
    });
    return () => { stale = true; };
  }, [loadedGameState?.turn, loadedGameState?.firedEvents?.length, appScreen, shownEventModalIds, eventQueue.length]);

  const pendingPeacePlan = loadedGameState?.pendingPeacePlan;
  const showPeacePlanModal = shouldShowPeacePlanModal(pendingPeacePlan, dismissedPeacePlanKey);
  const peaceWarTransitionActive = loadedGameState != null && shouldShowPeaceWarTransition(
    loadedGameState,
    peaceWarTransitionSeen,
  );
  const presidentialBlockingSurfaceActive = (
    sidePickerOpen ||
    peaceWarTransitionActive ||
    activeEventDecisionId !== null ||
    showPeacePlanModal ||
    Boolean(loadedGameState?.pendingDayton && !loadedGameState?.gameOver)
  );
  const tacticalChromeVisible = !presidentialBlockingSurfaceActive;
  const openingBriefPending = shouldShowOpeningBrief(loadedGameState, openingBriefDismissed);
  const onboardingBlockingOverlayActive = (
    presidentialBlockingSurfaceActive ||
    openingBriefPending ||
    armyHQOpen ||
    codexOpen ||
    chronicleOpen ||
    warroomDeskOpen ||
    warroomDecisionRoomOpen ||
    warroomOverlaySurface !== null ||
    commandStripOpen ||
    summaryOpen ||
    enclaveDashboardOpen ||
    economyOpen ||
    humanitarianLedgerOpen ||
    aiSettingsOpen ||
    diplomacyOpen ||
    aiAdvisorOpen ||
    recruitmentOpen ||
    paramilitaryReviewOpen ||
    eventQueue.length > 0 ||
    pauseOpen ||
    settingsOpen ||
    creditsOpen
  );

  // v0.9 presidential design: auto-launch the EventDecisionModal for the first
  // blocking event decision when a new turn surfaces one. Memory:
  // [[player_identity_and_command]] — "Goal is to play as president, making such
  // decisions that then impact the war through different modifiers." The modal
  // is dismissible only via response, so the IPC respond path is the only exit.
  useEffect(() => {
    if (activeEventDecisionId !== null) return;
    if (peaceWarTransitionActive) return;
    if (openingBriefPending) return;
    if (showPeacePlanModal) return;
    // Task #80 — the boot-to-menu default means an auto-loaded save with a
    // pending decision must NOT auto-pop the (non-dismissible) EventDecisionModal
    // over the Main Menu. Defer until the player is past the menu (Continue /
    // warroom desk); the effect re-runs when `appScreen` leaves 'mainMenu'.
    if (appScreen === 'mainMenu') return;
    const nextDecision = selectNextPendingEventDecision(
      loadedGameState?.pendingEventDecisions,
      playerFaction,
      recentlyAcceptedEventDecisionId,
    );
    if (nextDecision) setActiveEventDecisionId(nextDecision.event_id);
  }, [
    loadedGameState?.pendingEventDecisions,
    playerFaction,
    activeEventDecisionId,
    peaceWarTransitionActive,
    openingBriefPending,
    showPeacePlanModal,
    recentlyAcceptedEventDecisionId,
    appScreen,
  ]);

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
    setOpeningBriefDismissed(false);
    // Use scenarioKey 'apr_1992' as default for dev map, mirroring Warroom fix
    const ok = await startCampaignFromSidePicker({ ipc, loadSave, setLoadError }, faction, 'apr_1992');
    setCampaignStarting(false);
    if (ok) {
      useGameStore.getState().setPeaceWarTransitionSeen(false);
      setAppScreen('game');
      setSidePickerOpen(false);
      setSidePickerDismissed(false);
      setRecruitmentCatalog([]);
    }
  };

  const handleMainMenuLoadGame = async (json: unknown) => {
    try {
      await loadSave(json);
      setSidePickerOpen(false);
      setSidePickerDismissed(false);
      setAppScreen('game');
    } catch (err) {
      console.error('Failed to load manual save:', err);
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  };

  const dismissActiveEventDecisionError = () => {
    setActiveEventDecisionId(null);
    setLoadError(null);
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
  };

  const openDecisionHistoryOverlay = () => {
    if (appScreen !== 'game') return;
    const gs = useGameStore.getState();
    gs.setArmyHQOpen(false);
    gs.setChronicleOpen(false);
    gs.setCodexOpen(false);
    gs.setIsOperationsPanelOpen(false);
    setSummaryOpen(false);
    setIsDecisionHistoryOpen(true);
  };

  const toggleDecisionHistoryOverlay = () => {
    if (isDecisionHistoryOpen) {
      setIsDecisionHistoryOpen(false);
      return;
    }
    openDecisionHistoryOverlay();
  };

  // Keyboard shortcuts for Army HQ tabs + orphaned modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isKeyboardEventFromInteractiveControl(e)) return;
      if (activeEventDecisionIdRef.current !== null) return;

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
        // Authored Choices ledger shortcut. Mirrors the 'D' hotkey.
        e.preventDefault();
        toggleDecisionHistoryOverlay();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const gs = useGameStore.getState();
        if (gs.chronicleOpen) {
          gs.setChronicleOpen(false);
        } else {
          setIsDecisionHistoryOpen(false);
          openChronicle(gs);
        }
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        const gs = useGameStore.getState();
        if (gs.codexOpen) {
          gs.setCodexOpen(false);
        } else {
          setIsDecisionHistoryOpen(false);
          openCodex(gs);
        }
      } else if (e.key === 'd' || e.key === 'D') {
        // Phase H Packet 8 — Decision History overlay hotkey. Toggle behaviour
        // mirrors Codex (X) / Chronicle (C) for consistency. The overlay's
        // ESC handler is the canonical close path; this is the second-open
        // path so the player can dismiss via the same key they opened with.
        e.preventDefault();
        toggleDecisionHistoryOverlay();
      } else if (e.key === 'u' || e.key === 'U') {
        // Item 2 — National Humanitarian Ledger. Toggle mirrors Codex (X) /
        // Chronicle (C) / Decision History (D). Read-model only.
        e.preventDefault();
        setHumanitarianLedgerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [appScreen, activeEventDecisionId, isDecisionHistoryOpen]);

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
  };

  const openWarroomDecisionRoomFromField = (
    lens: Parameters<typeof requestDecisionRoomLens>[0] = 'all',
    cardId: string | null = null,
  ) => {
    if (activeEventDecisionId !== null) return;
    const gs = useGameStore.getState();
    requestDecisionRoomLens(lens, null, cardId);
    gs.setArmyHQOpen(false);
    gs.setCodexOpen(false);
    gs.setChronicleOpen(false);
    gs.setIsOperationsPanelOpen(false);
    setWarroomDeskOpen(false);
    setWarroomOverlaySurface(null);
    setWarroomDecisionRoomOpen(true);
    closeCommandStrip(false);
    setDiplomacyOpen(false);
    setIsDecisionHistoryOpen(false);
    setAppScreen('warroom');
    setSummaryOpen(false);
  };

  const reviewPreAdvancePriorities = () => {
    openWarroomDecisionRoomFromField('all');
  };

  const reviewPreAdvanceItem = (item: PreAdvanceCommandReviewItem) => {
    if (item.navigationTarget.kind === 'decision-room') {
      openWarroomDecisionRoomFromField(item.navigationTarget.lens, item.navigationTarget.cardId ?? null);
      return;
    }
    if (item.navigationTarget.kind === 'counter-offer') {
      setSelectedCounterOfferId(item.navigationTarget.counterOfferId);
      leaveWarroomForGame();
      setSummaryOpen(false);
      return;
    }
    if (item.navigationTarget.kind === 'enclave-dashboard') {
      setEnclaveDashboardOpen(true);
      leaveWarroomForGame();
      setSummaryOpen(false);
      return;
    }
    if (item.navigationTarget.kind === 'inbox') {
      openInboxHome();
      setSummaryOpen(false);
      return;
    }
    openPresidentialDecisionRoomNavigationTarget(item.navigationTarget, useGameStore.getState());
    leaveWarroomForGame();
    setSummaryOpen(false);
  };

  const reviewPreAdvanceTarget = (target: PresidentialDecisionRoomNavigationTarget) => {
    if (target.kind === 'decision-room') {
      openWarroomDecisionRoomFromField(target.lens, target.cardId ?? null);
      return;
    }
    if (target.kind === 'counter-offer') {
      setSelectedCounterOfferId(target.counterOfferId);
      leaveWarroomForGame();
      setSummaryOpen(false);
      return;
    }
    if (target.kind === 'enclave-dashboard') {
      setEnclaveDashboardOpen(true);
      leaveWarroomForGame();
      setSummaryOpen(false);
      return;
    }
    if (target.kind === 'inbox') {
      openInboxHome();
      setSummaryOpen(false);
      return;
    }
    openPresidentialDecisionRoomNavigationTarget(target, useGameStore.getState());
    leaveWarroomForGame();
    setSummaryOpen(false);
  };

  const openDecisionRoomTarget = (target: PresidentialDecisionRoomNavigationTarget) => {
    if (target.kind === 'decision-room') {
      openWarroomDecisionRoomFromField(target.lens, target.cardId ?? null);
      return true;
    }
    if (target.kind === 'counter-offer') {
      setSelectedCounterOfferId(target.counterOfferId);
      setSummaryOpen(false);
      return true;
    }
    if (target.kind === 'enclave-dashboard') {
      const gs = useGameStore.getState();
      gs.setArmyHQOpen(false);
      setEnclaveDashboardOpen(true);
      setSummaryOpen(false);
      return true;
    }
    if (target.kind === 'inbox') {
      openInboxHome();
      setSummaryOpen(false);
      return true;
    }
    return openPresidentialDecisionRoomNavigationTarget(target, useGameStore.getState());
  };

  // Command-surface card strip handlers. Opening a category requests the
  // Decision Room lens (done inside the strip) then opens the Warroom-native
  // Decision Room host, pre-filtered to that lens.
  const rememberWarroomFocus = () => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    warroomFocusReturnRef.current = active instanceof HTMLElement ? active : null;
  };
  const restoreWarroomFocus = () => {
    const target = warroomFocusReturnRef.current;
    warroomFocusReturnRef.current = null;
    if (!target || typeof window === 'undefined') return;
    window.setTimeout(() => {
      if (document.contains(target)) target.focus();
    }, 0);
  };
  const closeWarroomDesk = () => {
    setWarroomDeskOpen(false);
    closeCommandStrip(false);
    setWarroomDecisionRoomOpen(false);
    restoreWarroomFocus();
  };
  const closeWarroomNativeOverlay = () => {
    setWarroomOverlaySurface(null);
    setWarroomDecisionRoomOpen(false);
    restoreWarroomFocus();
  };
  const openNativeWarroomOverlayDrillIn = (surface: NativeWarroomOverlaySurface) => {
    setWarroomOverlaySurface(null);
    setWarroomDecisionRoomOpen(false);
    closeCommandStrip(false);
    if (surface === 'staff') {
      openArmyHQTab(useGameStore.getState(), 'personnel');
      leaveWarroomForGame();
      return;
    }
    if (surface === 'intelligence') {
      openArmyHQRecordsSubTab(useGameStore.getState(), 'aftermath');
      leaveWarroomForGame();
      return;
    }
    openArmyHQTab(useGameStore.getState(), 'summary');
    leaveWarroomForGame();
  };
  const openCommandStrip = (categoryId: PresidentialCommandCategoryId | null, preserveFocusTarget = true) => {
    if (preserveFocusTarget) rememberWarroomFocus();
    setWarroomDeskOpen(false);
    setWarroomOverlaySurface(null);
    setWarroomDecisionRoomOpen(false);
    setCommandStripCategoryId(categoryId);
    setCommandStripOpen(true);
  };
  const closeCommandStrip = (restoreFocus = true) => {
    setCommandStripOpen(false);
    setCommandStripCategoryId(null);
    if (restoreFocus) restoreWarroomFocus();
  };
  const leaveWarroomForGame = () => {
    setWarroomDeskOpen(false);
    setWarroomDecisionRoomOpen(false);
    setWarroomOverlaySurface(null);
    closeCommandStrip(false);
    setDiplomacyOpen(false);
    setIsDecisionHistoryOpen(false);
    setSummaryOpen(false);
    setAppScreen('game');
  };
  const returnToWarroomShell = () => {
    const gs = useGameStore.getState();
    gs.setArmyHQOpen(false);
    gs.setCodexOpen(false);
    gs.setChronicleOpen(false);
    gs.setIsOperationsPanelOpen(false);
    gs.setSelectedOsid(null);
    gs.setSelectedFormationId(null);
    gs.setSelectedCorpsId(null);
    gs.setSelectedCorpsFrontSectorId(null);
    gs.setSelectedArmyId(null);
    gs.setSelectedArmyHqId(null);
    gs.setSelectedOperationKey(null);
    gs.setSelectedOrbatCorpsId(null);
    setSummaryOpen(false);
    setIsDecisionHistoryOpen(false);
    setDiplomacyOpen(false);
    setWarroomDeskOpen(false);
    setWarroomDecisionRoomOpen(false);
    setWarroomOverlaySurface(null);
    closeCommandStrip(false);
    setAppScreen('warroom');
  };
  const openWarroomDeskFromField = () => {
    if (activeEventDecisionId !== null) return;
    const gs = useGameStore.getState();
    gs.setArmyHQOpen(false);
    gs.setCodexOpen(false);
    gs.setChronicleOpen(false);
    gs.setIsOperationsPanelOpen(false);
    setSummaryOpen(false);
    setIsDecisionHistoryOpen(false);
    setWarroomOverlaySurface(null);
    setWarroomDeskOpen(true);
    setWarroomDecisionRoomOpen(false);
    closeCommandStrip(false);
    setDiplomacyOpen(false);
    setAppScreen('warroom');
  };
  const openCommandCategory = () => {
    if (activeEventDecisionId !== null) return;
    setCommandStripOpen(false);
    setCommandStripCategoryId(null);
    setWarroomDeskOpen(false);
    setWarroomOverlaySurface(null);
    setWarroomDecisionRoomOpen(true);
  };
  const openWarroomOverlay = (surface: WarroomOverlaySurface) => {
    if (activeEventDecisionId !== null) return;
    rememberWarroomFocus();
    if (surface === 'president-desk') {
      setWarroomDeskOpen(true);
      setWarroomDecisionRoomOpen(false);
      setWarroomOverlaySurface(null);
      closeCommandStrip(false);
      return;
    }
    if (surface === 'command-surface') {
      setWarroomDeskOpen(false);
      setWarroomDecisionRoomOpen(false);
      setWarroomOverlaySurface(null);
      openCommandStrip(null, false);
      return;
    }
    if (surface === 'diplomacy') {
      setWarroomDeskOpen(false);
      setWarroomDecisionRoomOpen(false);
      setWarroomOverlaySurface(null);
      closeCommandStrip(false);
      setIsDecisionHistoryOpen(false);
      setDiplomacyOpen(true);
      return;
    }
    if (surface === 'chronicle') {
      setWarroomDeskOpen(false);
      setWarroomDecisionRoomOpen(false);
      setWarroomOverlaySurface(null);
      closeCommandStrip(false);
      setDiplomacyOpen(false);
      setIsDecisionHistoryOpen(false);
      openChronicle(useGameStore.getState());
      leaveWarroomForGame();
      return;
    }
    setWarroomDeskOpen(false);
    setWarroomDecisionRoomOpen(false);
    closeCommandStrip(false);
    setWarroomOverlaySurface(surface);
  };

  useEffect(() => {
    if (appScreen !== 'warroom') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (commandStripOpen) {
        event.preventDefault();
        closeCommandStrip();
        return;
      }
      if (warroomDecisionRoomOpen) {
        event.preventDefault();
        setWarroomDecisionRoomOpen(false);
        restoreWarroomFocus();
        return;
      }
      if (warroomDeskOpen) {
        event.preventDefault();
        closeWarroomDesk();
        return;
      }
      if (diplomacyOpen) {
        event.preventDefault();
        setDiplomacyOpen(false);
        return;
      }
      if (warroomOverlaySurface) {
        event.preventDefault();
        closeWarroomNativeOverlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appScreen, commandStripOpen, warroomDecisionRoomOpen, warroomDeskOpen, diplomacyOpen, warroomOverlaySurface]);

  const openReservePanelFromDesk = () => {
    const hqId = playerFaction === 'RS'
      ? 'vrs_main_staff'
      : playerFaction === 'HRHB'
        ? 'hvo_main_staff'
        : 'arbih_general_staff';
    useGameStore.getState().setSelectedArmyHqId(hqId);
    setSelectedReserveRequestId(null);
    leaveWarroomForGame();
    setSummaryOpen(false);
  };

  const openPersonnelFromDesk = () => {
    openArmyHQTab(useGameStore.getState(), 'personnel');
    setSelectedOfficerMatterId(null);
    leaveWarroomForGame();
    setSummaryOpen(false);
  };

  const handlePresidentialInboxAction = (action: InboxItem['action'], itemId: string) => {
    const gs = useGameStore.getState();
    setSummaryOpen(false);
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
    if (action === 'decision_room') {
      if (itemId.startsWith('opportunity:')) {
        openWarroomDecisionRoomFromField('opportunity', itemId);
      } else if (itemId.startsWith('command:review-proposal:')) {
        openWarroomDecisionRoomFromField('command', itemId);
      } else if (itemId.startsWith('officer:')) {
        openWarroomDecisionRoomFromField('command', 'pushback:player-army-co');
      } else if (itemId === 'opening-brief:desk' || itemId === 'empty:desk' || itemId.startsWith('sit:')) {
        openWarroomDeskFromField();
      } else {
        openWarroomDecisionRoomFromField('all', itemId);
      }
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
    if (action === 'dismiss_intelligence_notification') {
      setSelectedIntelligenceBriefId(itemId);
    }
  };

  const openInboxHome = () => {
    const gs = useGameStore.getState();
    setTurnAftermathOpen(false);
    setSummaryOpen(false);
    setIsDecisionHistoryOpen(false);
    openWarroomDeskFromField();
    gs.setSelectedOsid(null);
    gs.setSelectedFormationId(null);
    gs.setSelectedCorpsId(null);
    gs.setSelectedCorpsFrontSectorId(null);
    gs.setSelectedArmyId(null);
    gs.setSelectedArmyHqId(null);
    gs.setSelectedOperationKey(null);
    gs.setSelectedOrbatCorpsId(null);
    gs.setFocusedAftermathTurn(null);
    gs.setFocusedOperationHistoryId(null);
    gs.setFocusedDecisionConsequenceId(null);
  };

  const applyShellCommand = (command: ShellHandoffCommand): boolean => applyShellHandoffCommand({
    ...useGameStore.getState(),
    advanceTurnNow: () => advanceTurnAndSync({
      ipc,
      loadSave,
      clearStagedOrders,
      setLoadError,
      ...getTurnAftermathAdvanceDeps(),
    }),
  }, command);

  useEffect(() => {
    const handleShellHandoff = (event: MessageEvent) => {
      // warroom.ts posts this when REACT_SHELL_ENABLED and the player clicks "back to HQ"
      // from the game view — React switches back to the warroom screen without an iframe reload.
      if (event.data?.type === 'awwv-shell:show-warroom') {
        returnToWarroomShell();
        return;
      }

      if (event.data?.type === 'awwv-shell:fresh-campaign-started') {
        const view = new URLSearchParams(window.location.search).get('view');
        setAppScreen(view === 'warroom' ? 'warroom' : 'game');
        setOpeningBriefDismissed(false);
        setPeaceWarTransitionSeen(false);
        setActiveEventDecisionId(null);
        setRecentlyAcceptedEventDecisionId(null);
        setLoadError(null);
        return;
      }

      if (event.data?.type !== 'awwv-shell:handoff') return;
      const command = event.data?.command;
      if (!isShellHandoffCommand(command)) return;

      const handled = applyShellCommand(command);
      if (!handled) return;
      // Transition from warroom view to game view when a shell handoff arrives.
      leaveWarroomForGame();
    };

    window.addEventListener('message', handleShellHandoff);
    return () => window.removeEventListener('message', handleShellHandoff);
  }, []);

  useEffect(() => {
    if (initialShellHandoffApplied.current || !loadedGameState) return;
    const params = new URLSearchParams(window.location.search);
    const command = decodeShellHandoffCommand(params.get('shellHandoff'));
    if (!command) return;
    applyShellCommand(command);
    // Task #80 — a `?shellHandoff=...` deep-link (warroom.ts `showTacticalMapScene`)
    // opens the tactical map with no `view=game`. With the boot-to-menu default
    // the screen would stay on the Main Menu and hide the requested panel behind
    // it, so route to the in-game shell once the handoff command is applied.
    setAppScreen('game');

    params.delete('shellHandoff');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
    initialShellHandoffApplied.current = true;
  }, [loadedGameState]);

  // Activate Warroom React shell when ?view=warroom is present in the URL.
  // warroom.ts canvas rendering remains the active runtime path; this is
  // the foundation component for progressive React shell ownership.
  // Task #80 — boot now defaults to the Main Menu; `?view=game` lets
  // dev/automation deep-link straight into the in-game shell, bypassing the
  // menu (mirrors the existing `?view=warroom` override).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'warroom') {
      setAppScreen('warroom');
    } else if (view === 'game') {
      setAppScreen('game');
    } else if (params.has('desktop_window')) {
      // Task #80 — the packaged desktop app opens its tactical map windows with
      // `?desktop_window=operational` / `?desktop_window=sandbox`
      // (electron-main.cjs `getTacticalMapWindowUrl`). These windows attach to
      // an already-running session, so deep-link straight to the in-game shell
      // — but do NOT force the SidePicker (no new-game flow here).
      setAppScreen('game');
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
            modalLocked={activeEventDecisionId !== null}
            onOpenDesk={openWarroomDeskFromField}
            onOpenSummary={() => openSummary()}
            onOpenRecords={() => openArmyHQRecords('aftermath')}
            onOpenOpsHistory={() => useGameStore.getState().setIsOperationsPanelOpen(true)}
        onOpenCodex={() => openCodex(useGameStore.getState())}
            onReviewPriorities={reviewPreAdvancePriorities}
          />
        </RootErrorBoundary>
      </header>
      {tacticalChromeVisible && (
        <>
          <CommandBriefingLayer
            onOpenSummary={openSummary}
            onOpenEnclaves={() => setEnclaveDashboardOpen(true)}
            onOpenPeacePlan={() => setDismissedPeacePlanKey(null)}
          />
          <aside
            aria-label="Order of Battle"
            style={{ display: 'contents' }}
          >
            <RootErrorBoundary zone="sidebar">
              <OOBSidebar />
            </RootErrorBoundary>
          </aside>
        </>
      )}
      {/* Tactical Detail Panel */}
      {tacticalChromeVisible && (
        <RootErrorBoundary zone="right panel">
        <OperationsPanel />
        <OrderQueue />
        {tacticalDetailRailsVisible && shouldRenderInboxPanel(railState.panel, isOperationsPanelOpen) && (
          <PresidentialInbox onAction={handlePresidentialInboxAction} eventCatalog={eventCatalogFull} />
        )}
        {tacticalDetailRailsVisible && railState.panel === 'settlement' && <SelectionPanel breadcrumb={panelBreadcrumb} />}
        {tacticalDetailRailsVisible && railState.panel === 'sector' && <CorpsFrontPanel breadcrumb={panelBreadcrumb} />}
        {tacticalDetailRailsVisible && railState.panel === 'corps' && <CorpsDetail breadcrumb={panelBreadcrumb} />}
        {/* ArmyDetail retired — faction click opens Army HQ modal */}
        {tacticalDetailRailsVisible && railState.panel === 'army_reserve' && <ArmyReservePanel breadcrumb={panelBreadcrumb} />}
        {tacticalDetailRailsVisible && railState.panel === 'formation' && <FormationDetail breadcrumb={panelBreadcrumb} />}
        {tacticalDetailRailsVisible && railState.panel === 'orbat' && <OrbatPanel />}
        </RootErrorBoundary>
      )}
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
        // Task #80 — gate on `sidePickerOpen` alone. After the boot-to-menu
        // fix, `sidePickerOpen` is set true ONLY by explicit user actions
        // (MainMenu New Game / Load, warroom handoff) — the auto-open branch is
        // gone — so this never spuriously overlays an active game.
        isOpen={sidePickerOpen}
        starting={campaignStarting}
        errorMessage={loadError}
        onClose={() => {
          // Task #80 — cancel cleanly without dropping into the loading
          // skeleton. If no campaign is loaded (cancelled a true New Game),
          // return to the Main Menu. If a save is loaded (the player opened the
          // picker over an existing campaign and backed out), just close and
          // resume that campaign — `loadedGameState` is untouched.
          setSidePickerOpen(false);
          setSidePickerDismissed(true);
          if (!loadedGameState) {
            setAppScreen('mainMenu');
          }
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
        consequences={aftermathConsequences}
        forcedOps={aftermathForcedOps}
        officerResentment={aftermathOfficerResentment}
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
        onOpenCodex={(eventId) => {
          setTurnAftermathOpen(false);
          setRequestedCodexEventId(eventId ?? null);
          openCodex(useGameStore.getState());
        }}
        onReviewAction={(item) => {
          setTurnAftermathOpen(false);
          handlePresidentialInboxAction(item.action, item.id);
        }}
      />
      <RootErrorBoundary zone="army hq">
        <ArmyHQModal onDecisionRoomNavigateTarget={openDecisionRoomTarget} />
      </RootErrorBoundary>
      <ChronicleOverlay />
      <WrappedOverlay eventCatalog={eventCatalogFull} />
      <CodexPanelWrapper eventCatalog={eventCatalogFull} requestedEventId={requestedCodexEventId} />
      {/* Phase H Packet 8 — Decision History overlay (Component B per H1 §4.2B).
          Consumes H2 wave 1 helpers (getPlayerDecisionHistory +
          getCausalDescendants); same catalog + raw state as CodexPanelWrapper.
          Trigger: 'D' hotkey (see keyboard shortcut handler). The overlay
          gracefully degrades when catalog or state is absent. */}
      <DecisionHistoryOverlay
        isOpen={isDecisionHistoryOpen}
        onClose={() => setIsDecisionHistoryOpen(false)}
        eventCatalog={eventCatalogFull}
        state={loadedGameState?.rawGameState}
      />
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
      {loadedGameState && (
        <HumanitarianLedgerPanel
          state={loadedGameState}
          open={humanitarianLedgerOpen}
          onClose={() => setHumanitarianLedgerOpen(false)}
        />
      )}
      {aiSettingsOpen && (
        <AiSettingsPanel onClose={() => setAiSettingsOpen(false)} />
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
          Presidential event decisions are owned by EventDecisionModal below,
          launched from pending_event_decisions or the President's Desk inbox. */}
      {eventQueue.length > 0 && eventQueue[eventQueueIndex] && (
        <EventModal
          event={eventQueue[eventQueueIndex]}
          queuePosition={eventQueueIndex + 1}
          queueTotal={eventQueue.length}
          onAcknowledge={handleEventAcknowledge}
        />
      )}
      {/* v0.5.0: Peace Plan Modal — blocks turn progression until player responds.
          Task #80 — gated on `appScreen !== 'mainMenu'` so an auto-loaded save with
          a pending plan does not auto-pop it over the boot Main Menu (same contract
          as the EventDecisionModal auto-launch above). Shows once past the menu. */}
      {appScreen !== 'mainMenu' && showPeacePlanModal && pendingPeacePlan && (
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
            advisor={resolveEventDecisionAdvisor(decision, loadedGameState?.namedOfficerData, playerFaction)}
            errorMessage={loadError}
            onDismissError={dismissActiveEventDecisionError}
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
              const rawGameState = loadedGameState?.rawGameState;
              if (!rawGameState) {
                setLoadError('Cannot record event decision without loaded game state.');
                return;
              }
              try {
                const nextState = structuredClone(rawGameState);
                resolveBrowserEventDecision(nextState, eventId, responseId);
                await loadSave(nextState);
                setRecentlyAcceptedEventDecisionId(eventId);
                setActiveEventDecisionId(null);
              } catch (err) {
                console.warn('[EventDecisionModal] browser fallback failed', err);
                setLoadError('Failed to record event decision.');
              }
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
      {/* v0.5.0: Dayton Negotiation Modal — blocks when Dayton trigger fires.
          Task #80 — gated on `appScreen !== 'mainMenu'` (same contract as the
          EventDecision / PeacePlan / EventModal auto-pop guards): an auto-loaded
          save sitting at the Dayton step must not cover the boot Main Menu with
          this non-dismissible modal. Shows once the player is past the menu. */}
      {appScreen !== 'mainMenu' && loadedGameState?.pendingDayton && !loadedGameState?.gameOver && (
        <DaytonNegotiationModal dayton={loadedGameState.pendingDayton} />
      )}
      <PeaceWarTransitionOverlay />
      <VerdictScreen />
      <ReplayInspectionBanner />
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
              leaveWarroomForGame();
              setSidePickerOpen(true);
              setSidePickerDismissed(false);
            }}
            statusDock={(
              <WarroomStatusBar
                onReviewPriorities={reviewPreAdvancePriorities}
                onReviewItem={reviewPreAdvanceItem}
                onReviewTarget={reviewPreAdvanceTarget}
              />
            )}
            onNavigate={(command) => {
              if (isWarroomLocalCommand(command)) {
                if (command.kind === 'warroom-overlay') {
                  setWarroomDecisionRoomOpen(false);
                  openWarroomOverlay(command.surface);
                  return;
                }
                if (command.kind === 'war-map') {
                  leaveWarroomForGame();
                }
                return;
              }
              if (!command) return;
              if (command.kind === 'advance-turn') {
                setWarroomOverlaySurface(null);
                setWarroomDeskOpen(false);
                setWarroomDecisionRoomOpen(false);
                closeCommandStrip(false);
              }
              if (command) {
                applyShellCommand(command);
              }
              if (!warroomCommandStaysInRoom(command)) {
                leaveWarroomForGame();
              }
            }}
          />
          {warroomDeskOpen && (
            <PresidentDeskShell
              state={loadedGameState}
              osidNameMap={osidDisplayNames}
              eventCatalog={eventCatalogFull}
              onAction={handlePresidentialInboxAction}
              onAdvance={() => useGameStore.getState().setAdvanceTurnPending(true)}
              onOpenArmyHQ={() => {
                openArmyHQTab(useGameStore.getState(), 'briefing');
                leaveWarroomForGame();
              }}
              onOpenMap={leaveWarroomForGame}
              onOpenRecords={() => {
                openArmyHQRecordsSubTab(useGameStore.getState(), 'aftermath');
                leaveWarroomForGame();
              }}
              onOpenDecisionRecords={(recordId) => {
                openArmyHQDecisionConsequenceRecord(useGameStore.getState(), recordId);
                leaveWarroomForGame();
              }}
              onOpenChronicle={(recordId) => {
                if (recordId) {
                  openChronicleDecisionRecord(useGameStore.getState(), recordId);
                } else {
                  openChronicle(useGameStore.getState());
                }
                leaveWarroomForGame();
              }}
              onClose={() => {
                closeWarroomDesk();
              }}
              onReviewAdvance={() => useGameStore.getState().setAdvanceTurnPending(true)}
              onOpenCommandSurface={() => openCommandStrip(null)}
            />
          )}
          {commandStripOpen && (
            <CommandCardStrip
              initialCategoryId={commandStripCategoryId}
              onOpenCategory={openCommandCategory}
              onClose={() => closeCommandStrip()}
            />
          )}
          {warroomDecisionRoomOpen && (
            <div
              role="dialog"
              aria-label={t('warroomDecisionRoom.host.aria')}
              aria-modal="false"
              data-testid="warroom-decision-room-host"
              className="pointer-events-auto absolute inset-x-3 bottom-20 z-[6] mx-auto max-h-[76%] max-w-6xl overflow-y-auto rounded-md border border-accent-gold/35 bg-panel-bg/96 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-md xl:left-10 xl:right-10"
            >
              <div className="mb-3 flex items-end justify-between gap-2 border-b border-panel-border/70 pb-2">
                <div>
                  <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-accent-gold">{t('warroomDecisionRoom.host.eyebrow')}</div>
                  <h2 className="mt-0.5 text-[15px] font-bold leading-tight text-text-primary">{t('warroomDecisionRoom.host.title')}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWarroomDecisionRoomOpen(false);
                    restoreWarroomFocus();
                  }}
                  aria-label={t('warroomDecisionRoom.host.closeAria')}
                  data-testid="warroom-decision-room-close"
                  className="shrink-0 rounded border border-panel-border bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
                >
                  {t('warroomDecisionRoom.host.close')}
                </button>
              </div>
              <PresidentialDecisionRoomPanel onNavigateTarget={reviewPreAdvanceTarget} />
            </div>
          )}
          {warroomOverlaySurface && (
            <WarroomNativeOverlay
              surface={warroomOverlaySurface}
              onClose={closeWarroomNativeOverlay}
              onDrillIn={() => openNativeWarroomOverlayDrillIn(warroomOverlaySurface)}
            />
          )}
        </div>
      )}

      {/* v0.5.1: Menu system overlays */}
      {appScreen === 'mainMenu' && (
        <MainMenu
          hasSave={!!loadedGameState}
          starting={campaignStarting}
          errorMessage={loadError}
          // Main-menu side selection is inline; the SidePicker modal is not
          // part of the New Game / Load path from the splash screen.
          onNewGame={(faction) => void handleSelectFaction(faction)}
          onContinue={() => setAppScreen('game')}
          onLoadGame={(json) => void handleMainMenuLoadGame(json)}
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
      {/* v0.9.2 tutorial onboarding deck - auto-mounted at app root (task #77).
          Only on the in-game screen with a loaded save and no blocking
          presidential surface. The overlay's own `shouldShowOnboarding`
          predicate handles first-run vs dismissed state from existing
          `meta.tutorial_state`; restart still flows through Settings. */}
      {appScreen === 'game' && loadedGameState && !onboardingBlockingOverlayActive && <OnboardingOverlayWrapper />}
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
