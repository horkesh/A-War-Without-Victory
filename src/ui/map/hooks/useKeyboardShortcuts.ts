/**
 * Phase C3: Keyboard shortcuts (PHASE_C_EXECUTION_PLAN.md).
 * Single keydown handler: Enter → confirm primary (e.g. modal); 1–6 → map mode; Escape → clear selection + tooltip.
 * Does not fire when focus is inside input/textarea.
 */
import { useEffect, useRef } from 'react';
import { advanceTurnAndSync } from '../desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from '../desktop/turnAftermathAdvanceDeps';
import { useIPC } from '../desktop/useIPC';
import { getPlayerFacingFaction } from '../../shared/playerFacingLabels';
import { useGameStore, type MapMode } from '../store/gameStore';

const MAP_MODES_BY_KEY: MapMode[] = ['political', 'ethnic', 'supply', 'casualties', 'morale', 'operations', 'defense'];

function isFocusInInput(): boolean {
  const tag = document.activeElement?.tagName?.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function useKeyboardShortcuts(): void {
  const ipc = useIPC();
  const loadSave = useGameStore((s) => s.loadSave);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const advancingRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFocusInInput()) return;

      // Ctrl+S → quick-save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (ipc.isAvailable) {
          ipc.quickSave().catch(() => { /* swallow */ });
        }
        return;
      }

      if (event.key === 'Escape') {
        // If Army HQ modal is open, let it handle its own Escape (level-up navigation)
        if (useGameStore.getState().armyHQOpen) return;
        const store = useGameStore.getState();
        const hasSelection = store.selectedOsid || store.selectedFormationId || store.selectedCorpsFrontSectorId || store.selectedCorpsId || store.selectedArmyId || store.selectedOperationKey;
        if (hasSelection) {
          // Clear selections first
          const { setHoveredOsids, clearTooltipTarget, setPendingAttackConfirmation, setOrderModeForFormation, setOperationTargetOsids } = store;
          useGameStore.setState({
            selectedOsid: null,
            selectedFormationId: null,
            selectedCorpsFrontSectorId: null,
            selectedCorpsId: null,
            selectedArmyId: null,
            selectedArmyHqId: null,
            selectedOperationKey: null,
          });
          setHoveredOsids([]);
          setOperationTargetOsids([]);
          clearTooltipTarget();
          setPendingAttackConfirmation(null);
          setOrderModeForFormation(null);
        } else {
          // Nothing selected — toggle pause menu
          useGameStore.setState({ pauseMenuOpen: !store.pauseMenuOpen });
        }
        return;
      }

      if (event.key === 'Enter') {
        const fn = useGameStore.getState().confirmPrimaryAction;
        if (fn) {
          event.preventDefault();
          fn();
        }
        return;
      }

      // H → toggle Army HQ modal (handled in App.tsx with tab support)
      // S → open Army HQ summary tab (handled in App.tsx)
      if (event.key === 'h' || event.key === 'H' || (event.key === 's' && !event.ctrlKey && !event.metaKey)) {
        return; // Let App.tsx handler manage HQ shortcuts
      }

      // Tab → cycle through corps (within HQ or sidebar)
      if (event.key === 'Tab') {
        event.preventDefault();
        const store = useGameStore.getState();
        const state = store.loadedGameState;
        const faction = getPlayerFacingFaction(state);
        if (!state || !faction) return;
        const corpsFormations = state.formations.filter(
          (f) => f.faction === faction && (f.kind === 'corps' || f.kind === 'corps_asset')
        );
        if (corpsFormations.length === 0) return;
        if (store.armyHQOpen) {
          // Cycle expanded corps within HQ
          const currentIdx = corpsFormations.findIndex((c) => c.id === store.armyHQExpandedCorpsId);
          const nextIdx = event.shiftKey
            ? (currentIdx <= 0 ? corpsFormations.length - 1 : currentIdx - 1)
            : (currentIdx + 1) % corpsFormations.length;
          store.setArmyHQExpandedCorpsId(corpsFormations[nextIdx].id);
        } else {
          // Cycle selected corps in sidebar
          const currentIdx = corpsFormations.findIndex((c) => c.id === store.selectedCorpsId);
          const nextIdx = event.shiftKey
            ? (currentIdx <= 0 ? corpsFormations.length - 1 : currentIdx - 1)
            : (currentIdx + 1) % corpsFormations.length;
          store.setSelectedCorpsId(corpsFormations[nextIdx].id);
        }
        return;
      }

      // Space → advance turn through the canonical order action, not DOM shell clicks.
      if (event.key === ' ') {
        event.preventDefault();
        if (event.repeat || advancingRef.current) return;
        const store = useGameStore.getState();
        if (!ipc.isAvailable || !store.loadedGameState) return;
        advancingRef.current = true;
        advanceTurnAndSync({
          ipc,
          loadSave,
          clearStagedOrders,
          setLoadError,
          ...getTurnAftermathAdvanceDeps(),
        })
          .finally(() => {
            advancingRef.current = false;
          });
        return;
      }

      // O → toggle operations panel
      if (event.key === 'o' || event.key === 'O') {
        const store = useGameStore.getState();
        store.setIsOperationsPanelOpen(!store.isOperationsPanelOpen);
        return;
      }

      const n = Number(event.key);
      const digit = n >= 1 && n <= 7 ? n : 0;
      if (digit >= 1 && digit <= MAP_MODES_BY_KEY.length) {
        const mode = MAP_MODES_BY_KEY[digit - 1];
        useGameStore.getState().setMapMode(mode);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ipc, loadSave, clearStagedOrders, setLoadError]);
}
