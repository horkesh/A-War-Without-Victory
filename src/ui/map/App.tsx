import { useEffect, useState } from 'react';
import { MapContainer } from './map/MapContainer';
import { MapModeToolbar } from './components/MapModeToolbar';
import { TopToolbar } from './components/TopToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { CorpsFrontPanel } from './components/CorpsFrontPanel';
import { FormationDetail } from './components/FormationDetail';
import { CorpsDetail } from './components/CorpsDetail';
import { ArmyDetail } from './components/ArmyDetail';
import { Minimap } from './components/Minimap';
import { BottomStatusStrip } from './components/BottomStatusStrip';
import { OOBSidebar } from './components/OOBSidebar';
import { OrderQueue } from './components/OrderQueue';
import { Tooltip } from './components/Tooltip';
import { AttackConfirmation } from './components/AttackConfirmation';
import { SupplyPanel } from './components/SupplyPanel';
import { useGameStore } from './store/gameStore';
import { getOsidDisplayName } from './utils/osidDisplayName';
import { getFormationsAtOsid } from './utils/formationAtOsid';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

interface DesktopBridge {
  stageAttackOrder?: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; error?: string }>;
  queryCombatEstimate?: (brigadeId: string, targetSettlementId: string) => Promise<{ ok: boolean; win_probability?: number; error?: string }>;
  getCurrentGameState?: () => Promise<string | null>;
  setGameStateUpdatedCallback?: (cb: ((stateJson: string) => void) | null) => void;
}

/** Desktop bridge (Electron preload); undefined when run in browser. */
const awwv = typeof window !== 'undefined'
  ? (window as unknown as { awwv?: DesktopBridge }).awwv
  : undefined;

function App() {
  // Phase C3: single key handler (Enter, 1–4, Escape)
  useKeyboardShortcuts();

  const pendingAttackConfirmation = useGameStore((s) => s.pendingAttackConfirmation);
  const setPendingAttackConfirmation = useGameStore((s) => s.setPendingAttackConfirmation);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const loadSave = useGameStore((s) => s.loadSave);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const setConfirmPrimaryAction = useGameStore((s) => s.setConfirmPrimaryAction);
  const mapMode = useGameStore((s) => s.mapMode);

  // Desktop state bootstrap + subscription (standalone window and embedded bridge).
  useEffect(() => {
    if (!awwv?.getCurrentGameState || !awwv?.setGameStateUpdatedCallback) return;
    let active = true;
    const applyStateJson = async (stateJson: string | null) => {
      if (!active || !stateJson) return;
      try {
        await loadSave(stateJson);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
      }
    };
    awwv.setGameStateUpdatedCallback((stateJson: string) => {
      void applyStateJson(stateJson);
    });
    void awwv.getCurrentGameState()
      .then((stateJson) => applyStateJson(stateJson))
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
      });
    return () => {
      active = false;
      awwv.setGameStateUpdatedCallback?.(null);
    };
  }, [loadSave, setLoadError]);

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
    if (awwv?.queryCombatEstimate) {
      awwv.queryCombatEstimate(attackerFormationId, targetOsid).then((r) => {
        if (r?.ok && r.win_probability != null) {
          setCombatOdds(`${Math.round(r.win_probability * 100)}% win`);
        } else {
          setCombatOdds('—');
        }
      }).catch(() => setCombatOdds('—'));
    }
  }, [pendingAttackConfirmation, setConfirmPrimaryAction]);

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

  const handleAttackConfirm = () => {
    if (!pendingAttackConfirmation) return;
    const { attackerFormationId, targetOsid } = pendingAttackConfirmation;
    if (awwv?.stageAttackOrder) {
      awwv.stageAttackOrder(attackerFormationId, targetOsid).then((r) => {
        if (!r.ok) console.warn('[AttackConfirmation] stageAttackOrder failed:', r.error);
        setPendingAttackConfirmation(null);
      }).catch((err) => {
        console.warn('[AttackConfirmation] stageAttackOrder error:', err);
        setPendingAttackConfirmation(null);
      });
    } else {
      setPendingAttackConfirmation(null);
    }
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
      if (awwv?.stageAttackOrder) {
        awwv.stageAttackOrder(pending.attackerFormationId, pending.targetOsid).then((r) => {
          if (!r.ok) console.warn('[AttackConfirmation] stageAttackOrder failed:', r.error);
          useGameStore.getState().setPendingAttackConfirmation(null);
        }).catch((err) => {
          console.warn('[AttackConfirmation] stageAttackOrder error:', err);
          useGameStore.getState().setPendingAttackConfirmation(null);
        });
      } else {
        state.setPendingAttackConfirmation(null);
      }
    });
    return () => setConfirmPrimaryAction(null);
  }, [pendingAttackConfirmation, setConfirmPrimaryAction]);

  return (
    <div className="h-screen w-screen relative">
      <MapContainer />
      <MapModeToolbar />
      <TopToolbar />
      <OOBSidebar />
      <OrderQueue />
      <SelectionPanel />
      <CorpsFrontPanel />
      <CorpsDetail />
      <ArmyDetail />
      <FormationDetail />
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
      {mapMode === 'supply' && loadedGameState && (
        <SupplyPanel state={loadedGameState} />
      )}
      <Minimap />
      <BottomStatusStrip />
    </div>
  );
}

export default App;
