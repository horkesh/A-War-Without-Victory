/**
 * WarroomStatusBar - live campaign context strip inside the Warroom.
 *
 * Renders a thin fixed strip at the bottom-right of the Warroom overlay
 * showing current turn/date, phase badge, Decision Room priority pulse,
 * and an advance-turn affordance.
 *
 * Reads directly from useGameStore for campaign context. Navigation out of
 * the Warroom stays App-owned through onReviewPriorities.
 * Canonical owner: src/ui/map/components/warroom/WarroomStatusBar.tsx
 */

import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatTurnLabel } from '../../utils/formatters';
import { buildPreAdvanceCommandReviewView } from '../../data/preAdvanceCommandReview';

export interface WarroomStatusBarProps {
  onReviewPriorities?: () => void;
}

function priorityClass(urgentCount: number, advanceReviewCount: number): string {
  if (urgentCount > 0) return 'border-red-700/70 text-red-300 bg-red-950/45 hover:bg-red-900/45';
  if (advanceReviewCount > 0) return 'border-amber-700/70 text-amber-300 bg-amber-950/40 hover:bg-amber-900/35';
  return 'border-emerald-700/60 text-emerald-300 bg-emerald-950/35 hover:bg-emerald-900/30';
}

export function WarroomStatusBar({ onReviewPriorities }: WarroomStatusBarProps) {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const setAdvanceTurnPending = useGameStore((s) => s.setAdvanceTurnPending);

  const review = useMemo(
    () => buildPreAdvanceCommandReviewView({ state: loadedGameState, osidNameMap: osidDisplayNames }),
    [loadedGameState, osidDisplayNames],
  );

  if (!loadedGameState) return null;

  const rawLabel = loadedGameState.label ?? '';
  const displayLabel = formatTurnLabel(rawLabel);
  const phase = loadedGameState.phase ?? '';
  const isWar = phase.toLowerCase().includes('war');
  const pendingReviewCount = loadedGameState.presidentialReviewQueue?.pendingCount ?? 0;
  const hasPendingReviews = pendingReviewCount > 0;
  const { advanceReviewCount, urgentCount } = review.metrics;
  const canReviewPriorities = review.canReviewPriorities && Boolean(onReviewPriorities);

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded bg-black/70 px-3 py-1.5 font-mono text-[10px] text-amber-400 pointer-events-auto select-none"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {/* Current date / turn */}
      <span className="min-w-0 max-w-[10rem] truncate opacity-90">{displayLabel || rawLabel}</span>

      {/* Phase badge */}
      <span
        className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${
          isWar
            ? 'border-red-700 text-red-400 bg-red-950/40'
            : 'border-amber-700 text-amber-500 bg-amber-950/40'
        }`}
      >
        {isWar ? 'WAR' : 'PEACE'}
      </span>

      {/* Decision Room priority pulse */}
      <button
        type="button"
        onClick={() => onReviewPriorities?.()}
        disabled={!canReviewPriorities}
        title={`Review priorities: ${advanceReviewCount} advance item${advanceReviewCount === 1 ? '' : 's'}, ${urgentCount} urgent, ${pendingReviewCount} pending review${pendingReviewCount === 1 ? '' : 's'}`}
        className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest transition-colors disabled:cursor-default disabled:opacity-60 ${priorityClass(urgentCount, advanceReviewCount)}`}
      >
        <span>PRIORITIES</span>
        <span className="tabular-nums">{advanceReviewCount}</span>
        {urgentCount > 0 && <span className="text-[8px]">URG {urgentCount}</span>}
        {hasPendingReviews && <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" aria-hidden="true" />}
      </button>

      {/* Advance-turn affordance */}
      <button
        type="button"
        className="ml-1 rounded border border-amber-700/60 px-2 py-0.5 text-[9px] font-bold tracking-widest text-amber-500 transition-colors hover:bg-amber-900/30 hover:text-amber-300 cursor-pointer"
        onClick={() => setAdvanceTurnPending(true)}
        title="Advance turn"
      >
        ADVANCE
      </button>
    </div>
  );
}
