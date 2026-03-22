import { useEffect, useRef, useState } from 'react';
import { MapContainer } from './map/MapContainer';
import { TopToolbar } from './components/TopToolbar';
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
import { OperationDetail } from './components/OperationDetail';
import { OrbatPanel } from './components/OrbatPanel';
import { OrderQueue } from './components/OrderQueue';
import { Tooltip } from './components/Tooltip';
import { AttackConfirmation } from './components/AttackConfirmation';
import { SidePickerOverlay } from './components/SidePickerOverlay';
import { RecruitmentModal } from './components/RecruitmentModal';
import { WarSummaryModal } from './components/WarSummaryModal';
import { OpsPlanningModal } from './components/ops_modal/OpsPlanningModal';
import { CommanderSelectionModal } from './components/CommanderSelectionModal';
import { OperationBriefingModal } from './components/OperationBriefingModal';
import { SupplyPanel } from './components/SupplyPanel';
import { EconomyPanel } from './components/EconomyPanel';
import { EnclaveDashboard } from './components/EnclaveDashboard';
import { AARPanel } from './components/AARPanel';
import { OperationHistoryPanel } from './components/OperationHistoryPanel';
import { EventModal } from './components/EventModal';
import { EventLogPanel } from './components/EventLogPanel';
import { AiAdvisorPanel } from './components/AiAdvisorPanel';
import { AiSettingsPanel } from './components/AiSettingsPanel';
import type { EventDisplayData } from './components/EventModal';
import type { EventLogEntry } from './components/EventLogPanel';
import { CommandBriefingLayer } from './components/CommandBriefingLayer';
import { PeacePlanModal } from './components/PeacePlanModal';
import { DaytonNegotiationModal } from './components/DaytonNegotiationModal';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import { SettingsScreen } from './components/SettingsScreen';
import { CreditsScreen } from './components/CreditsScreen';
import { MapModeLegend } from './components/MapModeLegend';
import { PeaceStatusPanel } from './components/PeaceStatusPanel';
import { PeaceWarTransition } from './components/PeaceWarTransition';
import { ChronicleOverlay } from './components/chronicle/ChronicleOverlay';
import { VerdictScreen } from './components/VerdictScreen';
import { derivePanelRailState } from './components/panelRail';
import { useGameStore, isDevMode } from './store/gameStore';
import { loadLatestRunSaveAsText, loadEventDefinitions } from './data/DataLoader';
import { getOsidDisplayName } from './utils/osidDisplayName';
import { getFormationsAtOsid } from './utils/formationAtOsid';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDesktopSession } from './hooks/useDesktopSession';
import { useIPC } from './desktop/useIPC';
import type { RecruitmentCatalogBrigade, StartNewCampaignPayload } from './desktop/types';
import type { SummaryFocusSection } from './data/types';
import {
  applyRecruitmentAndSync,
  fetchRecruitmentCatalog,
  startCampaignFromSidePicker,
} from './desktop/campaignRecruitmentActions';

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

  return (
    <OperationBriefingModal
      isOpen
      onClose={() => close(null)}
      onLaunch={() => handleDecision('launch')}
      onPostpone={() => handleDecision('postpone')}
      onAbort={() => handleDecision('abort')}
      onOrderProbe={() => handleDecision('probe')}
    />
  );
}

function PeaceWarTransitionOverlay() {
  const state = useGameStore((s) => s.loadedGameState);
  const seen = useGameStore((s) => s.peaceWarTransitionSeen);
  const setSeen = useGameStore((s) => s.setPeaceWarTransitionSeen);

  // Show when phase is 'war' and turn is early (first war turn) and not yet dismissed
  if (!state || seen || state.phase !== 'war') return null;
  // Only show on the first war turn (turn <= 1 from war start, approximated by low turn number or first load)
  // Since we can't easily detect "just transitioned", show if turn <= 5 and not yet seen
  if ((state.turn ?? 0) > 5) return null;

  return <PeaceWarTransition state={state} onDismiss={() => setSeen(true)} />;
}

function App() {
  // Phase C3: single key handler (Enter, 1–5, Escape)
  useKeyboardShortcuts();
  useDesktopSession();
  const ipc = useIPC();

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
  const playerFaction = loadedGameState?.player_faction ?? 'RBiH';
  const mapMode = useGameStore((s) => s.mapMode);
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

  const [appScreen, setAppScreen] = useState<'game' | 'mainMenu'>('game');
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
  const [aarOpen, setAarOpen] = useState(false);
  const [opsHistoryOpen, setOpsHistoryOpen] = useState(false);
  const [eventLogOpen, setEventLogOpen] = useState(false);
  const [economyOpen, setEconomyOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiAdvisorOpen, setAiAdvisorOpen] = useState(false);
  const [aiAdvisorResponse, setAiAdvisorResponse] = useState<any>(null);
  const [eventQueue, setEventQueue] = useState<EventDisplayData[]>([]);
  const [eventQueueIndex, setEventQueueIndex] = useState(0);
  const [acknowledgedEventIds, setAcknowledgedEventIds] = useState<Set<string>>(new Set());
  const [peacePlanDismissed, setPeacePlanDismissed] = useState(false);
  const [recruitmentLoading, setRecruitmentLoading] = useState(false);
  const [recruitmentApplying, setRecruitmentApplying] = useState(false);
  const [recruitmentCatalog, setRecruitmentCatalog] = useState<RecruitmentCatalogBrigade[]>([]);
  const recruitmentCatalogRequestId = useRef(0);

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
    (window as any).handleManualSaveLoad = async (json: any) => {
      try {
        await loadSave(json);
        setSidePickerOpen(false);
        setSidePickerDismissed(false);
      } catch (err) {
        console.error('Failed to load manual save:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    };
    (window as any).handleContinueLastRun = async () => {
      try {
        const text = await loadLatestRunSaveAsText();
        const json = JSON.parse(text);
        await loadSave(json);
        setSidePickerOpen(false);
        setSidePickerDismissed(false);
      } catch (err) {
        console.error('Failed to continue last run:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    };
    return () => {
      delete (window as any).handleManualSaveLoad;
      delete (window as any).handleContinueLastRun;
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
    const newEvents = fired.filter(e => !acknowledgedEventIds.has(e.id));
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
            description: eff.text ?? (eff.faction ? `${eff.faction} ${eff.kind} ${(eff.delta ?? 0) > 0 ? '+' : ''}${eff.delta ?? ''}` : eff.kind),
          })) ?? e.effects,
          isDecision: e.isDecision,
          responseOptions: e.responseOptions,
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

  // v0.4.1 Phase 5: also check pending event decisions (live only)
  useEffect(() => {
    if (!ipc.isAvailable) return;
    if (!loadedGameState) return;
    const pending = loadedGameState.pendingEventDecisions;
    if (!pending || pending.length === 0) return;

    // Convert pending decisions to EventDisplayData for modal display
    const decisionEvents: EventDisplayData[] = pending.map(d => ({
      id: d.event_id,
      title: d.event_title,
      narrative: '',
      category: 'political',
      effects: [],
      isDecision: true,
      responseOptions: d.response_options.map(opt => ({
        id: opt.id,
        label: opt.label,
        description: opt.description,
      })),
    }));

    if (decisionEvents.length > 0 && eventQueue.length === 0) {
      setEventQueue(decisionEvents);
      setEventQueueIndex(0);
    }
  }, [loadedGameState?.pendingEventDecisions?.length]);

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

  const handleEventDecisionResponse = async (responseId: string) => {
    const current = eventQueue[eventQueueIndex];
    if (current) {
      if (ipc.isAvailable) {
        const result = await ipc.respondToEventDecision(current.id, responseId);
        if (!result.ok) {
          console.error('[EventModal] Decision response failed:', result.error);
        }
      }
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
    // Close other History-group panels so high-z summary doesn't occlude them
    setAarOpen(false);
    setOpsHistoryOpen(false);
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
        const pf = gs.loadedGameState?.player_faction;
        if (pf) { gs.setSelectedArmyId(pf); gs.setArmyHQOpen(true); gs.setArmyHQTab('briefing'); }
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const gs = useGameStore.getState();
        const pf = gs.loadedGameState?.player_faction;
        if (pf) { gs.setSelectedArmyId(pf); gs.setArmyHQOpen(true); gs.setArmyHQTab('summary'); }
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEventLogOpen(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const gs = useGameStore.getState();
        gs.setChronicleOpen(!gs.chronicleOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openOrbat = () => {
    // If no corps selected for orbat, pick the first player corps
    if (!useGameStore.getState().selectedOrbatCorpsId && loadedGameState) {
      const firstCorps = loadedGameState.formations.find(f => (f.kind === 'corps' || f.kind === 'corps_asset') && f.faction === playerFaction);
      if (firstCorps) useGameStore.getState().setSelectedOrbatCorpsId(firstCorps.id);
    }
    // Summary/AAR etc are full-screen modals; close them to show sidebar panels
    setSummaryOpen(false);
    setAarOpen(false);
  };

  const selectPrimaryArmy = () => {
    if (!loadedGameState) return;
    const army = loadedGameState.formations.find(f => f.kind === 'army_hq' && f.faction === playerFaction);
    if (army) {
      useGameStore.getState().setSelectedArmyHqId(army.id);
      useGameStore.getState().setSelectedFormationId(null);
      // Pan to it if possible
      const pan = useGameStore.getState().panToOsid;
      if (pan && army.home_osid) pan(army.home_osid);
    }
  };

  const selectPrimaryCorps = () => {
    if (!loadedGameState) return;
    const corps = loadedGameState.formations.find(f => (f.kind === 'corps' || f.kind === 'corps_asset') && f.faction === playerFaction);
    if (corps) {
      useGameStore.getState().setSelectedCorpsId(corps.id);
      useGameStore.getState().setSelectedFormationId(null);
      // Pan to it if possible
      const pan = useGameStore.getState().panToOsid;
      if (pan && corps.home_osid) pan(corps.home_osid);
    }
  };

  return (
    <div className="h-screen w-screen relative">
      <MapContainer />
      <PresidentialToolbar
        pendingDecisions={loadedGameState?.pendingEventDecisions?.length ?? 0}
        pressureWarning={loadedGameState?.pressureWarning ?? false}
        pendingOfficerEvents={Boolean(loadedGameState?.pendingOfficerEvents?.length)}
      />
      <CommandBriefingLayer
        onOpenSummary={openSummary}
        onOpenEnclaves={() => setEnclaveDashboardOpen(true)}
      />
      <OOBSidebar />
      <OperationsPanel />
      <OrderQueue />
      {/* Tactical Detail Panels (Nested Rail Architecture) */}
      {railState.primary === 'settlement' && <SelectionPanel railSlot="primary" />}
      {railState.primary === 'sector' && <CorpsFrontPanel railSlot="primary" />}
      {railState.primary === 'corps' && <CorpsDetail railSlot="primary" />}
      {/* ArmyDetail retired — faction click opens Army HQ modal */}
      {railState.primary === 'army_reserve' && <ArmyReservePanel railSlot="primary" />}
      {railState.primary === 'formation' && <FormationDetail railSlot="primary" />}
      {railState.primary === 'operation' && <OperationDetail railSlot="primary" />}
      {railState.primary === 'orbat' && <OrbatPanel />}

      {railState.secondary === 'settlement' && <SelectionPanel railSlot="secondary" />}
      {railState.secondary === 'sector' && <CorpsFrontPanel railSlot="secondary" />}
      {railState.secondary === 'corps' && <CorpsDetail railSlot="secondary" />}
      {railState.secondary === 'formation' && <FormationDetail railSlot="secondary" />}
      {railState.secondary === 'operation' && <OperationDetail railSlot="secondary" />}
      <Tooltip />
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
        isOpen={sidePickerOpen}
        starting={campaignStarting}
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
      <AARPanel isOpen={aarOpen} onClose={() => setAarOpen(false)} />
      <OperationHistoryPanel isOpen={opsHistoryOpen} onClose={() => setOpsHistoryOpen(false)} />
      <ArmyHQModal />
      <ChronicleOverlay />
      <OpsPlanningModal />
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
      {aiAdvisorOpen && (
        <AiAdvisorPanel
          response={aiAdvisorResponse}
          loading={!aiAdvisorResponse}
          onClose={() => { setAiAdvisorOpen(false); setAiAdvisorResponse(null); }}
        />
      )}
      {loadedGameState?.phase === 'peace' && <PeaceStatusPanel />}
      {/* v0.4.1 Phase 5: Event modal (queue-based) */}
      {eventQueue.length > 0 && eventQueue[eventQueueIndex] && (
        <EventModal
          event={eventQueue[eventQueueIndex]}
          queuePosition={eventQueueIndex + 1}
          queueTotal={eventQueue.length}
          onAcknowledge={handleEventAcknowledge}
          onDecisionResponse={handleEventDecisionResponse}
        />
      )}
      {/* v0.5.0: Peace Plan Modal — blocks turn progression until player responds */}
      {loadedGameState?.pendingPeacePlan && !peacePlanDismissed && (
        <PeacePlanModal
          plan={loadedGameState.pendingPeacePlan}
          onDismiss={() => setPeacePlanDismissed(true)}
        />
      )}
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
      <MapModeLegend />
      <Minimap />
      <BottomStatusStrip />

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
    </div>
  );
}

export default App;
