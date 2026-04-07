/**
 * WarroomStatusBar — live campaign context strip inside the warroom.
 *
 * Renders a thin fixed strip at the bottom-right of the warroom overlay
 * (z-[60]) showing current turn/date, phase badge, pending events indicator,
 * and an advance-turn affordance.
 *
 * Reads directly from useGameStore — no prop drilling required.
 * Canonical owner: src/ui/map/components/warroom/WarroomStatusBar.tsx
 */

import { useGameStore } from '../../store/gameStore';
import { formatTurnLabel } from '../../utils/formatters';

export function WarroomStatusBar() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setAdvanceTurnPending = useGameStore((s) => s.setAdvanceTurnPending);

  if (!loadedGameState) return null;

  const rawLabel = loadedGameState.label ?? '';
  const displayLabel = formatTurnLabel(rawLabel);
  const phase = loadedGameState.phase ?? '';
  const isWar = phase.toLowerCase().includes('war');
  const pendingDecisionCount = loadedGameState.pendingEventDecisions?.length ?? 0;
  const hasPendingEvents = pendingDecisionCount > 0;

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex items-center gap-3 px-3 py-1.5 rounded bg-black/70 text-amber-400 font-mono text-[10px] select-none pointer-events-auto"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {/* Current date / turn */}
      <span className="opacity-90">{displayLabel || rawLabel}</span>

      {/* Phase badge */}
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest border ${
          isWar
            ? 'border-red-700 text-red-400 bg-red-950/40'
            : 'border-amber-700 text-amber-500 bg-amber-950/40'
        }`}
      >
        {isWar ? 'WAR' : 'PEACE'}
      </span>

      {/* Pending events indicator */}
      {hasPendingEvents && (
        <span
          className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
          title={`${pendingDecisionCount} pending decision${pendingDecisionCount === 1 ? '' : 's'}`}
        />
      )}

      {/* Advance-turn affordance */}
      <button
        className="ml-1 px-2 py-0.5 rounded border border-amber-700/60 text-amber-500 hover:bg-amber-900/30 hover:text-amber-300 transition-colors text-[9px] font-bold tracking-widest cursor-pointer"
        onClick={() => setAdvanceTurnPending(true)}
        title="Advance turn"
      >
        ADVANCE
      </button>
    </div>
  );
}
