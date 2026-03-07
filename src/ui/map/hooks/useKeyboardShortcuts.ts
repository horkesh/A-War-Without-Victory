/**
 * Phase C3: Keyboard shortcuts (PHASE_C_EXECUTION_PLAN.md).
 * Single keydown handler: Enter → confirm primary (e.g. modal); 1–6 → map mode; Escape → clear selection + tooltip.
 * Does not fire when focus is inside input/textarea.
 */
import { useEffect } from 'react';
import { useGameStore, type MapMode } from '../store/gameStore';

const MAP_MODES_BY_KEY: MapMode[] = ['political', 'ethnic', 'supply', 'pressure', 'density', 'operations'];

function isFocusInInput(): boolean {
  const tag = document.activeElement?.tagName?.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFocusInInput()) return;

      if (event.key === 'Escape') {
        const { setSelectedOsid, setSelectedFormationId, setHoveredOsids, clearTooltipTarget, setPendingAttackConfirmation, setOrderModeForFormation } = useGameStore.getState();
        setSelectedOsid(null);
        setSelectedFormationId(null);
        setHoveredOsids([]);
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
      const digit = n >= 1 && n <= 6 ? n : 0;
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
