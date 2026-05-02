/**
 * AdvanceTurnModal — React confirmation dialog for advancing the turn.
 *
 * Triggered when the player clicks the wall_calendar_area hotspot in the
 * React WarroomShellLayer. The Warroom shell posts an 'advance-turn'
 * ShellHandoffCommand → applyShellHandoffCommand sets advanceTurnPending=true
 * in gameStore → this modal renders.
 *
 * Uses the same advanceTurnAndSync path as PresidentialToolbar so advance-turn
 * behaviour is identical regardless of which surface the player uses.
 *
 * Canonical owner: src/ui/map/components/warroom/AdvanceTurnModal.tsx
 */

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { advanceTurnAndSync } from '../../desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from '../../desktop/turnAftermathAdvanceDeps';

export function AdvanceTurnModal() {
  const pending = useGameStore((s) => s.advanceTurnPending);
  const setPending = useGameStore((s) => s.setAdvanceTurnPending);
  const loadSave = useGameStore((s) => s.loadSave);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const ipc = useIPC();
  const [advancing, setAdvancing] = useState(false);

  if (!pending) return null;

  const handleConfirm = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      await advanceTurnAndSync({
        ipc,
        loadSave,
        clearStagedOrders,
        setLoadError,
        ...getTurnAftermathAdvanceDeps(),
      });
    } finally {
      setAdvancing(false);
      setPending(false);
    }
  };

  const handleCancel = () => {
    if (advancing) return;
    setPending(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-white border-2 border-neutral-400 shadow-xl max-w-xs w-full">
        <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-100">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
            End of Turn
          </div>
          <div className="text-sm font-bold mt-0.5">Advance to next turn?</div>
        </div>
        <div className="px-4 py-3 text-[11px] text-neutral-600">
          All pending orders will be processed. This cannot be undone.
        </div>
        <div className="px-4 py-3 border-t-2 border-neutral-300 bg-neutral-50 flex gap-2">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={advancing}
            className="px-3 py-1.5 text-[10px] uppercase font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white border border-green-700 transition-colors"
          >
            {advancing ? 'Advancing…' : 'Advance Turn'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={advancing}
            className="px-3 py-1.5 text-[10px] uppercase font-bold bg-neutral-200 hover:bg-neutral-300 disabled:opacity-50 text-neutral-800 border border-neutral-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
