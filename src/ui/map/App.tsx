import { useEffect, useRef, useState } from 'react';
import { MapContainer } from './map/MapContainer';
import { MapModeToolbar } from './components/MapModeToolbar';
import { TopToolbar } from './components/TopToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { CorpsFrontPanel } from './components/CorpsFrontPanel';
import { FormationDetail } from './components/FormationDetail';
import { ArmyReservePanel } from './components/ArmyReservePanel';
import { CorpsDetail } from './components/CorpsDetail';
import { ArmyDetail } from './components/ArmyDetail';
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
import { OpsPlanningModal } from './components/OpsPlanningModal';
import { CommanderSelectionModal } from './components/CommanderSelectionModal';
import { OperationBriefingModal } from './components/OperationBriefingModal';
import { SupplyPanel } from './components/SupplyPanel';
import { EnclaveDashboard } from './components/EnclaveDashboard';
import { AARPanel } from './components/AARPanel';
import { OperationHistoryPanel } from './components/OperationHistoryPanel';
import { CommandBriefingLayer } from './components/CommandBriefingLayer';
import { derivePanelRailState } from './components/panelRail';
import { useGameStore, isDevMode } from './store/gameStore';
import { loadLatestRunSaveAsText } from './data/DataLoader';
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
    try {
      const result = await ipc.stageAssignOperationCommander({
        corpsId: ctx.corpsId,
        operationName: ctx.operationName,
        officerId,
      });
      if (!result.ok) {
        console.warn('[CommanderSelection] assign failed:', result.error);
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
  const playerFaction = loadedGameState?.player_faction ?? null;
  const mapMode = useGameStore((s) => s.mapMode);
  const railState = derivePanelRailState({
    selectedOsid,
    selectedArmyId,
    selectedCorpsId,
    selectedCorpsFrontSectorId,
    selectedFormationId,
    selectedOperationKey,
    selectedOrbatCorpsId,
  });

  const [sidePickerOpen, setSidePickerOpen] = useState(false);
  const [sidePickerDismissed, setSidePickerDismissed] = useState(false);
  const [campaignStarting, setCampaignStarting] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocusSection>('overview');
  const [enclaveDashboardOpen, setEnclaveDashboardOpen] = useState(false);
  const [aarOpen, setAarOpen] = useState(false);
  const [opsHistoryOpen, setOpsHistoryOpen] = useState(false);
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
    if (ipc.isAvailable && !sidePickerDismissed) {
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
  };

  return (
    <div className="h-screen w-screen relative">
      <MapContainer />
      <MapModeToolbar />
      <TopToolbar
        onOpenRecruitment={openRecruitmentModal}
        onOpenSidePicker={() => {
          setSidePickerDismissed(false);
          setSidePickerOpen(true);
        }}
        onOpenSummary={openSummary}
        onOpenEnclaves={() => setEnclaveDashboardOpen((current) => !current)}
        onOpenAAR={() => setAarOpen((current) => !current)}
        onOpenOpsHistory={() => setOpsHistoryOpen((current) => !current)}
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
      {railState.primary === 'army' && <ArmyDetail railSlot="primary" />}
      {railState.primary === 'formation' && (
        loadedGameState?.formations.find(f => f.id === selectedFormationId)?.kind === 'army_hq'
          ? <ArmyReservePanel railSlot="primary" />
          : <FormationDetail railSlot="primary" />
      )}
      {railState.primary === 'operation' && <OperationDetail railSlot="primary" />}
      {railState.primary === 'orbat' && <OrbatPanel />}

      {railState.secondary === 'settlement' && <SelectionPanel railSlot="secondary" />}
      {railState.secondary === 'sector' && <CorpsFrontPanel railSlot="secondary" />}
      {railState.secondary === 'corps' && <CorpsDetail railSlot="secondary" />}
      {railState.secondary === 'formation' && (
        loadedGameState?.formations.find(f => f.id === selectedFormationId)?.kind === 'army_hq'
          ? <ArmyReservePanel railSlot="secondary" />
          : <FormationDetail railSlot="secondary" />
      )}
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
      <Minimap />
      <BottomStatusStrip />
    </div>
  );
}

export default App;
