/**
 * Phase C3: Keyboard shortcuts (PHASE_C_EXECUTION_PLAN.md).
 * Single keydown handler: Enter → confirm primary (e.g. modal); 1–6 → map mode; Escape → clear selection + tooltip.
 * Does not fire when focus is inside input/textarea.
 */
import { useEffect } from 'react';
import { useGameStore, type MapMode } from '../store/gameStore';

const MAP_MODES_BY_KEY: MapMode[] = ['political', 'ethnic', 'supply', 'casualties', 'morale', 'operations', 'defense'];

function isFocusInInput(): boolean {
  const tag = document.activeElement?.tagName?.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFocusInInput()) return;

      // Ctrl+S → quick-save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        const awwv = (window as unknown as { awwv?: { quickSave: () => Promise<unknown> } }).awwv;
        if (awwv?.quickSave) {
          awwv.quickSave().catch(() => { /* swallow */ });
        }
        return;
      }

      if (event.key === 'Escape') {
        const { setHoveredOsids, clearTooltipTarget, setPendingAttackConfirmation, setOrderModeForFormation, setOperationTargetOsids } = useGameStore.getState();
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
  }, []);
}
